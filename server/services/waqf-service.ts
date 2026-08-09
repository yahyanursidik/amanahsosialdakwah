import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import { DomainError } from "../domain/errors";
import {
  assertActiveWaqfAsset,
  assertBenefitDistributionCapacity,
  assertIndependentVerification,
  assertWaqfRegistration,
  type WaqfAssetStatus,
} from "../domain/waqf-rules";
import type {
  AssignWaqfNazhirInput,
  CreateWaqfAssetInput,
  CreateWaqfLegalDocumentInput,
  DistributeWaqfBenefitInput,
  RecordWaqfIncomeInput,
  RecordWaqfMaintenanceInput,
  RecordWaqfUtilizationInput,
  RecordWaqfValuationInput,
  VerifyWaqfLegalDocumentInput,
  WaqfListQuery,
} from "../routes/waqf-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

const reference = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

const hashRequest = (command: string, input: unknown) =>
  createHash("sha256").update(JSON.stringify({ command, input })).digest("hex");

function page(query: WaqfListQuery) {
  return {
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  };
}

function translateRule(error: unknown): never {
  throw new DomainError(
    "INVALID_STATE",
    error instanceof Error ? error.message : "Operasi wakaf ditolak.",
    409,
  );
}

async function event(
  client: PoolClient,
  context: RequestContext,
  entityType: string,
  entityId: string,
  eventType: string,
  eventData?: unknown,
) {
  await client.query(
    `insert into public.waqf_events (organization_id, entity_type, entity_id, event_type, event_data, created_by)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      context.organizationId,
      entityType,
      entityId,
      eventType,
      eventData ? JSON.stringify(eventData) : null,
      context.profileId,
    ],
  );
}

async function idempotent<T extends Row>(
  context: RequestContext,
  key: string,
  command: string,
  input: unknown,
  operation: (database: TenantDatabase, client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTenantTransaction(context, async (database, client) => {
    const requestHash = hashRequest(command, input);
    const inserted = await client.query(
      `insert into public.waqf_idempotency_records (organization_id, idempotency_key, command_type, request_hash, created_by)
       values ($1, $2, $3, $4, $5)
       on conflict (organization_id, idempotency_key) do nothing
       returning id`,
      [context.organizationId, key, command, requestHash, context.profileId],
    );

    if (!inserted.rows[0]) {
      const existing = await client.query(
        `select command_type, request_hash, status, response_snapshot
         from public.waqf_idempotency_records
         where organization_id = $1 and idempotency_key = $2
         for update`,
        [context.organizationId, key],
      );
      const record = existing.rows[0];

      if (
        !record ||
        record.command_type !== command ||
        record.request_hash !== requestHash
      ) {
        throw new DomainError(
          "CONFLICT",
          "Idempotency-Key telah digunakan untuk command berbeda.",
          409,
        );
      }

      if (record.status === "completed" && record.response_snapshot) {
        return record.response_snapshot as T;
      }

      throw new DomainError(
        "CONFLICT",
        "Command dengan Idempotency-Key ini masih diproses.",
        409,
      );
    }

    const result = await operation(database, client);
    await client.query(
      `update public.waqf_idempotency_records
       set status = 'completed', response_snapshot = $1, completed_at = now()
       where organization_id = $2 and idempotency_key = $3`,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

async function ensureAsset(
  client: PoolClient,
  context: RequestContext,
  id: string,
  lock = false,
) {
  const result = await client.query<Row>(
    `select * from public.waqf_assets
     where id = $1 and organization_id = $2 ${lock ? "for update" : ""}`,
    [id, context.organizationId],
  );
  return result.rows[0] ?? missing("Aset wakaf tidak ditemukan.");
}

export async function listWaqfContacts(
  context: RequestContext,
  query: WaqfListQuery,
) {
  requirePermission(context, "waqf.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["organization_id = $1", "status = 'active'"];
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(display_name ilike $${values.length} or primary_email ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int total from public.crm_contacts where ${where}`,
      values,
    );
    const { limit, offset } = page(query);
    values.push(limit, offset);
    const rows = await client.query(
      `select id, display_name, contact_type, primary_email, primary_phone
       from public.crm_contacts
       where ${where}
       order by display_name
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    return {
      data: rows.rows,
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    };
  });
}

export async function listWaqfAssets(
  context: RequestContext,
  query: WaqfListQuery,
) {
  requirePermission(context, "waqf.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["asset.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`asset.operational_status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(asset.name ilike $${values.length} or asset.reference_number ilike $${values.length} or donor.display_name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int total
       from public.waqf_assets asset
       left join public.crm_contacts donor on donor.id = asset.donor_contact_id and donor.organization_id = asset.organization_id
       where ${where}`,
      values,
    );
    const { limit, offset } = page(query);
    values.push(limit, offset);
    const rows = await client.query(
      `select asset.*,
              donor.display_name donor_name,
              coalesce((select amount from public.waqf_valuations valuation where valuation.asset_id = asset.id and valuation.organization_id = asset.organization_id order by valuation.valuation_date desc, valuation.created_at desc limit 1), asset.acquisition_value) latest_valuation,
              coalesce((select sum(income.amount) from public.waqf_income_records income where income.asset_id = asset.id and income.organization_id = asset.organization_id and income.status = 'received'), 0) total_income,
              coalesce((select sum(benefit.amount) from public.waqf_benefit_distributions benefit where benefit.asset_id = asset.id and benefit.organization_id = asset.organization_id and benefit.status = 'completed'), 0) total_benefit
       from public.waqf_assets asset
       left join public.crm_contacts donor on donor.id = asset.donor_contact_id and donor.organization_id = asset.organization_id
       where ${where}
       order by asset.created_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    return {
      data: rows.rows,
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    };
  });
}

export async function getWaqfAsset(context: RequestContext, id: string) {
  requirePermission(context, "waqf.read");
  return withTenantTransaction(context, async (_database, client) => {
    const asset = await client.query(
      `select asset.*, donor.display_name donor_name
       from public.waqf_assets asset
       left join public.crm_contacts donor on donor.id = asset.donor_contact_id and donor.organization_id = asset.organization_id
       where asset.id = $1 and asset.organization_id = $2`,
      [id, context.organizationId],
    );
    const record = asset.rows[0] ?? missing("Aset wakaf tidak ditemukan.");
    const [
      legalDocuments,
      nazhirs,
      valuations,
      utilizations,
      maintenance,
      income,
      benefits,
      events,
    ] = await Promise.all([
      client.query(
        `select * from public.waqf_legal_documents where asset_id = $1 and organization_id = $2 order by created_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select assignment.*, contact.display_name contact_name
         from public.waqf_nazhir_assignments assignment
         join public.crm_contacts contact on contact.id = assignment.contact_id and contact.organization_id = assignment.organization_id
         where assignment.asset_id = $1 and assignment.organization_id = $2
         order by assignment.created_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select * from public.waqf_valuations where asset_id = $1 and organization_id = $2 order by valuation_date desc, created_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select utilization.*, beneficiary.display_name beneficiary_name, program.name program_name
         from public.waqf_utilizations utilization
         left join public.crm_contacts beneficiary on beneficiary.id = utilization.beneficiary_contact_id and beneficiary.organization_id = utilization.organization_id
         left join public.programs program on program.id = utilization.program_id and program.organization_id = utilization.organization_id
         where utilization.asset_id = $1 and utilization.organization_id = $2
         order by utilization.created_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select record.*, vendor.display_name vendor_name
         from public.waqf_maintenance_records record
         left join public.crm_contacts vendor on vendor.id = record.vendor_contact_id and vendor.organization_id = record.organization_id
         where record.asset_id = $1 and record.organization_id = $2
         order by record.occurred_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select record.*, payer.display_name payer_name
         from public.waqf_income_records record
         left join public.crm_contacts payer on payer.id = record.payer_contact_id and payer.organization_id = record.organization_id
         where record.asset_id = $1 and record.organization_id = $2
         order by record.received_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select benefit.*, beneficiary.display_name beneficiary_name, program.name program_name
         from public.waqf_benefit_distributions benefit
         left join public.crm_contacts beneficiary on beneficiary.id = benefit.beneficiary_contact_id and beneficiary.organization_id = benefit.organization_id
         left join public.programs program on program.id = benefit.program_id and program.organization_id = benefit.organization_id
         where benefit.asset_id = $1 and benefit.organization_id = $2
         order by benefit.distributed_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select * from public.waqf_events where entity_id = $1 and organization_id = $2 order by created_at desc limit 50`,
        [id, context.organizationId],
      ),
    ]);
    return {
      ...record,
      benefit_distributions: benefits.rows,
      events: events.rows,
      income_records: income.rows,
      legal_documents: legalDocuments.rows,
      maintenance_records: maintenance.rows,
      nazhir_assignments: nazhirs.rows,
      utilizations: utilizations.rows,
      valuations: valuations.rows,
    };
  });
}

export async function createWaqfAsset(
  context: RequestContext,
  input: CreateWaqfAssetInput,
) {
  requirePermission(context, "waqf_assets.manage");
  return withTenantTransaction(context, async (database, client) => {
    const record = await client.query<Row>(
      `insert into public.waqf_assets (
         organization_id, reference_number, asset_type, name, description,
         donor_contact_id, acquisition_date, acquisition_value, currency,
         location_text, created_by, updated_by
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
       returning *`,
      [
        context.organizationId,
        reference("WQF-AST"),
        input.asset_type,
        input.name,
        input.description,
        input.donor_contact_id || null,
        input.acquisition_date ?? null,
        input.acquisition_value ?? null,
        input.currency,
        input.location_text ?? null,
        context.profileId,
      ],
    );
    const asset = record.rows[0] ?? missing("Aset wakaf gagal dibuat.");
    await event(client, context, "waqf_asset", asset.id, "created", asset);
    await insertAuditEvent(database, context, {
      action: "waqf.asset_created",
      after: asset,
      entityId: asset.id,
      entityType: "waqf_asset",
    });
    return asset;
  });
}

export async function registerWaqfAsset(context: RequestContext, id: string) {
  requirePermission(context, "waqf_assets.register");
  return withTenantTransaction(context, async (database, client) => {
    const asset = await ensureAsset(client, context, id, true);
    const verified = await client.query<{ count: number }>(
      `select count(*)::int count
       from public.waqf_legal_documents
       where asset_id = $1 and organization_id = $2 and verification_status = 'verified'`,
      [id, context.organizationId],
    );
    try {
      assertWaqfRegistration({
        createdBy: String(asset.created_by),
        currentStatus: String(asset.operational_status) as WaqfAssetStatus,
        hasVerifiedLegalDocument: (verified.rows[0]?.count ?? 0) > 0,
        registeredBy: context.profileId,
      });
    } catch (error) {
      translateRule(error);
    }
    const updated = await client.query<Row>(
      `update public.waqf_assets
       set operational_status = 'active',
           legal_status = 'verified',
           registered_by = $1,
           registered_at = now(),
           registration_notes = 'Registrasi wakaf disetujui setelah legalitas terverifikasi.',
           updated_by = $1
       where id = $2 and organization_id = $3
       returning *`,
      [context.profileId, id, context.organizationId],
    );
    const record = updated.rows[0] ?? missing("Aset wakaf tidak ditemukan.");
    await event(client, context, "waqf_asset", id, "registered");
    await insertAuditEvent(database, context, {
      action: "waqf.asset_registered",
      after: record,
      before: asset,
      entityId: id,
      entityType: "waqf_asset",
    });
    return record;
  });
}

export async function createWaqfLegalDocument(
  context: RequestContext,
  assetId: string,
  input: CreateWaqfLegalDocumentInput,
) {
  requirePermission(context, "waqf_legal_documents.manage");
  return withTenantTransaction(context, async (database, client) => {
    await ensureAsset(client, context, assetId);
    const inserted = await client.query<Row>(
      `insert into public.waqf_legal_documents (
         organization_id, asset_id, document_type, document_number, issuer,
         issued_at, evidence_file_id, created_by
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning *`,
      [
        context.organizationId,
        assetId,
        input.document_type,
        input.document_number,
        input.issuer ?? null,
        input.issued_at ?? null,
        input.evidence_file_id || null,
        context.profileId,
      ],
    );
    const record = inserted.rows[0] ?? missing("Dokumen wakaf gagal dibuat.");
    await client.query(
      `update public.waqf_assets
       set legal_status = case when legal_status = 'incomplete' then 'pending_review' else legal_status end,
           updated_by = $1
       where id = $2 and organization_id = $3`,
      [context.profileId, assetId, context.organizationId],
    );
    await event(client, context, "waqf_asset", assetId, "legal_document_added", {
      documentId: record.id,
    });
    await insertAuditEvent(database, context, {
      action: "waqf.legal_document_created",
      after: record,
      entityId: record.id,
      entityType: "waqf_legal_document",
    });
    return record;
  });
}

export async function verifyWaqfLegalDocument(
  context: RequestContext,
  id: string,
  input: VerifyWaqfLegalDocumentInput,
) {
  requirePermission(context, "waqf_legal_documents.verify");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.waqf_legal_documents where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const document =
      current.rows[0] ?? missing("Dokumen legal wakaf tidak ditemukan.");
    if (document.verification_status !== "pending") {
      throw new DomainError(
        "INVALID_STATE",
        "Dokumen legal yang sudah diputuskan tidak dapat diverifikasi ulang.",
        409,
      );
    }
    try {
      assertIndependentVerification({
        createdBy: String(document.created_by),
        verifiedBy: context.profileId,
      });
    } catch (error) {
      translateRule(error);
    }
    const updated = await client.query<Row>(
      `update public.waqf_legal_documents
       set verification_status = $1,
           verification_notes = $2,
           verified_by = $3,
           verified_at = now()
       where id = $4 and organization_id = $5
       returning *`,
      [input.status, input.notes, context.profileId, id, context.organizationId],
    );
    const record = updated.rows[0] ?? missing("Dokumen legal wakaf tidak ada.");
    await client.query(
      `update public.waqf_assets
       set legal_status = case when $1 = 'verified' then 'verified' else legal_status end,
           updated_by = $2
       where id = $3 and organization_id = $4`,
      [
        input.status,
        context.profileId,
        record.asset_id,
        context.organizationId,
      ],
    );
    await event(
      client,
      context,
      "waqf_asset",
      String(record.asset_id),
      `legal_document_${input.status}`,
      { documentId: record.id },
    );
    await insertAuditEvent(database, context, {
      action: `waqf.legal_document_${input.status}`,
      after: record,
      before: document,
      entityId: id,
      entityType: "waqf_legal_document",
    });
    return record;
  });
}

export async function assignWaqfNazhir(
  context: RequestContext,
  assetId: string,
  input: AssignWaqfNazhirInput,
) {
  requirePermission(context, "waqf_nazhir.manage");
  return withTenantTransaction(context, async (database, client) => {
    await ensureAsset(client, context, assetId);
    const record = await client.query<Row>(
      `insert into public.waqf_nazhir_assignments (
         organization_id, asset_id, contact_id, assignment_scope, start_date, created_by
       )
       values ($1,$2,$3,$4,$5,$6)
       returning *`,
      [
        context.organizationId,
        assetId,
        input.contact_id,
        input.assignment_scope,
        input.start_date,
        context.profileId,
      ],
    );
    const assignment = record.rows[0] ?? missing("Penetapan nazhir gagal.");
    await event(client, context, "waqf_asset", assetId, "nazhir_assigned", {
      assignmentId: assignment.id,
    });
    await insertAuditEvent(database, context, {
      action: "waqf.nazhir_assigned",
      after: assignment,
      entityId: assignment.id,
      entityType: "waqf_nazhir_assignment",
    });
    return assignment;
  });
}

export async function recordWaqfValuation(
  context: RequestContext,
  assetId: string,
  input: RecordWaqfValuationInput,
) {
  requirePermission(context, "waqf_valuations.record");
  return withTenantTransaction(context, async (database, client) => {
    await ensureAsset(client, context, assetId);
    const record = await client.query<Row>(
      `insert into public.waqf_valuations (
         organization_id, asset_id, valuation_date, amount, currency, method,
         appraiser, notes, created_by
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       returning *`,
      [
        context.organizationId,
        assetId,
        input.valuation_date,
        input.amount,
        input.currency,
        input.method,
        input.appraiser ?? null,
        input.notes,
        context.profileId,
      ],
    );
    const valuation = record.rows[0] ?? missing("Valuasi wakaf gagal dicatat.");
    await event(client, context, "waqf_asset", assetId, "valuation_recorded", {
      valuationId: valuation.id,
      amount: input.amount,
    });
    await insertAuditEvent(database, context, {
      action: "waqf.valuation_recorded",
      after: valuation,
      entityId: valuation.id,
      entityType: "waqf_valuation",
    });
    return valuation;
  });
}

export async function recordWaqfUtilization(
  context: RequestContext,
  assetId: string,
  input: RecordWaqfUtilizationInput,
) {
  requirePermission(context, "waqf_utilizations.manage");
  return withTenantTransaction(context, async (database, client) => {
    const asset = await ensureAsset(client, context, assetId);
    try {
      assertActiveWaqfAsset(String(asset.operational_status) as WaqfAssetStatus);
    } catch (error) {
      translateRule(error);
    }
    const record = await client.query<Row>(
      `insert into public.waqf_utilizations (
         organization_id, asset_id, utilization_type, beneficiary_contact_id,
         program_id, start_date, end_date, expected_benefit, status, created_by
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)
       returning *`,
      [
        context.organizationId,
        assetId,
        input.utilization_type,
        input.beneficiary_contact_id || null,
        input.program_id || null,
        input.start_date,
        input.end_date ?? null,
        input.expected_benefit,
        context.profileId,
      ],
    );
    const utilization =
      record.rows[0] ?? missing("Pemanfaatan wakaf gagal dicatat.");
    await event(client, context, "waqf_asset", assetId, "utilization_recorded", {
      utilizationId: utilization.id,
    });
    await insertAuditEvent(database, context, {
      action: "waqf.utilization_recorded",
      after: utilization,
      entityId: utilization.id,
      entityType: "waqf_utilization",
    });
    return utilization;
  });
}

export async function recordWaqfMaintenance(
  context: RequestContext,
  assetId: string,
  input: RecordWaqfMaintenanceInput,
) {
  requirePermission(context, "waqf_maintenance.record");
  return withTenantTransaction(context, async (database, client) => {
    const asset = await ensureAsset(client, context, assetId);
    try {
      assertActiveWaqfAsset(String(asset.operational_status) as WaqfAssetStatus);
    } catch (error) {
      translateRule(error);
    }
    const record = await client.query<Row>(
      `insert into public.waqf_maintenance_records (
         organization_id, asset_id, maintenance_type, occurred_at, amount,
         currency, vendor_contact_id, description, created_by
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       returning *`,
      [
        context.organizationId,
        assetId,
        input.maintenance_type,
        input.occurred_at,
        input.amount,
        input.currency,
        input.vendor_contact_id || null,
        input.description,
        context.profileId,
      ],
    );
    const maintenance =
      record.rows[0] ?? missing("Pemeliharaan wakaf gagal dicatat.");
    await event(client, context, "waqf_asset", assetId, "maintenance_recorded", {
      maintenanceId: maintenance.id,
    });
    await insertAuditEvent(database, context, {
      action: "waqf.maintenance_recorded",
      after: maintenance,
      entityId: maintenance.id,
      entityType: "waqf_maintenance",
    });
    return maintenance;
  });
}

export async function recordWaqfIncome(
  context: RequestContext,
  assetId: string,
  input: RecordWaqfIncomeInput,
  idempotencyKey: string,
) {
  requirePermission(context, "waqf_income.record");
  return idempotent(
    context,
    idempotencyKey,
    "waqf.income.record",
    { assetId, input },
    async (database, client) => {
      const asset = await ensureAsset(client, context, assetId);
      try {
        assertActiveWaqfAsset(
          String(asset.operational_status) as WaqfAssetStatus,
        );
      } catch (error) {
        translateRule(error);
      }
      const record = await client.query<Row>(
        `insert into public.waqf_income_records (
           organization_id, asset_id, utilization_id, income_reference,
           income_type, amount, currency, received_at, payer_contact_id,
           notes, created_by
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         returning *`,
        [
          context.organizationId,
          assetId,
          input.utilization_id || null,
          reference("WQF-INC"),
          input.income_type,
          input.amount,
          input.currency,
          input.received_at,
          input.payer_contact_id || null,
          input.notes,
          context.profileId,
        ],
      );
      const income = record.rows[0] ?? missing("Pendapatan wakaf gagal dicatat.");
      await event(client, context, "waqf_asset", assetId, "income_recorded", {
        incomeId: income.id,
        amount: input.amount,
      });
      await insertAuditEvent(database, context, {
        action: "waqf.income_recorded",
        after: income,
        entityId: income.id,
        entityType: "waqf_income",
      });
      return income;
    },
  );
}

export async function distributeWaqfBenefit(
  context: RequestContext,
  assetId: string,
  input: DistributeWaqfBenefitInput,
  idempotencyKey: string,
) {
  requirePermission(context, "waqf_benefits.distribute");
  return idempotent(
    context,
    idempotencyKey,
    "waqf.benefit.distribute",
    { assetId, input },
    async (database, client) => {
      const asset = await ensureAsset(client, context, assetId);
      try {
        assertActiveWaqfAsset(
          String(asset.operational_status) as WaqfAssetStatus,
        );
      } catch (error) {
        translateRule(error);
      }
      if (input.income_record_id) {
        const income = await client.query<{
          amount: string;
          distributed_amount: string;
        }>(
          `select income.amount::text amount,
                  coalesce(sum(benefit.amount), 0)::text distributed_amount
           from public.waqf_income_records income
           left join public.waqf_benefit_distributions benefit
             on benefit.income_record_id = income.id
            and benefit.organization_id = income.organization_id
            and benefit.status = 'completed'
           where income.id = $1
             and income.asset_id = $2
             and income.organization_id = $3
             and income.status = 'received'
           group by income.id`,
          [input.income_record_id, assetId, context.organizationId],
        );
        const source = income.rows[0] ?? missing("Pendapatan wakaf tidak valid.");
        try {
          assertBenefitDistributionCapacity({
            distributedAmount: Number(source.distributed_amount),
            incomeAmount: Number(source.amount),
            requestedAmount: Number(input.amount),
          });
        } catch (error) {
          translateRule(error);
        }
      }
      const record = await client.query<Row>(
        `insert into public.waqf_benefit_distributions (
           organization_id, asset_id, income_record_id, beneficiary_contact_id,
           program_id, distribution_reference, amount, currency, distributed_at,
           benefit_type, notes, created_by
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         returning *`,
        [
          context.organizationId,
          assetId,
          input.income_record_id || null,
          input.beneficiary_contact_id || null,
          input.program_id || null,
          reference("WQF-BEN"),
          input.amount,
          input.currency,
          input.distributed_at,
          input.benefit_type,
          input.notes,
          context.profileId,
        ],
      );
      const benefit =
        record.rows[0] ?? missing("Distribusi manfaat wakaf gagal dicatat.");
      await event(client, context, "waqf_asset", assetId, "benefit_distributed", {
        benefitId: benefit.id,
        amount: input.amount,
      });
      await insertAuditEvent(database, context, {
        action: "waqf.benefit_distributed",
        after: benefit,
        entityId: benefit.id,
        entityType: "waqf_benefit_distribution",
      });
      return benefit;
    },
  );
}
