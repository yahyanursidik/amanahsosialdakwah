import { randomUUID } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type {
  CreateFieldReportInput,
  FieldReportListQuery,
  ReviewFieldReportInput,
} from "../routes/field-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { handoverReportIssues } from "../domain/field-task-rules";
import { loadFieldSettings } from "./field-settings-service";
import { applyReportToTask, listMyOpenTasks } from "./field-task-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

const reference = () =>
  `FLD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

const MAX_PHOTO_BYTES = 600_000;

/** Hasil verifikasi lapangan → status asesmen profil penerima. */
export const verificationToAssessment: Record<string, string> = {
  eligible: "eligible",
  moved: "in_review",
  needs_review: "in_review",
  not_eligible: "not_eligible",
  not_found: "in_review",
};

export function decodePhoto(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new DomainError("VALIDATION_ERROR", "Format foto tidak didukung.", 400);
  }
  const data = Buffer.from(match[2]!, "base64");
  if (data.length === 0 || data.length > MAX_PHOTO_BYTES) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Ukuran foto maksimal 600 KB setelah dikompres.",
      400,
    );
  }
  return { data, mimeType: match[1]! };
}

async function rows(client: PoolClient, sql: string, values: unknown[]) {
  return (await client.query<Row>(sql, values)).rows;
}

/**
 * Ruang kerja petugas lapangan: tugas kirim (shipment), tugas salur
 * (distribusi), tugas verifikasi (kasus & penerima), dan laporan terbaru.
 * Setiap bagian mengikuti izin baca modul sumber melalui RLS.
 */
export async function getFieldWorkspace(context: RequestContext) {
  requirePermission(context, "field_reports.read");
  const can = (permission: string) => context.permissions.has(permission);

  return withTenantTransaction(context, async (_database, client) => {
    const values = [context.organizationId, context.profileId];

    const deliveries = can("logistics_shipments.read")
      ? await rows(
          client,
          `select shipment.id, shipment.reference_number, shipment.status,
                  shipment.destination_name, shipment.destination_phone,
                  shipment.destination_address, shipment.tracking_number,
                  shipment.planned_dispatch_at, shipment.dispatched_at,
                  courier.name as courier_name, packing.reference_number as packing_reference,
                  packing.package_count
           from public.logistics_shipments shipment
           join public.logistics_couriers courier
             on courier.id = shipment.courier_id and courier.organization_id = shipment.organization_id
           left join public.aid_package_packings packing
             on packing.id = shipment.packing_id and packing.organization_id = shipment.organization_id
           where shipment.organization_id = $1 and shipment.assigned_profile_id = $2
             and shipment.status in ('draft','dispatched','in_transit','return_requested','returning')
           order by coalesce(shipment.planned_dispatch_at, shipment.created_at)`,
          values,
        )
      : [];

    const distributions = can("distributions.read")
      ? await rows(
          client,
          `select plan.id, plan.reference_number, plan.status, plan.amount::text as amount,
                  plan.currency, plan.distribution_method, plan.purpose, plan.planned_at,
                  plan.requires_confirmation, program.name as program_name,
                  beneficiary.id as beneficiary_id, beneficiary.display_name as beneficiary_name,
                  beneficiary.primary_phone as beneficiary_phone,
                  concat_ws(', ', beneficiary.address_line, beneficiary.village, beneficiary.district, beneficiary.city) as beneficiary_address
           from public.distribution_plans plan
           join public.distribution_assignments assignment
             on assignment.distribution_plan_id = plan.id and assignment.organization_id = plan.organization_id
            and assignment.status = 'active' and assignment.assignee_profile_id = $2
           join public.programs program
             on program.id = plan.program_id and program.organization_id = plan.organization_id
           join public.crm_contacts beneficiary
             on beneficiary.id = plan.beneficiary_contact_id and beneficiary.organization_id = plan.organization_id
           where plan.organization_id = $1
             and plan.status in ('assigned','in_progress','executed','confirmed','revision_required')
           order by plan.planned_at`,
          values,
        )
      : [];

    const assignedCases = can("cases.read")
      ? await rows(
          client,
          `select beneficiary_case.id, beneficiary_case.reference_number, beneficiary_case.status,
                  beneficiary_case.opened_at, program.name as program_name,
                  beneficiary.id as beneficiary_id, beneficiary.display_name as beneficiary_name,
                  beneficiary.primary_phone as beneficiary_phone,
                  concat_ws(', ', beneficiary.address_line, beneficiary.village, beneficiary.district, beneficiary.city) as beneficiary_address
           from public.beneficiary_cases beneficiary_case
           join public.programs program
             on program.id = beneficiary_case.program_id and program.organization_id = beneficiary_case.organization_id
           join public.crm_contacts beneficiary
             on beneficiary.id = beneficiary_case.beneficiary_contact_id and beneficiary.organization_id = beneficiary_case.organization_id
           where beneficiary_case.organization_id = $1 and beneficiary_case.assigned_to = $2
             and beneficiary_case.status in ('open','assigned','assessment')
           order by beneficiary_case.opened_at`,
          values,
        )
      : [];

    const beneficiariesToVerify = can("crm_beneficiary_profiles.read")
      ? await rows(
          client,
          `select contact.id, contact.display_name, contact.primary_phone,
                  concat_ws(', ', contact.address_line, contact.village, contact.district, contact.city) as address,
                  profile.assessment_status, profile.vulnerability_level,
                  (select max(report.occurred_at) from public.field_reports report
                   where report.organization_id = $1 and report.beneficiary_contact_id = contact.id
                     and report.report_type = 'verification_visit') as last_visit_at
           from public.crm_beneficiary_profiles profile
           join public.crm_contacts contact
             on contact.id = profile.contact_id and contact.organization_id = profile.organization_id
           where profile.organization_id = $1 and profile.status = 'active'
             and profile.assessment_status in ('not_assessed','in_review')
           order by case profile.vulnerability_level when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
                    contact.display_name
           limit 30`,
          [context.organizationId],
        )
      : [];

    const distributionsToVerify = can("distributions.verify")
      ? await rows(
          client,
          `select plan.id, plan.reference_number, plan.status, plan.amount::text as amount,
                  plan.currency, program.name as program_name,
                  beneficiary.display_name as beneficiary_name
           from public.distribution_plans plan
           join public.programs program
             on program.id = plan.program_id and program.organization_id = plan.organization_id
           join public.crm_contacts beneficiary
             on beneficiary.id = plan.beneficiary_contact_id and beneficiary.organization_id = plan.organization_id
           where plan.organization_id = $1 and plan.status = 'confirmed'
             and not exists (
               select 1 from public.distribution_assignments assignment
               where assignment.distribution_plan_id = plan.id and assignment.organization_id = plan.organization_id
                 and assignment.status = 'active' and assignment.assignee_profile_id = $2
             )
           order by plan.updated_at`,
          values,
        )
      : [];

    const tasks = await listMyOpenTasks(client, context);

    const recentReports = await rows(
      client,
      `select id, reference_number, report_type, title, status, occurred_at,
              verification_result, follow_up_needed
       from public.field_reports
       where organization_id = $1 and created_by = $2
       order by occurred_at desc
       limit 10`,
      values,
    );

    const pendingReview = can("field_reports.review")
      ? ((
          await client.query<{ count: number }>(
            `select count(*)::int as count from public.field_reports
             where organization_id = $1 and status = 'submitted' and created_by <> $2`,
            values,
          )
        ).rows[0]?.count ?? 0)
      : null;

    return {
      assignedCases,
      beneficiariesToVerify,
      deliveries,
      distributions,
      distributionsToVerify,
      pendingReview,
      recentReports,
      summary: {
        tasks: tasks.length,
        deliver: deliveries.length,
        distribute: distributions.length,
        verify:
          assignedCases.length +
          beneficiariesToVerify.length +
          distributionsToVerify.length,
      },
      tasks,
    };
  });
}

const reportSelect = `
  select report.*, reporter.display_name as reporter_name,
         reviewer.display_name as reviewer_name,
         program.name as program_name,
         beneficiary.display_name as beneficiary_name,
         plan.reference_number as distribution_reference,
         shipment.reference_number as shipment_reference,
         beneficiary_case.reference_number as case_reference,
         asset.name as waqf_asset_name,
         (select count(*)::int from public.field_report_photos photo
          where photo.report_id = report.id and photo.organization_id = report.organization_id) as photo_count
  from public.field_reports report
  join public.profiles reporter on reporter.id = report.created_by
  left join public.profiles reviewer on reviewer.id = report.reviewed_by
  left join public.programs program on program.id = report.program_id and program.organization_id = report.organization_id
  left join public.crm_contacts beneficiary on beneficiary.id = report.beneficiary_contact_id and beneficiary.organization_id = report.organization_id
  left join public.distribution_plans plan on plan.id = report.distribution_plan_id and plan.organization_id = report.organization_id
  left join public.logistics_shipments shipment on shipment.id = report.shipment_id and shipment.organization_id = report.organization_id
  left join public.beneficiary_cases beneficiary_case on beneficiary_case.id = report.case_id and beneficiary_case.organization_id = report.organization_id
  left join public.waqf_assets asset on asset.id = report.waqf_asset_id and asset.organization_id = report.organization_id
`;

export async function listFieldReports(
  context: RequestContext,
  query: FieldReportListQuery,
) {
  requirePermission(context, "field_reports.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["report.organization_id = $1"];
    const add = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (query.mine) filters.push(`report.created_by = ${add(context.profileId)}`);
    if (query.status) filters.push(`report.status = ${add(query.status)}`);
    if (query.report_type) filters.push(`report.report_type = ${add(query.report_type)}`);
    if (query.q) {
      const like = add(`%${query.q}%`);
      filters.push(
        `(report.title ilike ${like} or report.reference_number ilike ${like} or beneficiary.display_name ilike ${like} or reporter.display_name ilike ${like})`,
      );
    }
    const where = filters.join(" and ");
    const total = await client.query<{ total: number }>(
      `select count(*)::int as total
       from public.field_reports report
       join public.profiles reporter on reporter.id = report.created_by
       left join public.crm_contacts beneficiary on beneficiary.id = report.beneficiary_contact_id and beneficiary.organization_id = report.organization_id
       where ${where}`,
      values,
    );
    const limit = add(query.pageSize);
    const offset = add((query.page - 1) * query.pageSize);
    const data = await rows(
      client,
      `${reportSelect} where ${where}
       order by report.occurred_at desc
       limit ${limit} offset ${offset}`,
      values,
    );
    return {
      data,
      page: query.page,
      pageSize: query.pageSize,
      total: total.rows[0]?.total ?? 0,
    };
  });
}

export async function getFieldReport(context: RequestContext, id: string) {
  requirePermission(context, "field_reports.read");
  return withTenantTransaction(context, async (_database, client) => {
    const [report] = await rows(
      client,
      `${reportSelect} where report.id = $1 and report.organization_id = $2`,
      [id, context.organizationId],
    );
    if (!report) missing("Laporan lapangan tidak ditemukan.");
    const photos = await rows(
      client,
      `select id, sequence_number, mime_type, byte_size, width, height, caption,
              'data:' || mime_type || ';base64,' || encode(data, 'base64') as data_url
       from public.field_report_photos
       where report_id = $1 and organization_id = $2
       order by sequence_number`,
      [id, context.organizationId],
    );
    return {
      ...report,
      photos: photos.map((photo) => ({
        ...photo,
        data_url: String(photo.data_url).replace(/\s+/g, ""),
      })),
    };
  });
}

/**
 * Menyimpan laporan lapangan. Idempoten per `client_reference` sehingga
 * pengiriman ulang dari antrean offline tidak membuat laporan ganda.
 */
export async function createFieldReport(
  context: RequestContext,
  input: CreateFieldReportInput,
) {
  requirePermission(context, "field_reports.submit");
  const photos = input.photos.map((photo) => ({
    ...photo,
    ...decodePhoto(photo.data_url),
  }));

  return withTenantTransaction(context, async (database, client) => {
    const settings = await loadFieldSettings(client, context.organizationId);
    const issues = handoverReportIssues(settings, {
      hasGps: input.latitude != null && input.longitude != null,
      photoCount: photos.length,
      reportType: input.report_type,
    });
    if (issues.length > 0) {
      // Kiriman ulang dari antrean offline untuk laporan yang sudah diterima
      // tetap dianggap berhasil walau aturan berubah sesudahnya.
      const existing = await client.query(
        `select 1 from public.field_reports
         where organization_id = $1 and created_by = $2 and client_reference = $3`,
        [context.organizationId, context.profileId, input.client_reference],
      );
      if (!existing.rows[0]) {
        throw new DomainError("VALIDATION_ERROR", issues.join(" "), 400);
      }
    }
    let inserted: Row | undefined;
    try {
      inserted = (
        await client.query<Row>(
          `insert into public.field_reports (
             organization_id, reference_number, report_type, title, summary,
             program_id, distribution_plan_id, shipment_id, case_id, application_id,
             beneficiary_contact_id, waqf_asset_id, beneficiaries_reached,
             packages_delivered, amount_distributed, verification_result,
             verification_checks, household_size_observed, issues, follow_up_needed,
             severity, latitude, longitude, location_accuracy_m, location_text,
             occurred_at, client_reference, created_by, task_id
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
           on conflict (organization_id, created_by, client_reference) do nothing
           returning *`,
          [
            context.organizationId,
            reference(),
            input.report_type,
            input.title,
            input.summary,
            input.program_id ?? null,
            input.distribution_plan_id ?? null,
            input.shipment_id ?? null,
            input.case_id ?? null,
            input.application_id ?? null,
            input.beneficiary_contact_id ?? null,
            input.waqf_asset_id ?? null,
            input.beneficiaries_reached ?? null,
            input.packages_delivered ?? null,
            input.amount_distributed ?? null,
            input.report_type === "verification_visit"
              ? (input.verification_result ?? null)
              : null,
            JSON.stringify(
              input.report_type === "verification_visit"
                ? input.verification_checks
                : {},
            ),
            input.household_size_observed ?? null,
            input.issues ?? null,
            input.follow_up_needed,
            input.severity ?? null,
            input.latitude ?? null,
            input.longitude ?? null,
            input.location_accuracy_m ?? null,
            input.location_text ?? null,
            input.occurred_at,
            input.client_reference,
            context.profileId,
            input.task_id ?? null,
          ],
        )
      ).rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === "23503") {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Data terkait (program, penerima, distribusi, atau shipment) tidak ditemukan di organisasi ini.",
          400,
        );
      }
      throw error;
    }

    if (!inserted) {
      const existing = await client.query<Row>(
        `select id, reference_number, status from public.field_reports
         where organization_id = $1 and created_by = $2 and client_reference = $3`,
        [context.organizationId, context.profileId, input.client_reference],
      );
      return { ...(existing.rows[0] ?? missing("Laporan tidak ditemukan.")), duplicate: true };
    }

    for (const [index, photo] of photos.entries()) {
      await client.query(
        `insert into public.field_report_photos (
           organization_id, report_id, sequence_number, mime_type, byte_size,
           width, height, caption, data, created_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          context.organizationId,
          inserted.id,
          index + 1,
          photo.mimeType,
          photo.data.length,
          photo.width ?? null,
          photo.height ?? null,
          photo.caption ?? null,
          photo.data,
          context.profileId,
        ],
      );
    }

    const task = input.task_id
      ? await applyReportToTask(client, context, input.task_id, inserted.id)
      : null;

    await insertAuditEvent(database, context, {
      action: "field_report.submitted",
      after: { ...inserted, photo_count: photos.length },
      entityId: inserted.id,
      entityType: "field_report",
    });

    return {
      duplicate: false,
      id: inserted.id,
      reference_number: inserted.reference_number,
      status: inserted.status,
      task,
    };
  });
}

export async function reviewFieldReport(
  context: RequestContext,
  id: string,
  input: ReviewFieldReportInput,
) {
  requirePermission(context, "field_reports.review");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.field_reports where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const report = current.rows[0] ?? missing("Laporan lapangan tidak ditemukan.");
    if (report.status !== "submitted") {
      throw new DomainError("INVALID_STATE", "Laporan ini sudah direview.", 409);
    }
    if (report.created_by === context.profileId) {
      throw new DomainError(
        "INVALID_STATE",
        "Laporan harus direview oleh petugas yang berbeda dari pelapor.",
        409,
      );
    }
    const updated = await client.query<Row>(
      `update public.field_reports
       set status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = now()
       where id = $4 and organization_id = $5
       returning *`,
      [input.decision, input.notes, context.profileId, id, context.organizationId],
    );

    let assessmentUpdated: string | null = null;
    if (
      input.decision === "reviewed" &&
      report.report_type === "verification_visit" &&
      report.beneficiary_contact_id &&
      context.permissions.has("crm_beneficiary_profiles.manage") &&
      (await loadFieldSettings(client, context.organizationId)).verification_updates_profile
    ) {
      assessmentUpdated =
        verificationToAssessment[String(report.verification_result)] ?? null;
      if (assessmentUpdated) {
        await client.query(
          `update public.crm_beneficiary_profiles
           set assessment_status = $1,
               household_size = coalesce($2, household_size),
               updated_by = $3, updated_at = now()
           where contact_id = $4 and organization_id = $5`,
          [
            assessmentUpdated,
            report.household_size_observed ?? null,
            context.profileId,
            report.beneficiary_contact_id,
            context.organizationId,
          ],
        );
      }
    }

    await insertAuditEvent(database, context, {
      action: `field_report.${input.decision}`,
      after: { ...updated.rows[0], assessmentUpdated },
      before: report,
      entityId: id,
      entityType: "field_report",
    });
    return { ...updated.rows[0], assessment_updated: assessmentUpdated };
  });
}

export async function listFieldMembers(context: RequestContext) {
  if (!context.permissions.has("field_tasks.manage")) {
    requirePermission(context, "logistics_shipments.manage");
  }
  return withTenantTransaction(context, async (_database, client) =>
    rows(
      client,
      `select profile.id, profile.display_name, profile.email,
              coalesce(array_agg(distinct role.key) filter (where role.key is not null), '{}') as roles
       from public.memberships membership
       join public.profiles profile on profile.id = membership.profile_id
       left join public.membership_roles membership_role on membership_role.membership_id = membership.id
       left join public.roles role on role.id = membership_role.role_id
       where membership.organization_id = $1 and membership.status = 'active'
       group by profile.id
       order by profile.display_name`,
      [context.organizationId],
    ),
  );
}

/** Menugaskan petugas pengirim (driver/relawan) pada shipment. */
export async function assignShipment(
  context: RequestContext,
  shipmentId: string,
  profileId: string,
) {
  requirePermission(context, "logistics_shipments.manage");
  return withTenantTransaction(context, async (database, client) => {
    const member = await client.query(
      `select 1 from public.memberships
       where organization_id = $1 and profile_id = $2 and status = 'active'`,
      [context.organizationId, profileId],
    );
    if (!member.rows[0]) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Petugas harus anggota aktif organisasi.",
        400,
      );
    }
    const before = await client.query<Row>(
      `select * from public.logistics_shipments where id = $1 and organization_id = $2 for update`,
      [shipmentId, context.organizationId],
    );
    const shipment = before.rows[0] ?? missing("Shipment tidak ditemukan.");
    if (["delivered", "returned", "cancelled"].includes(String(shipment.status))) {
      throw new DomainError(
        "INVALID_STATE",
        "Shipment yang sudah selesai tidak dapat ditugaskan ulang.",
        409,
      );
    }
    const updated = await client.query<Row>(
      `update public.logistics_shipments
       set assigned_profile_id = $1, assigned_at = now(), assigned_by = $2,
           updated_by = $2, updated_at = now()
       where id = $3 and organization_id = $4
       returning id, reference_number, assigned_profile_id, assigned_at, status`,
      [profileId, context.profileId, shipmentId, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "logistics.shipment_field_assigned",
      after: updated.rows[0],
      before: shipment,
      entityId: shipmentId,
      entityType: "logistics_shipment",
    });
    return updated.rows[0];
  });
}
