import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import { DomainError } from "../domain/errors";
import {
  assertActiveWaqfAsset,
  assertBenefitDistributionCapacity,
  assertIndependentProposalReview,
  assertIndependentVerification,
  assertWaqfAcceptsContribution,
  assertWaqfDuration,
  assertWaqfProposalTransition,
  assertWaqfRegistration,
  type WaqfAssetStatus,
  type WaqfCollectionScheme,
  type WaqfProposalStatus,
} from "../domain/waqf-rules";
import type {
  AssignWaqfNazhirInput,
  ConvertWaqfProposalInput,
  CreateWaqfAssetInput,
  CreateWaqfLegalDocumentInput,
  CreateWaqfProposalInput,
  DistributeWaqfBenefitInput,
  RecordWaqfContributionInput,
  RecordWaqfIncomeInput,
  RecordWaqfMaintenanceInput,
  RecordWaqfUtilizationInput,
  RecordWaqfValuationInput,
  ReverseWaqfContributionInput,
  VerifyWaqfLegalDocumentInput,
  WaqfListQuery,
  WaqfProposalDecisionInput,
  WaqfProposalListQuery,
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
        `(asset.name ilike $${values.length} or asset.reference_number ilike $${values.length} or donor.display_name ilike $${values.length} or asset.designation ilike $${values.length})`,
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
              coalesce((select sum(benefit.amount) from public.waqf_benefit_distributions benefit where benefit.asset_id = asset.id and benefit.organization_id = asset.organization_id and benefit.status = 'completed'), 0) total_benefit,
              coalesce((select sum(contribution.amount) from public.waqf_contributions contribution where contribution.asset_id = asset.id and contribution.organization_id = asset.organization_id and contribution.status = 'received'), 0) total_contributions,
              (select count(distinct coalesce(contribution.wakif_contact_id::text, contribution.wakif_name))::int from public.waqf_contributions contribution where contribution.asset_id = asset.id and contribution.organization_id = asset.organization_id and contribution.status = 'received') wakif_count
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
      contributions,
      proposals,
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
      client.query(
        `select contribution.*, wakif.display_name wakif_contact_name
         from public.waqf_contributions contribution
         left join public.crm_contacts wakif on wakif.id = contribution.wakif_contact_id and wakif.organization_id = contribution.organization_id
         where contribution.asset_id = $1 and contribution.organization_id = $2
         order by contribution.received_at desc`,
        [id, context.organizationId],
      ),
      client.query(
        `select proposal.id, proposal.reference_number, proposal.title, proposal.proposal_type, proposal.status, proposer.display_name proposer_name
         from public.waqf_proposals proposal
         join public.crm_contacts proposer on proposer.id = proposal.proposer_contact_id and proposer.organization_id = proposal.organization_id
         where proposal.organization_id = $2 and (proposal.asset_id = $1 or proposal.converted_asset_id = $1)
         order by proposal.created_at desc`,
        [id, context.organizationId],
      ),
    ]);
    const receivedContributions = contributions.rows.filter(
      (row) => row.status === "received",
    );
    return {
      ...record,
      benefit_distributions: benefits.rows,
      contributions: contributions.rows,
      proposals: proposals.rows,
      total_contributions: receivedContributions
        .reduce((total, row) => total + Number(row.amount), 0)
        .toFixed(2),
      wakif_count: new Set(
        receivedContributions.map((row) =>
          String(row.wakif_contact_id ?? row.wakif_name),
        ),
      ).size,
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

async function insertWaqfAsset(
  client: PoolClient,
  context: RequestContext,
  input: CreateWaqfAssetInput,
) {
  const record = await client.query<Row>(
    `insert into public.waqf_assets (
       organization_id, reference_number, asset_type, name, description,
       donor_contact_id, acquisition_date, acquisition_value, currency,
       location_text, waqf_purpose, waqf_duration, duration_end_date,
       collection_scheme, designation, pledge_date, fundraising_target,
       created_by, updated_by
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)
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
      input.waqf_purpose,
      input.waqf_duration,
      input.duration_end_date ?? null,
      input.collection_scheme,
      input.designation || null,
      input.pledge_date ?? null,
      input.fundraising_target ?? null,
      context.profileId,
    ],
  );
  return record.rows[0] ?? missing("Aset wakaf gagal dibuat.");
}

export async function createWaqfAsset(
  context: RequestContext,
  input: CreateWaqfAssetInput,
) {
  requirePermission(context, "waqf_assets.manage");
  try {
    assertWaqfDuration({
      durationEndDate: input.duration_end_date ?? null,
      pledgeDate: input.pledge_date ?? null,
      waqfDuration: input.waqf_duration,
    });
  } catch (error) {
    translateRule(error);
  }
  return withTenantTransaction(context, async (database, client) => {
    const asset = await insertWaqfAsset(client, context, input);
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

async function ensureActiveContact(
  client: PoolClient,
  context: RequestContext,
  contactId: string,
  label: string,
) {
  const result = await client.query<
    Row & { contact_type: string; display_name: string }
  >(
    `select id, contact_type, display_name from public.crm_contacts
     where id = $1 and organization_id = $2 and status = 'active'`,
    [contactId, context.organizationId],
  );
  return (
    result.rows[0] ?? missing(`${label} tidak ditemukan atau tidak aktif.`)
  );
}

export async function recordWaqfContribution(
  context: RequestContext,
  assetId: string,
  input: RecordWaqfContributionInput,
  idempotencyKey: string,
) {
  requirePermission(context, "waqf_contributions.record");
  return idempotent(
    context,
    idempotencyKey,
    "waqf.contribution.record",
    { assetId, input },
    async (database, client) => {
      const asset = await ensureAsset(client, context, assetId, true);
      try {
        assertWaqfAcceptsContribution({
          collectionScheme: String(
            asset.collection_scheme,
          ) as WaqfCollectionScheme,
          operationalStatus: String(
            asset.operational_status,
          ) as WaqfAssetStatus,
        });
      } catch (error) {
        translateRule(error);
      }
      let wakifName = input.wakif_name ?? "";
      if (input.wakif_contact_id) {
        const wakif = await ensureActiveContact(
          client,
          context,
          input.wakif_contact_id,
          "Kontak wakif",
        );
        wakifName = input.wakif_name || wakif.display_name;
      }
      const inserted = await client.query<Row>(
        `insert into public.waqf_contributions (
           organization_id, asset_id, reference_number, wakif_contact_id,
           wakif_name, on_behalf_of, contribution_form, amount, currency,
           payment_method, received_at, pledge_confirmed, certificate_number,
           notes, created_by
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         returning *`,
        [
          context.organizationId,
          assetId,
          reference("WQF-SET"),
          input.wakif_contact_id || null,
          wakifName,
          input.on_behalf_of || null,
          input.contribution_form,
          input.amount,
          input.currency,
          input.payment_method,
          input.received_at,
          input.pledge_confirmed,
          input.certificate_number || null,
          input.notes || null,
          context.profileId,
        ],
      );
      const contribution =
        inserted.rows[0] ?? missing("Setoran wakif gagal dicatat.");
      await event(
        client,
        context,
        "waqf_asset",
        assetId,
        "contribution_recorded",
        { amount: input.amount, contributionId: contribution.id },
      );
      await insertAuditEvent(database, context, {
        action: "waqf.contribution_recorded",
        after: contribution,
        entityId: contribution.id,
        entityType: "waqf_contribution",
      });
      return contribution;
    },
  );
}

export async function reverseWaqfContribution(
  context: RequestContext,
  contributionId: string,
  input: ReverseWaqfContributionInput,
) {
  requirePermission(context, "waqf_contributions.reverse");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.waqf_contributions
       where id = $1 and organization_id = $2 for update`,
      [contributionId, context.organizationId],
    );
    const contribution =
      current.rows[0] ?? missing("Setoran wakif tidak ditemukan.");
    if (contribution.status !== "received") {
      throw new DomainError(
        "INVALID_STATE",
        "Setoran wakif ini sudah dibatalkan.",
        409,
      );
    }
    if (contribution.created_by === context.profileId) {
      throw new DomainError(
        "INVALID_STATE",
        "Pembatalan setoran harus dilakukan oleh petugas berbeda dari pencatat.",
        409,
      );
    }
    const updated = await client.query<Row>(
      `update public.waqf_contributions
       set status = 'reversed', reversal_reason = $1, reversed_by = $2, reversed_at = now()
       where id = $3 and organization_id = $4
       returning *`,
      [input.reason, context.profileId, contributionId, context.organizationId],
    );
    const record =
      updated.rows[0] ?? missing("Setoran wakif tidak ditemukan.");
    await event(
      client,
      context,
      "waqf_asset",
      String(record.asset_id),
      "contribution_reversed",
      { contributionId },
    );
    await insertAuditEvent(database, context, {
      action: "waqf.contribution_reversed",
      after: record,
      before: contribution,
      entityId: contributionId,
      entityType: "waqf_contribution",
    });
    return record;
  });
}

const proposalSelect = `
  select proposal.*,
         proposer.display_name proposer_name,
         proposer.contact_type proposer_contact_type,
         proposer.primary_phone proposer_phone,
         asset.name asset_name,
         asset.reference_number asset_reference,
         converted_asset.name converted_asset_name
  from public.waqf_proposals proposal
  join public.crm_contacts proposer
    on proposer.id = proposal.proposer_contact_id and proposer.organization_id = proposal.organization_id
  left join public.waqf_assets asset
    on asset.id = proposal.asset_id and asset.organization_id = proposal.organization_id
  left join public.waqf_assets converted_asset
    on converted_asset.id = proposal.converted_asset_id and converted_asset.organization_id = proposal.organization_id
`;

export async function listWaqfProposals(
  context: RequestContext,
  query: WaqfProposalListQuery,
) {
  requirePermission(context, "waqf.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["proposal.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`proposal.status = $${values.length}`);
    }
    if (query.proposal_type) {
      values.push(query.proposal_type);
      filters.push(`proposal.proposal_type = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(proposal.title ilike $${values.length} or proposal.reference_number ilike $${values.length} or proposer.display_name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int total
       from public.waqf_proposals proposal
       join public.crm_contacts proposer on proposer.id = proposal.proposer_contact_id and proposer.organization_id = proposal.organization_id
       where ${where}`,
      values,
    );
    const { limit, offset } = page(query);
    values.push(limit, offset);
    const rows = await client.query(
      `${proposalSelect}
       where ${where}
       order by proposal.created_at desc
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

export async function getWaqfProposal(context: RequestContext, id: string) {
  requirePermission(context, "waqf.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `${proposalSelect} where proposal.id = $1 and proposal.organization_id = $2`,
      [id, context.organizationId],
    );
    const proposal =
      result.rows[0] ?? missing("Pengajuan wakaf tidak ditemukan.");
    const events = await client.query(
      `select * from public.waqf_events
       where entity_type = 'waqf_proposal' and entity_id = $1 and organization_id = $2
       order by created_at desc limit 50`,
      [id, context.organizationId],
    );
    return { ...proposal, events: events.rows };
  });
}

export async function createWaqfProposal(
  context: RequestContext,
  input: CreateWaqfProposalInput,
) {
  requirePermission(context, "waqf_proposals.manage");
  return withTenantTransaction(context, async (database, client) => {
    const proposer = await ensureActiveContact(
      client,
      context,
      input.proposer_contact_id,
      "Kontak pengaju",
    );
    if (input.asset_id) {
      await ensureAsset(client, context, input.asset_id);
    }
    const status = input.submit_now ? "submitted" : "draft";
    const inserted = await client.query<Row>(
      `insert into public.waqf_proposals (
         organization_id, reference_number, proposal_type, proposer_type,
         proposer_contact_id, title, description, asset_id, proposed_asset_type,
         requested_amount, currency, location_text, beneficiary_estimate,
         status, submitted_at, created_by, updated_by
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::text,
               case when $14::text = 'submitted' then now() else null end, $15, $15)
       returning *`,
      [
        context.organizationId,
        reference("WQF-PRP"),
        input.proposal_type,
        proposer.contact_type === "institution" ? "institution" : "individual",
        input.proposer_contact_id,
        input.title,
        input.description,
        input.proposal_type === "benefit_request" ? input.asset_id : null,
        input.proposal_type === "benefit_request"
          ? null
          : (input.proposed_asset_type ?? null),
        input.requested_amount ?? null,
        input.currency,
        input.location_text || null,
        input.beneficiary_estimate ?? null,
        status,
        context.profileId,
      ],
    );
    const proposal =
      inserted.rows[0] ?? missing("Pengajuan wakaf gagal dibuat.");
    await event(client, context, "waqf_proposal", proposal.id, "created", {
      status,
    });
    await insertAuditEvent(database, context, {
      action: "waqf.proposal_created",
      after: proposal,
      entityId: proposal.id,
      entityType: "waqf_proposal",
    });
    return proposal;
  });
}

async function transitionProposal(
  context: RequestContext,
  id: string,
  target: WaqfProposalStatus,
  options: { notes?: string; review?: boolean } = {},
) {
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.waqf_proposals where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const proposal =
      current.rows[0] ?? missing("Pengajuan wakaf tidak ditemukan.");
    try {
      assertWaqfProposalTransition(
        String(proposal.status) as WaqfProposalStatus,
        target,
      );
      if (options.review) {
        assertIndependentProposalReview({
          createdBy: String(proposal.created_by),
          reviewedBy: context.profileId,
        });
      }
    } catch (error) {
      translateRule(error);
    }
    const updated = await client.query<Row>(
      `update public.waqf_proposals
       set status = $1::text,
           submitted_at = case when $1::text = 'submitted' then now() else submitted_at end,
           review_notes = case when $2::boolean then $3::text else review_notes end,
           reviewed_by = case when $2::boolean then $4::uuid else reviewed_by end,
           reviewed_at = case when $2::boolean then now() else reviewed_at end,
           updated_by = $4::uuid
       where id = $5 and organization_id = $6
       returning *`,
      [
        target,
        Boolean(options.review),
        options.notes ?? null,
        context.profileId,
        id,
        context.organizationId,
      ],
    );
    const record =
      updated.rows[0] ?? missing("Pengajuan wakaf tidak ditemukan.");
    await event(client, context, "waqf_proposal", id, target, {
      notes: options.notes ?? null,
    });
    await insertAuditEvent(database, context, {
      action: `waqf.proposal_${target}`,
      after: record,
      before: proposal,
      entityId: id,
      entityType: "waqf_proposal",
    });
    return record;
  });
}

export function submitWaqfProposal(context: RequestContext, id: string) {
  requirePermission(context, "waqf_proposals.manage");
  return transitionProposal(context, id, "submitted");
}

export function cancelWaqfProposal(context: RequestContext, id: string) {
  requirePermission(context, "waqf_proposals.manage");
  return transitionProposal(context, id, "cancelled");
}

export function startWaqfProposalReview(context: RequestContext, id: string) {
  requirePermission(context, "waqf_proposals.review");
  return transitionProposal(context, id, "under_review");
}

export function decideWaqfProposal(
  context: RequestContext,
  id: string,
  input: WaqfProposalDecisionInput,
) {
  requirePermission(context, "waqf_proposals.review");
  return transitionProposal(context, id, input.decision, {
    notes: input.notes,
    review: true,
  });
}

/**
 * Pengajuan yang disetujui diteruskan ke objek operasional tanpa ketik ulang:
 * proyek wakaf/penawaran aset menjadi aset draft, permohonan manfaat menjadi
 * rencana pemanfaatan pada aset aktif.
 */
export async function convertWaqfProposal(
  context: RequestContext,
  id: string,
  input: ConvertWaqfProposalInput,
) {
  requirePermission(context, "waqf_proposals.review");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.waqf_proposals where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const proposal =
      current.rows[0] ?? missing("Pengajuan wakaf tidak ditemukan.");
    try {
      assertWaqfProposalTransition(
        String(proposal.status) as WaqfProposalStatus,
        "converted",
      );
    } catch (error) {
      translateRule(error);
    }

    let convertedAssetId: string | null = null;
    let convertedUtilizationId: string | null = null;

    if (proposal.proposal_type === "benefit_request") {
      requirePermission(context, "waqf_utilizations.manage");
      const asset = await ensureAsset(
        client,
        context,
        String(proposal.asset_id),
      );
      try {
        assertActiveWaqfAsset(
          String(asset.operational_status) as WaqfAssetStatus,
        );
      } catch (error) {
        translateRule(error);
      }
      const utilization = await client.query<Row>(
        `insert into public.waqf_utilizations (
           organization_id, asset_id, utilization_type, beneficiary_contact_id,
           start_date, expected_benefit, status, created_by
         )
         values ($1,$2,$3,$4,$5,$6,'planned',$7)
         returning *`,
        [
          context.organizationId,
          proposal.asset_id,
          input.utilization_type,
          proposal.proposer_contact_id,
          input.start_date ?? new Date().toISOString().slice(0, 10),
          `${String(proposal.title)} — ${String(proposal.description)}`.slice(
            0,
            3000,
          ),
          context.profileId,
        ],
      );
      convertedUtilizationId =
        utilization.rows[0]?.id ?? missing("Pemanfaatan wakaf gagal dibuat.");
      await event(
        client,
        context,
        "waqf_asset",
        String(proposal.asset_id),
        "utilization_recorded",
        { proposalId: id, utilizationId: convertedUtilizationId },
      );
    } else {
      requirePermission(context, "waqf_assets.manage");
      const fundraising =
        proposal.proposal_type === "waqf_project" &&
        proposal.requested_amount !== null;
      const asset = await insertWaqfAsset(client, context, {
        asset_type: String(
          proposal.proposed_asset_type ?? "other",
        ) as CreateWaqfAssetInput["asset_type"],
        collection_scheme: fundraising ? "cash_for_asset" : "direct_asset",
        currency: String(proposal.currency ?? "IDR"),
        description: String(proposal.description),
        donor_contact_id:
          proposal.proposal_type === "asset_offer"
            ? String(proposal.proposer_contact_id)
            : null,
        fundraising_target: fundraising
          ? String(proposal.requested_amount)
          : null,
        ...(proposal.location_text
          ? { location_text: String(proposal.location_text) }
          : {}),
        name: String(proposal.title),
        waqf_duration: "permanent",
        waqf_purpose: "khairi",
      });
      convertedAssetId = asset.id;
      await event(client, context, "waqf_asset", asset.id, "created", {
        proposalId: id,
      });
    }

    const updated = await client.query<Row>(
      `update public.waqf_proposals
       set status = 'converted',
           converted_asset_id = $1,
           converted_utilization_id = $2,
           converted_at = now(),
           updated_by = $3
       where id = $4 and organization_id = $5
       returning *`,
      [
        convertedAssetId,
        convertedUtilizationId,
        context.profileId,
        id,
        context.organizationId,
      ],
    );
    const record =
      updated.rows[0] ?? missing("Pengajuan wakaf tidak ditemukan.");
    await event(client, context, "waqf_proposal", id, "converted", {
      assetId: convertedAssetId,
      utilizationId: convertedUtilizationId,
    });
    await insertAuditEvent(database, context, {
      action: "waqf.proposal_converted",
      after: record,
      before: proposal,
      entityId: id,
      entityType: "waqf_proposal",
    });
    return record;
  });
}
