import { createHash } from "node:crypto";

import { withTenantTransaction } from "../db/client";
import {
  canReadProgramBeneficiaryList,
  resolveProgramBeneficiaryJourneyAccess,
} from "../domain/program-beneficiary-journey-rules";
import { DomainError } from "../domain/errors";
import type { RequestContext } from "../types";
import type {
  CreateProgramFulfillmentInput,
  ProgramBeneficiaryJourneyQuery,
} from "../routes/program-schemas";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type JourneyRow = {
  application_created_at: string;
  application_id: string;
  application_reference: string;
  application_status: string;
  applicant_name: string;
  assessment_assessor_name: string | null;
  assessment_id: string | null;
  assessment_outcome: string | null;
  assessment_reference: string | null;
  assessment_reviewer_name: string | null;
  assessment_score_percentage: string | number | null;
  assessment_status: string | null;
  beneficiary_address: string | null;
  beneficiary_assessment_status: string | null;
  beneficiary_contact_id: string;
  beneficiary_name: string;
  beneficiary_type: string | null;
  case_id: string | null;
  case_reference: string | null;
  case_status: string | null;
  distribution_assignee_name: string | null;
  distribution_id: string | null;
  distribution_method: string | null;
  distribution_reference: string | null;
  distribution_status: string | null;
  proposer_name: string | null;
  requested_support: string;
  urgency: string;
  approval_approver_name: string | null;
  approval_decided_at: string | null;
  approval_id: string | null;
  approval_reference: string | null;
  approval_requested_by_name: string | null;
  approval_status: string | null;
};

type FulfillmentRow = {
  application_id: string;
  packing_reference: string;
  packing_status: string;
  partner_name: string | null;
  partner_pic_name: string | null;
  partner_readiness_status: string;
  shipment_reference: string | null;
  shipment_status: string | null;
  warehouse_name: string;
};

function notFound(): never {
  throw new DomainError("NOT_FOUND", "Program tidak ditemukan.", 404);
}

function unavailable(): never {
  throw new DomainError(
    "INVALID_STATE",
    "Schema fulfilment belum diterapkan. Jalankan migration terlebih dahulu.",
    409,
  );
}

function hashRequest(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function approvalSubjectAssessmentClause(
  canReadAssessments: boolean,
): string {
  if (!canReadAssessments) return "";

  // This fragment is interpolated inside the `request` lateral-query below.
  // Keep the table alias aligned with that scope; using the outer alias here
  // makes PostgreSQL reject the whole beneficiary journey query.
  return `or (
            request.subject_type = 'assessment'
            and request.subject_id = assessment.id
          )`;
}

async function assertFulfillmentSchema(client: {
  query: <TRow extends Record<string, unknown>>(
    sql: string,
  ) => Promise<{
    rows: TRow[];
  }>;
}): Promise<void> {
  const result = await client.query<{ available: boolean }>(
    `select to_regclass('public.program_beneficiary_fulfillments') is not null as available`,
  );
  if (!result.rows[0]?.available) unavailable();
}

export async function getProgramBeneficiaryFulfillmentOptions(
  context: RequestContext,
  programId: string,
) {
  requirePermission(context, "programs.read");
  requirePermission(context, "aid_package_packings.read");
  requirePermission(context, "crm_contacts.read");

  return withTenantTransaction(context, async (_database, client) => {
    const program = await client.query<{ id: string }>(
      `select id from public.programs where id = $1 and organization_id = $2`,
      [programId, context.organizationId],
    );
    if (!program.rows[0]) notFound();

    const [packings, partners] = await Promise.all([
      client.query<{
        id: string;
        package_count: number;
        reference_number: string;
        warehouse_name: string;
      }>(
        `select packing.id, packing.reference_number, packing.package_count,
           warehouse.name as warehouse_name
         from public.aid_package_packings packing
         join public.inventory_warehouses warehouse
           on warehouse.id = packing.warehouse_id
          and warehouse.organization_id = packing.organization_id
         where packing.organization_id = $1 and packing.status = 'packed'
         order by packing.created_at desc
         limit 200`,
        [context.organizationId],
      ),
      client.query<{ id: string; display_name: string }>(
        `select distinct contact.id, contact.display_name
         from public.crm_contacts contact
         join public.crm_contact_roles role
           on role.contact_id = contact.id
          and role.organization_id = contact.organization_id
         where contact.organization_id = $1
           and contact.status = 'active'
           and role.role_type = 'distribution_partner'
           and role.status = 'active'
         order by contact.display_name
         limit 200`,
        [context.organizationId],
      ),
    ]);
    return { packings: packings.rows, partners: partners.rows };
  });
}

export async function createProgramBeneficiaryFulfillment(
  context: RequestContext,
  programId: string,
  input: CreateProgramFulfillmentInput,
  idempotencyKey: string,
) {
  requirePermission(context, "programs.manage");
  requirePermission(context, "aid_package_packings.manage");
  requirePermission(context, "applications.read");
  if (input.partner_contact_id) {
    requirePermission(context, "crm_contacts.read");
  }
  const requestHash = hashRequest({ input, programId });

  return withTenantTransaction(context, async (database, client) => {
    await assertFulfillmentSchema(client);
    const existing = await client.query<{
      id: string;
      request_hash: string;
    }>(
      `select id, request_hash
       from public.program_beneficiary_fulfillments
       where organization_id = $1 and idempotency_key = $2
       for update`,
      [context.organizationId, idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].request_hash !== requestHash) {
        throw new DomainError(
          "CONFLICT",
          "Idempotency-Key telah dipakai untuk data fulfilment berbeda.",
          409,
        );
      }
      const record = await client.query<Record<string, unknown>>(
        `select * from public.program_beneficiary_fulfillments
         where id = $1 and organization_id = $2`,
        [existing.rows[0].id, context.organizationId],
      );
      return record.rows[0]!;
    }

    const application = await client.query<{
      beneficiary_contact_id: string;
      case_id: string | null;
    }>(
      `select coalesce(beneficiary_case.beneficiary_contact_id, application.applicant_contact_id)
           as beneficiary_contact_id,
           beneficiary_case.id as case_id
       from public.aid_applications application
       left join public.beneficiary_cases beneficiary_case
         on beneficiary_case.application_id = application.id
        and beneficiary_case.organization_id = application.organization_id
       where application.id = $1
         and application.program_id = $2
         and application.organization_id = $3
       for update of application`,
      [input.application_id, programId, context.organizationId],
    );
    if (!application.rows[0]) {
      throw new DomainError(
        "NOT_FOUND",
        "Pengajuan pada program aktif tidak ditemukan.",
        404,
      );
    }

    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [
      input.packing_id,
    ]);
    const activeLink = await client.query<{ id: string }>(
      `select id from public.program_beneficiary_fulfillments
       where organization_id = $1
         and application_id = $2
         and packing_id = $3
         and status = 'active'
       for update`,
      [context.organizationId, input.application_id, input.packing_id],
    );
    if (activeLink.rows[0]) {
      throw new DomainError(
        "CONFLICT",
        "Packing ini sudah ditautkan ke pengajuan tersebut.",
        409,
      );
    }

    const packing = await client.query<{ package_count: number }>(
      `select package_count from public.aid_package_packings
       where id = $1 and organization_id = $2 and status = 'packed'
       for update`,
      [input.packing_id, context.organizationId],
    );
    if (!packing.rows[0]) {
      throw new DomainError(
        "NOT_FOUND",
        "Packing berstatus packed tidak ditemukan.",
        404,
      );
    }
    const usedPackages = await client.query<{ count: number }>(
      `select coalesce(sum(package_count), 0)::int as count
       from public.program_beneficiary_fulfillments
       where organization_id = $1 and packing_id = $2 and status = 'active'`,
      [context.organizationId, input.packing_id],
    );
    if (
      (usedPackages.rows[0]?.count ?? 0) + input.package_count >
      packing.rows[0].package_count
    ) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Jumlah paket melebihi kapasitas packing yang tersedia.",
        400,
      );
    }

    if (input.partner_contact_id) {
      const partner = await client.query<{ id: string }>(
        `select contact.id from public.crm_contacts contact
         join public.crm_contact_roles role
           on role.contact_id = contact.id
          and role.organization_id = contact.organization_id
         where contact.id = $1 and contact.organization_id = $2
           and contact.status = 'active'
           and role.role_type = 'distribution_partner'
           and role.status = 'active'`,
        [input.partner_contact_id, context.organizationId],
      );
      if (!partner.rows[0]) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Mitra penyalur harus berupa contact aktif dengan peran mitra penyalur.",
          400,
        );
      }
    }

    const created = await client.query<Record<string, unknown>>(
      `insert into public.program_beneficiary_fulfillments (
         organization_id, program_id, application_id, case_id,
         beneficiary_contact_id, packing_id, package_count,
         partner_contact_id, partner_pic_name, partner_readiness_status,
         idempotency_key, request_hash, created_by, updated_by
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
       returning *`,
      [
        context.organizationId,
        programId,
        input.application_id,
        application.rows[0].case_id,
        application.rows[0].beneficiary_contact_id,
        input.packing_id,
        input.package_count,
        input.partner_contact_id ?? null,
        input.partner_pic_name ?? null,
        input.partner_readiness_status,
        idempotencyKey,
        requestHash,
        context.profileId,
      ],
    );
    const record = created.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "program.fulfillment_linked",
      after: record,
      entityId: String(record.id),
      entityType: "program_beneficiary_fulfillment",
    });
    return record;
  });
}

export async function getProgramBeneficiaryJourney(
  context: RequestContext,
  programId: string,
  query: ProgramBeneficiaryJourneyQuery,
) {
  requirePermission(context, "programs.read");
  const access = resolveProgramBeneficiaryJourneyAccess(context.permissions);
  const canReadFulfillments = context.permissions.has(
    "aid_package_packings.read",
  );

  return withTenantTransaction(context, async (_database, client) => {
    const program = await client.query<{ id: string }>(
      `select id from public.programs where id = $1 and organization_id = $2`,
      [programId, context.organizationId],
    );
    if (!program.rows[0]) {
      return notFound();
    }

    const availableSections = ["program"];
    if (access.canReadApplications) availableSections.push("applications");
    if (access.canReadCases) availableSections.push("cases");
    if (access.canReadContacts) availableSections.push("beneficiaries");
    if (access.canReadAssessments) availableSections.push("assessments");
    if (access.canReadApprovals) availableSections.push("approvals");
    if (access.canReadDistributions) availableSections.push("distributions");

    const withheldSections = [
      !access.canReadApplications ? "pengajuan" : null,
      !access.canReadCases ? "kasus" : null,
      !access.canReadContacts ? "profil penerima" : null,
      !access.canReadAssessments ? "hasil asesmen" : null,
      !access.canReadApprovals ? "approval" : null,
      !access.canReadDistributions ? "distribusi" : null,
    ].filter((section): section is string => section !== null);

    if (!canReadProgramBeneficiaryList(access)) {
      return {
        availableSections,
        beneficiaries: [],
        dataLimitations: [
          "Daftar calon penerima memerlukan akses baca pengajuan, kasus, dan contact master.",
          "Data fulfilment gudang dan mitra memerlukan akses baca packing paket bantuan.",
        ],
        fulfillmentSchemaAvailable: false,
        fulfillmentsByApplication: {},
        pagination: { page: query.page, pageSize: query.pageSize, total: 0 },
        withheldSections,
      };
    }

    const assessmentSelect = access.canReadAssessments
      ? `assessment.id as assessment_id,
         assessment.reference_number as assessment_reference,
         assessment.status as assessment_status,
         assessment.outcome as assessment_outcome,
         assessment.score_percentage as assessment_score_percentage,
         assessor.display_name as assessment_assessor_name,
         reviewer.display_name as assessment_reviewer_name,`
      : `null::uuid as assessment_id,
         null::text as assessment_reference,
         null::text as assessment_status,
         null::text as assessment_outcome,
         null::numeric as assessment_score_percentage,
         null::text as assessment_assessor_name,
         null::text as assessment_reviewer_name,`;
    const assessmentJoin = access.canReadAssessments
      ? `left join lateral (
           select assessment.*
           from public.case_assessments assessment
           where assessment.organization_id = application.organization_id
             and assessment.case_id = beneficiary_case.id
           order by assessment.updated_at desc
           limit 1
         ) assessment on true
         left join public.profiles assessor on assessor.id = assessment.assessor_profile_id
         left join public.profiles reviewer on reviewer.id = assessment.reviewer_profile_id`
      : "";

    const approvalSubjectAssessment = approvalSubjectAssessmentClause(
      access.canReadAssessments,
    );
    const approvalSelect = access.canReadApprovals
      ? `approval_request.id as approval_id,
         approval_request.reference_number as approval_reference,
         approval_request.status as approval_status,
         approval_requester.display_name as approval_requested_by_name,
         approval_actor.display_name as approval_approver_name,
         approval_action.occurred_at as approval_decided_at,`
      : `null::uuid as approval_id,
         null::text as approval_reference,
         null::text as approval_status,
         null::text as approval_requested_by_name,
         null::text as approval_approver_name,
         null::timestamptz as approval_decided_at,`;
    const approvalJoin = access.canReadApprovals
      ? `left join lateral (
           select request.*
           from public.approval_requests request
           where request.organization_id = application.organization_id
             and (
               (request.subject_type = 'case' and request.subject_id = beneficiary_case.id)
               ${approvalSubjectAssessment}
             )
           order by request.updated_at desc
           limit 1
         ) approval_request on true
         left join public.profiles approval_requester
           on approval_requester.id = approval_request.requested_by
         left join lateral (
           select action.*
           from public.approval_actions action
           where action.organization_id = application.organization_id
             and action.approval_request_id = approval_request.id
             and action.action = 'approved'
           order by action.occurred_at desc
           limit 1
         ) approval_action on true
         left join public.profiles approval_actor
           on approval_actor.id = approval_action.actor_profile_id`
      : "";

    const distributionSelect = access.canReadDistributions
      ? `distribution.id as distribution_id,
         distribution.reference_number as distribution_reference,
         distribution.status as distribution_status,
         distribution.distribution_method as distribution_method,
         distribution_assignee.display_name as distribution_assignee_name`
      : `null::uuid as distribution_id,
         null::text as distribution_reference,
         null::text as distribution_status,
         null::text as distribution_method,
         null::text as distribution_assignee_name`;
    const distributionJoin = access.canReadDistributions
      ? `left join lateral (
           select plan.*
           from public.distribution_plans plan
           where plan.organization_id = application.organization_id
             and plan.program_id = application.program_id
             and plan.case_id = beneficiary_case.id
           order by plan.updated_at desc
           limit 1
         ) distribution on true
         left join lateral (
           select profile.display_name
           from public.distribution_assignments assignment
           join public.profiles profile on profile.id = assignment.assignee_profile_id
           where assignment.organization_id = application.organization_id
             and assignment.distribution_plan_id = distribution.id
             and assignment.status = 'active'
           order by assignment.sequence_number desc
           limit 1
         ) distribution_assignee on true`
      : "";

    const filters = [
      "application.organization_id = $1",
      "application.program_id = $2",
    ];
    const values: unknown[] = [context.organizationId, programId];

    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(`concat_ws(' ',
        application.reference_number,
        application.requested_support,
        applicant.display_name,
        beneficiary.display_name,
        beneficiary_case.reference_number
      ) ilike $${values.length}`);
    }

    if (query.stage === "needs_action") {
      filters.push(`(
        application.status in ('draft', 'submitted', 'in_screening')
        or beneficiary_case.id is null
        or beneficiary_case.status in ('open', 'assigned')
      )`);
    }
    if (query.stage === "in_distribution") {
      filters.push(`exists (
        select 1 from public.distribution_plans active_distribution
        where active_distribution.organization_id = application.organization_id
          and active_distribution.program_id = application.program_id
          and active_distribution.case_id = beneficiary_case.id
          and active_distribution.status not in ('completed', 'cancelled')
      )`);
    }
    if (query.stage === "completed") {
      filters.push(`exists (
        select 1 from public.distribution_plans completed_distribution
        where completed_distribution.organization_id = application.organization_id
          and completed_distribution.program_id = application.program_id
          and completed_distribution.case_id = beneficiary_case.id
          and completed_distribution.status = 'completed'
      )`);
    }

    const where = filters.join(" and ");
    const count = await client.query<{ total: string | number }>(
      `select count(*) as total
       from public.aid_applications application
       join public.crm_contacts applicant
         on applicant.id = application.applicant_contact_id
        and applicant.organization_id = application.organization_id
       left join public.beneficiary_cases beneficiary_case
         on beneficiary_case.application_id = application.id
        and beneficiary_case.organization_id = application.organization_id
       left join public.crm_contacts beneficiary
         on beneficiary.id = beneficiary_case.beneficiary_contact_id
        and beneficiary.organization_id = application.organization_id
       where ${where}`,
      values,
    );
    const total = Number(count.rows[0]?.total ?? 0);
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);

    const result = await client.query<JourneyRow>(
      `select
         application.id as application_id,
         application.reference_number as application_reference,
         application.status as application_status,
         application.requested_support,
         application.urgency,
         application.created_at as application_created_at,
         applicant.display_name as applicant_name,
         proposer.display_name as proposer_name,
         coalesce(beneficiary.id, applicant.id) as beneficiary_contact_id,
         coalesce(beneficiary.display_name, applicant.display_name) as beneficiary_name,
         nullif(concat_ws(', ',
           coalesce(beneficiary.address_line, applicant.address_line),
           coalesce(beneficiary.village, applicant.village),
           coalesce(beneficiary.district, applicant.district),
           coalesce(beneficiary.city, applicant.city),
           coalesce(beneficiary.province, applicant.province),
           coalesce(beneficiary.postal_code, applicant.postal_code)
         ), '') as beneficiary_address,
         beneficiary_profile.beneficiary_type,
         beneficiary_profile.assessment_status as beneficiary_assessment_status,
         beneficiary_case.id as case_id,
         beneficiary_case.reference_number as case_reference,
         beneficiary_case.status as case_status,
         ${assessmentSelect}
         ${approvalSelect}
         ${distributionSelect}
       from public.aid_applications application
       join public.crm_contacts applicant
         on applicant.id = application.applicant_contact_id
        and applicant.organization_id = application.organization_id
       left join public.profiles proposer on proposer.id = application.created_by
       left join public.beneficiary_cases beneficiary_case
         on beneficiary_case.application_id = application.id
        and beneficiary_case.organization_id = application.organization_id
       left join public.crm_contacts beneficiary
         on beneficiary.id = beneficiary_case.beneficiary_contact_id
        and beneficiary.organization_id = application.organization_id
       left join public.crm_beneficiary_profiles beneficiary_profile
         on beneficiary_profile.contact_id = coalesce(beneficiary.id, applicant.id)
        and beneficiary_profile.organization_id = application.organization_id
       ${assessmentJoin}
       ${approvalJoin}
       ${distributionJoin}
       where ${where}
       order by case application.urgency
         when 'emergency' then 1
         when 'urgent' then 2
         else 3
       end, application.created_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );

    const tableCheck = await client.query<{ available: boolean }>(
      `select to_regclass('public.program_beneficiary_fulfillments') is not null as available`,
    );
    const fulfillmentSchemaAvailable = tableCheck.rows[0]?.available ?? false;
    const fulfillmentsByApplication: Record<string, FulfillmentRow[]> = {};

    if (
      canReadFulfillments &&
      fulfillmentSchemaAvailable &&
      result.rows.length
    ) {
      const applicationIds = result.rows.map((row) => row.application_id);
      const fulfillmentRows = await client.query<FulfillmentRow>(
        `select fulfillment.application_id,
           packing.reference_number as packing_reference,
           packing.status as packing_status,
           warehouse.name as warehouse_name,
           partner.display_name as partner_name,
           fulfillment.partner_pic_name,
           fulfillment.partner_readiness_status,
           shipment.reference_number as shipment_reference,
           shipment.status as shipment_status
         from public.program_beneficiary_fulfillments fulfillment
         join public.aid_package_packings packing
           on packing.id = fulfillment.packing_id
          and packing.organization_id = fulfillment.organization_id
         join public.inventory_warehouses warehouse
           on warehouse.id = packing.warehouse_id
          and warehouse.organization_id = packing.organization_id
         left join public.crm_contacts partner
           on partner.id = fulfillment.partner_contact_id
          and partner.organization_id = fulfillment.organization_id
         left join lateral (
           select shipment.reference_number, shipment.status
           from public.logistics_shipments shipment
           where shipment.organization_id = fulfillment.organization_id
             and shipment.packing_id = fulfillment.packing_id
           order by shipment.updated_at desc
           limit 1
         ) shipment on true
         where fulfillment.organization_id = $1
           and fulfillment.program_id = $2
           and fulfillment.status = 'active'
           and fulfillment.application_id = any($3::uuid[])
         order by fulfillment.created_at desc`,
        [context.organizationId, programId, applicationIds],
      );
      for (const row of fulfillmentRows.rows) {
        const existing = fulfillmentsByApplication[row.application_id] ?? [];
        existing.push(row);
        fulfillmentsByApplication[row.application_id] = existing;
      }
    }

    return {
      availableSections,
      beneficiaries: result.rows,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
      dataLimitations: fulfillmentSchemaAvailable
        ? canReadFulfillments
          ? []
          : [
              "Data gudang dan mitra disembunyikan karena permission packing paket bantuan belum tersedia.",
            ]
        : [
            "Relasi fulfilment gudang, shipment, dan mitra belum diterapkan pada database ini.",
          ],
      fulfillmentSchemaAvailable,
      fulfillmentsByApplication,
      withheldSections,
    };
  });
}
