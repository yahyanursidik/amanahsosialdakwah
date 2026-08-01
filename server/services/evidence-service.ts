import { withTenantTransaction } from "../db/client";
import {
  assertEvidenceFile,
  assertRestrictedAccess,
  evidenceObjectKey,
  safeEvidenceName,
} from "../domain/evidence-rules";
import { DomainError } from "../domain/errors";
import type {
  EvidenceConfirmInput,
  EvidenceDeleteInput,
  EvidenceListQuery,
  EvidencePublishInput,
  EvidenceUploadIntentInput,
} from "../routes/evidence-schemas";
import {
  createSignedDownload,
  createSignedUpload,
  getStorageConfig,
  verifyStoredObject,
} from "../storage/s3-client";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const entityTables: Record<EvidenceUploadIntentInput["entity_type"], string> = {
  application: "aid_applications",
  case: "beneficiary_cases",
  assessment: "case_assessments",
  distribution: "distribution_plans",
  procurement: "procurement_requests",
  inventory_adjustment: "inventory_adjustment_requests",
  aid_package_packing: "aid_package_packings",
  logistics_shipment: "logistics_shipments",
  logistics_incident: "logistics_incidents",
  crm_contact: "crm_contacts",
};

function notFound(message: string): never {
  throw new DomainError("NOT_FOUND", message, 404);
}

function storageError(error: unknown): never {
  console.error(
    JSON.stringify({
      area: "evidence-storage",
      error: error instanceof Error ? error.message : "unknown",
    }),
  );
  throw new DomainError(
    "INTERNAL_ERROR",
    "Layanan penyimpanan bukti belum tersedia.",
    500,
  );
}

async function addAccessEvent(
  client: { query: (text: string, values?: unknown[]) => Promise<unknown> },
  context: RequestContext,
  fileId: string,
  action: string,
  metadata?: unknown,
) {
  await client.query(
    `insert into public.evidence_access_events (organization_id, evidence_file_id, action, actor_profile_id, request_id, metadata) values ($1,$2,$3,$4,$5,$6)`,
    [
      context.organizationId,
      fileId,
      action,
      context.profileId,
      context.requestId,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}

export async function listEvidenceFiles(
  context: RequestContext,
  query: EvidenceListQuery,
) {
  requirePermission(context, "evidence_files.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["file.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`file.status = $${values.length}`);
    }
    if (query.entity_type) {
      values.push(query.entity_type);
      filters.push(`file.entity_type = $${values.length}`);
    }
    if (query.entity_id) {
      values.push(query.entity_id);
      filters.push(`file.entity_id = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(file.original_file_name ilike $${values.length} or file.purpose ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.evidence_files file where ${where}`,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `select id, logical_file_id, version, entity_type, entity_id, classification, purpose, original_file_name, mime_type, size_bytes::text, status, confirmed_at, created_at from public.evidence_files file where ${where} order by file.created_at desc limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    return {
      data: result.rows,
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    };
  });
}

export async function getEvidenceFile(context: RequestContext, id: string) {
  requirePermission(context, "evidence_files.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `select file.*, publication.status as publication_status, publication.consent_reference, publication.redaction_notes from public.evidence_files file left join public.evidence_publications publication on publication.evidence_file_id = file.id and publication.organization_id = file.organization_id where file.id = $1 and file.organization_id = $2`,
      [id, context.organizationId],
    );
    const record = result.rows[0] ?? notFound("Bukti tidak ditemukan.");
    try {
      assertRestrictedAccess(
        String(record.classification),
        context.permissions,
      );
    } catch {
      throw new DomainError(
        "FORBIDDEN",
        "Anda tidak memiliki akses ke bukti restricted.",
        403,
      );
    }
    await addAccessEvent(client, context, id, "metadata_viewed");
    return record;
  });
}

export async function createEvidenceUploadIntent(
  context: RequestContext,
  input: EvidenceUploadIntentInput,
) {
  requirePermission(context, "evidence_files.upload");
  try {
    assertEvidenceFile({
      mimeType: input.mime_type,
      sizeBytes: input.size_bytes,
    });
  } catch (error) {
    throw new DomainError(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "File bukti tidak valid.",
      400,
    );
  }
  return withTenantTransaction(context, async (database, client) => {
    const table = entityTables[input.entity_type];
    const entity = await client.query(
      `select 1 from public.${table} where id = $1 and organization_id = $2`,
      [input.entity_id, context.organizationId],
    );
    if (!entity.rows[0]) notFound("Entitas tujuan bukti tidak ditemukan.");
    let logicalFileId: string = crypto.randomUUID();
    let version = 1;
    let previousId: string | null = null;
    if (input.previous_file_id) {
      const previous = await client.query<{
        entity_id: string;
        entity_type: string;
        logical_file_id: string;
        status: string;
        version: number;
      }>(
        `select entity_id, entity_type, logical_file_id, status, version from public.evidence_files where id = $1 and organization_id = $2 for update`,
        [input.previous_file_id, context.organizationId],
      );
      const record =
        previous.rows[0] ?? notFound("Versi bukti sebelumnya tidak ditemukan.");
      if (
        record.status !== "available" ||
        record.entity_type !== input.entity_type ||
        record.entity_id !== input.entity_id
      )
        throw new DomainError(
          "INVALID_STATE",
          "Versi baru harus merujuk bukti available pada entitas yang sama.",
          409,
        );
      logicalFileId = record.logical_file_id;
      version = record.version + 1;
      previousId = input.previous_file_id;
    }
    const fileId = crypto.randomUUID();
    const objectKey = evidenceObjectKey({
      classification: input.classification,
      entityId: input.entity_id,
      entityType: input.entity_type,
      fileId,
      logicalFileId,
      mimeType: input.mime_type,
      organizationId: context.organizationId,
      version,
    });
    let signed: Awaited<ReturnType<typeof createSignedUpload>>;
    try {
      signed = await createSignedUpload({
        contentType: input.mime_type,
        key: objectKey,
        sizeBytes: input.size_bytes,
        metadata: { fileid: fileId, organizationid: context.organizationId },
      });
    } catch (error) {
      storageError(error);
    }
    const result = await client.query<Row>(
      `insert into public.evidence_files (id, organization_id, logical_file_id, version, previous_version_id, entity_type, entity_id, classification, purpose, original_file_name, safe_file_name, object_key, storage_bucket, mime_type, size_bytes, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *`,
      [
        fileId,
        context.organizationId,
        logicalFileId,
        version,
        previousId,
        input.entity_type,
        input.entity_id,
        input.classification,
        input.purpose,
        input.file_name,
        safeEvidenceName(input.file_name),
        objectKey,
        signed.bucket,
        input.mime_type,
        input.size_bytes,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await addAccessEvent(client, context, fileId, "upload_intent_created", {
      expiresIn: signed.expiresIn,
    });
    await insertAuditEvent(database, context, {
      action: "evidence.upload_intent_created",
      after: record,
      entityId: fileId,
      entityType: "evidence_file",
    });
    return {
      evidence: record,
      upload: {
        expires_in: signed.expiresIn,
        headers: { "content-type": input.mime_type },
        url: signed.url,
      },
    };
  });
}

export async function confirmEvidenceUpload(
  context: RequestContext,
  id: string,
  input: EvidenceConfirmInput,
) {
  requirePermission(context, "evidence_files.upload");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.evidence_files where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const file = current.rows[0] ?? notFound("Upload intent tidak ditemukan.");
    if (file.status !== "pending_upload")
      throw new DomainError(
        "INVALID_STATE",
        "Upload intent sudah dikonfirmasi.",
        409,
      );
    let verification: Awaited<ReturnType<typeof verifyStoredObject>>;
    try {
      verification = await verifyStoredObject({
        key: String(file.object_key),
        expectedContentType: String(file.mime_type),
        expectedSize: Number(file.size_bytes),
      });
    } catch (error) {
      storageError(error);
    }
    const nextStatus = verification.valid ? "available" : "quarantined";
    const updated = await client.query<Row>(
      `update public.evidence_files set status = $1, checksum_sha256 = $2, confirmed_by = $3, confirmed_at = now() where id = $4 and organization_id = $5 returning *`,
      [
        nextStatus,
        input.checksum_sha256 ?? null,
        context.profileId,
        id,
        context.organizationId,
      ],
    );
    if (nextStatus === "available" && file.previous_version_id) {
      await client.query(
        `update public.evidence_files set status = 'superseded', superseded_at = now() where id = $1 and organization_id = $2 and status = 'available'`,
        [file.previous_version_id, context.organizationId],
      );
      await addAccessEvent(
        client,
        context,
        String(file.previous_version_id),
        "version_superseded",
        { replacementId: id },
      );
    }
    await addAccessEvent(client, context, id, "upload_confirmed", verification);
    await insertAuditEvent(database, context, {
      action: "evidence.upload_confirmed",
      before: file,
      after: updated.rows[0],
      entityId: id,
      entityType: "evidence_file",
    });
    return updated.rows[0]!;
  });
}

export async function createEvidenceDownload(
  context: RequestContext,
  id: string,
) {
  requirePermission(context, "evidence_files.download");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `select * from public.evidence_files where id = $1 and organization_id = $2`,
      [id, context.organizationId],
    );
    const file = result.rows[0] ?? notFound("Bukti tidak ditemukan.");
    if (file.status !== "available")
      throw new DomainError(
        "INVALID_STATE",
        "Bukti belum tersedia untuk diunduh.",
        409,
      );
    try {
      assertRestrictedAccess(String(file.classification), context.permissions);
    } catch {
      throw new DomainError(
        "FORBIDDEN",
        "Anda tidak memiliki akses ke bukti restricted.",
        403,
      );
    }
    let signed: Awaited<ReturnType<typeof createSignedDownload>>;
    try {
      signed = await createSignedDownload({
        fileName: String(file.safe_file_name),
        key: String(file.object_key),
      });
    } catch (error) {
      storageError(error);
    }
    await addAccessEvent(client, context, id, "download_url_created", {
      expiresIn: signed.expiresIn,
    });
    return { expires_in: signed.expiresIn, url: signed.url };
  });
}

export async function markEvidenceDeleted(
  context: RequestContext,
  id: string,
  input: EvidenceDeleteInput,
) {
  requirePermission(context, "evidence_files.delete");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.evidence_files where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const file = current.rows[0] ?? notFound("Bukti tidak ditemukan.");
    if (!["available", "quarantined"].includes(String(file.status)))
      throw new DomainError(
        "INVALID_STATE",
        "Status bukti tidak dapat ditandai terhapus.",
        409,
      );
    const updated = await client.query<Row>(
      `update public.evidence_files set status = 'deleted', deleted_by = $1, deleted_at = now(), deletion_reason = $2 where id = $3 and organization_id = $4 returning *`,
      [context.profileId, input.reason, id, context.organizationId],
    );
    await addAccessEvent(client, context, id, "marked_deleted", {
      reason: input.reason,
    });
    await insertAuditEvent(database, context, {
      action: "evidence.marked_deleted",
      before: file,
      after: updated.rows[0],
      entityId: id,
      entityType: "evidence_file",
    });
    return updated.rows[0]!;
  });
}

export async function publishEvidence(
  context: RequestContext,
  id: string,
  input: EvidencePublishInput,
) {
  requirePermission(context, "evidence_files.publish");
  return withTenantTransaction(context, async (database, client) => {
    const file = await client.query<Row>(
      `select * from public.evidence_files where id = $1 and organization_id = $2 and status = 'available'`,
      [id, context.organizationId],
    );
    const evidence =
      file.rows[0] ?? notFound("Bukti available tidak ditemukan.");
    const publication = await client.query<Row>(
      `insert into public.evidence_publications (organization_id, evidence_file_id, consent_reference, redaction_notes, published_by) values ($1,$2,$3,$4,$5) returning *`,
      [
        context.organizationId,
        id,
        input.consent_reference,
        input.redaction_notes,
        context.profileId,
      ],
    );
    await addAccessEvent(client, context, id, "publication_created", {
      publicationId: publication.rows[0]!.id,
    });
    await insertAuditEvent(database, context, {
      action: "evidence.published",
      after: publication.rows[0],
      entityId: id,
      entityType: "evidence_file",
    });
    return { evidence, publication: publication.rows[0]! };
  });
}

export function evidenceStorageReady(): boolean {
  try {
    getStorageConfig();
    return true;
  } catch {
    return false;
  }
}
