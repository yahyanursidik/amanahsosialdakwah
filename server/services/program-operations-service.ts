import { createHash } from "node:crypto";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type {
  CreateProgramApplicationAllocationInput,
  CreateProgramDeliveryAreaInput,
  CreateProgramPartnerAssignmentInput,
} from "../routes/program-operations-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type OperationRow = {
  case_status?: string | null;
  count?: number | string;
  delivery_area_id?: string | null;
  id?: string;
  quota_capacity?: number | string;
  request_hash?: string;
  [key: string]: unknown;
};

type QueryClient = {
  query: (query: string, values?: unknown[]) => Promise<{ rows: OperationRow[] }>;
};

function hashRequest(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function notFound(): never {
  throw new DomainError("NOT_FOUND", "Program atau data operasional tidak ditemukan.", 404);
}

async function assertProgram(client: QueryClient, context: RequestContext, programId: string) {
  const result = await client.query(
    "select id from public.programs where id = $1 and organization_id = $2 and not is_archived",
    [programId, context.organizationId],
  );
  if (!result.rows[0]) notFound();
}

function requireReadAccess(context: RequestContext) {
  requirePermission(context, "programs.read");
  requirePermission(context, "applications.read");
  requirePermission(context, "crm_contacts.read");
}

export async function getProgramOperations(context: RequestContext, programId: string) {
  requireReadAccess(context);
  return withTenantTransaction(context, async (_database, client) => {
    await assertProgram(client, context, programId);
    const [areas, partners, partnerCandidates, candidates, allocations] = await Promise.all([
      client.query(
        `select area.*, count(allocation.id) filter (where allocation.status in ('reserved','allocated'))::int as quota_used
         from public.program_delivery_areas area
         left join public.program_application_allocations allocation on allocation.delivery_area_id = area.id and allocation.organization_id = area.organization_id
         where area.organization_id = $1 and area.program_id = $2 group by area.id order by area.created_at asc`,
        [context.organizationId, programId],
      ),
      client.query(
        `select distinct contact.id, contact.display_name from public.crm_contacts contact
         join public.crm_contact_roles role on role.contact_id = contact.id and role.organization_id = contact.organization_id
         where contact.organization_id = $1 and contact.status = 'active'
           and role.role_type = 'distribution_partner' and role.status = 'active'
         order by contact.display_name`,
        [context.organizationId],
      ),
      client.query(
        `select assignment.*, contact.display_name as partner_name, area.name as delivery_area_name
         from public.program_partner_assignments assignment
         join public.crm_contacts contact on contact.id = assignment.partner_contact_id and contact.organization_id = assignment.organization_id
         left join public.program_delivery_areas area on area.id = assignment.delivery_area_id and area.organization_id = assignment.organization_id
         where assignment.organization_id = $1 and assignment.program_id = $2 order by assignment.created_at asc`,
        [context.organizationId, programId],
      ),
      client.query(
        `select application.id, application.reference_number, application.requested_support, application.urgency, contact.display_name as applicant_name,
                beneficiary_case.reference_number as case_reference, beneficiary_case.status as case_status
         from public.aid_applications application
         join public.crm_contacts contact on contact.id = application.applicant_contact_id and contact.organization_id = application.organization_id
         left join public.beneficiary_cases beneficiary_case on beneficiary_case.application_id = application.id and beneficiary_case.organization_id = application.organization_id
         where application.organization_id = $1 and application.program_id = $2
         order by case application.urgency when 'emergency' then 1 when 'urgent' then 2 else 3 end, application.created_at asc`,
        [context.organizationId, programId],
      ),
      client.query(
        `select allocation.*, application.reference_number as application_reference, contact.display_name as applicant_name,
                area.name as delivery_area_name, assignment.assignment_role, partner.display_name as partner_name
         from public.program_application_allocations allocation
         join public.aid_applications application on application.id = allocation.application_id and application.organization_id = allocation.organization_id
         join public.crm_contacts contact on contact.id = application.applicant_contact_id and contact.organization_id = application.organization_id
         left join public.program_delivery_areas area on area.id = allocation.delivery_area_id and area.organization_id = allocation.organization_id
         left join public.program_partner_assignments assignment on assignment.id = allocation.partner_assignment_id and assignment.organization_id = allocation.organization_id
         left join public.crm_contacts partner on partner.id = assignment.partner_contact_id and partner.organization_id = assignment.organization_id
         where allocation.organization_id = $1 and allocation.program_id = $2 order by allocation.created_at desc`,
        [context.organizationId, programId],
      ),
    ]);
    return { allocations: allocations.rows, areas: areas.rows, candidates: candidates.rows, partnerCandidates: partnerCandidates.rows, partners: partners.rows };
  });
}

export async function createProgramDeliveryArea(context: RequestContext, programId: string, input: CreateProgramDeliveryAreaInput) {
  requirePermission(context, "programs.manage");
  return withTenantTransaction(context, async (database, client) => {
    await assertProgram(client, context, programId);
    const result = await client.query(
      `insert into public.program_delivery_areas (organization_id, program_id, code, name, address_line, village, district, city, province, postal_code, quota_capacity, notes, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) returning *`,
      [context.organizationId, programId, input.code, input.name, input.address_line ?? null, input.village ?? null, input.district ?? null, input.city ?? null, input.province ?? null, input.postal_code ?? null, input.quota_capacity, input.notes ?? null, context.profileId],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, { action: "program.delivery_area_created", after: record, entityId: String(record.id), entityType: "program_delivery_area" });
    return record;
  });
}

export async function createProgramPartnerAssignment(context: RequestContext, programId: string, input: CreateProgramPartnerAssignmentInput) {
  requirePermission(context, "programs.manage");
  requirePermission(context, "crm_contacts.read");
  return withTenantTransaction(context, async (database, client) => {
    await assertProgram(client, context, programId);
    const partner = await client.query(
      `select contact.id from public.crm_contacts contact join public.crm_contact_roles role on role.contact_id = contact.id and role.organization_id = contact.organization_id
       where contact.id = $1 and contact.organization_id = $2 and contact.status = 'active' and role.role_type = 'distribution_partner' and role.status = 'active'`,
      [input.partner_contact_id, context.organizationId],
    );
    if (!partner.rows[0]) throw new DomainError("VALIDATION_ERROR", "Pilih contact aktif yang memiliki peran mitra penyalur.", 400);
    if (input.delivery_area_id) {
      const area = await client.query("select id from public.program_delivery_areas where id = $1 and organization_id = $2 and program_id = $3", [input.delivery_area_id, context.organizationId, programId]);
      if (!area.rows[0]) notFound();
    }
    const result = await client.query(
      `insert into public.program_partner_assignments (organization_id, program_id, delivery_area_id, partner_contact_id, assignment_role, pic_name, pic_phone, readiness_status, notes, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning *`,
      [context.organizationId, programId, input.delivery_area_id ?? null, input.partner_contact_id, input.assignment_role, input.pic_name ?? null, input.pic_phone ?? null, input.readiness_status, input.notes ?? null, context.profileId],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, { action: "program.partner_assigned", after: record, entityId: String(record.id), entityType: "program_partner_assignment" });
    return record;
  });
}

export async function createProgramApplicationAllocation(context: RequestContext, programId: string, input: CreateProgramApplicationAllocationInput, idempotencyKey: string) {
  requirePermission(context, "programs.manage");
  requirePermission(context, "applications.read");
  const requestHash = hashRequest({ input, programId });
  return withTenantTransaction(context, async (database, client) => {
    await assertProgram(client, context, programId);
    const existing = await client.query("select * from public.program_application_allocations where organization_id = $1 and idempotency_key = $2 for update", [context.organizationId, idempotencyKey]);
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== requestHash) throw new DomainError("CONFLICT", "Idempotency-Key sudah digunakan untuk data alokasi berbeda.", 409);
      return existing.rows[0];
    }
    const application = await client.query(
      `select application.id, beneficiary_case.status as case_status from public.aid_applications application
       left join public.beneficiary_cases beneficiary_case on beneficiary_case.application_id = application.id and beneficiary_case.organization_id = application.organization_id
       where application.id = $1 and application.organization_id = $2 and application.program_id = $3 for update of application`,
      [input.application_id, context.organizationId, programId],
    );
    if (!application.rows[0]) notFound();
    if (input.status !== "waitlisted" && application.rows[0].case_status !== "eligible") throw new DomainError("INVALID_STATE", "Hanya pengajuan dengan kasus eligible yang dapat direservasi atau dialokasikan.", 409);
    if (input.delivery_area_id) {
      const area = await client.query("select * from public.program_delivery_areas where id = $1 and organization_id = $2 and program_id = $3 and status in ('planned','active') for update", [input.delivery_area_id, context.organizationId, programId]);
      if (!area.rows[0]) notFound();
      if (input.status !== "waitlisted") {
        const usage = await client.query("select count(*)::int as count from public.program_application_allocations where organization_id = $1 and delivery_area_id = $2 and status in ('reserved','allocated') for update", [context.organizationId, input.delivery_area_id]);
        if (Number(usage.rows[0]?.count ?? 0) >= Number(area.rows[0].quota_capacity)) throw new DomainError("CONFLICT", "Kuota area penyaluran sudah penuh. Masukkan ke waitlist atau pilih area lain.", 409);
      }
    }
    if (input.partner_assignment_id) {
      const assignment = await client.query("select id, delivery_area_id from public.program_partner_assignments where id = $1 and organization_id = $2 and program_id = $3 and status = 'active' and readiness_status in ('ready','accepted')", [input.partner_assignment_id, context.organizationId, programId]);
      if (!assignment.rows[0] || (input.delivery_area_id && assignment.rows[0].delivery_area_id && assignment.rows[0].delivery_area_id !== input.delivery_area_id)) throw new DomainError("VALIDATION_ERROR", "Mitra harus aktif, siap, dan ditugaskan pada area yang sama.", 400);
    }
    const result = await client.query(
      `insert into public.program_application_allocations (organization_id, program_id, application_id, delivery_area_id, partner_assignment_id, status, notes, idempotency_key, request_hash, created_by, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning *`,
      [context.organizationId, programId, input.application_id, input.delivery_area_id ?? null, input.partner_assignment_id ?? null, input.status, input.notes ?? null, idempotencyKey, requestHash, context.profileId],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, { action: `program.application_${input.status}`, after: record, entityId: String(record.id), entityType: "program_application_allocation" });
    return record;
  });
}
