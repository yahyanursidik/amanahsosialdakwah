import { getDatabasePool, withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type { ProgramPublicationDraftInput } from "../routes/program-publication-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type PublicationRow = Record<string, unknown> & { id: string; status: string; version_number: number };

function notFound(): never {
  throw new DomainError("NOT_FOUND", "Program atau publikasi tidak ditemukan.", 404);
}

async function assertProgram(client: { query: Function }, context: RequestContext, programId: string) {
  const result = await client.query("select id from public.programs where id = $1 and organization_id = $2", [programId, context.organizationId]);
  if (!result.rows[0]) notFound();
}

export async function getProgramPublication(context: RequestContext, programId: string) {
  requirePermission(context, "programs.read");
  return withTenantTransaction(context, async (_database, client) => {
    await assertProgram(client, context, programId);
    const result = await client.query<PublicationRow>(
      `select * from public.program_publications where organization_id = $1 and program_id = $2 order by version_number desc limit 1`,
      [context.organizationId, programId],
    );
    return result.rows[0] ?? null;
  });
}

export async function saveProgramPublicationDraft(context: RequestContext, programId: string, input: ProgramPublicationDraftInput) {
  requirePermission(context, "programs.manage");
  return withTenantTransaction(context, async (database, client) => {
    await assertProgram(client, context, programId);
    const existingDraft = await client.query<PublicationRow>(
      `select * from public.program_publications where organization_id = $1 and program_id = $2 and status = 'draft' order by version_number desc limit 1 for update`,
      [context.organizationId, programId],
    );
    const values = [input.public_slug, input.public_title, input.public_summary, input.impact_headline ?? null, input.report_title, input.report_narrative, input.report_period_start ?? null, input.report_period_end ?? null, input.reported_beneficiary_count, input.reported_cash_amount ?? null, input.reported_goods_value ?? null, input.reported_logistics_amount ?? null];
    let publication: PublicationRow;
    if (existingDraft.rows[0]) {
      const updated = await client.query<PublicationRow>(
        `update public.program_publications set public_slug=$1, public_title=$2, public_summary=$3, impact_headline=$4, report_title=$5, report_narrative=$6, report_period_start=$7, report_period_end=$8, reported_beneficiary_count=$9, reported_cash_amount=$10, reported_goods_value=$11, reported_logistics_amount=$12, updated_by=$13 where id=$14 and organization_id=$15 returning *`,
        [...values, context.profileId, existingDraft.rows[0].id, context.organizationId],
      );
      publication = updated.rows[0]!;
    } else {
      const version = await client.query<{ version_number: number }>(`select coalesce(max(version_number), 0)::int + 1 as version_number from public.program_publications where organization_id = $1 and program_id = $2`, [context.organizationId, programId]);
      const created = await client.query<PublicationRow>(
        `insert into public.program_publications (organization_id, program_id, version_number, public_slug, public_title, public_summary, impact_headline, report_title, report_narrative, report_period_start, report_period_end, reported_beneficiary_count, reported_cash_amount, reported_goods_value, reported_logistics_amount, created_by, updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16) returning *`,
        [context.organizationId, programId, version.rows[0]!.version_number, ...values, context.profileId],
      );
      publication = created.rows[0]!;
    }
    await insertAuditEvent(database, context, { action: "program.publication_draft_saved", after: publication, entityId: publication.id, entityType: "program_publication" });
    return publication;
  });
}

export async function publishProgramPublication(context: RequestContext, programId: string) {
  requirePermission(context, "programs.manage");
  return withTenantTransaction(context, async (database, client) => {
    await assertProgram(client, context, programId);
    const draft = await client.query<PublicationRow>(`select * from public.program_publications where organization_id=$1 and program_id=$2 and status='draft' order by version_number desc limit 1 for update`, [context.organizationId, programId]);
    if (!draft.rows[0]) throw new DomainError("INVALID_STATE", "Simpan draft publikasi sebelum menerbitkannya.", 409);
    await client.query(`update public.program_publications set status='superseded', updated_by=$1 where organization_id=$2 and program_id=$3 and status='published'`, [context.profileId, context.organizationId, programId]);
    const published = await client.query<PublicationRow>(`update public.program_publications set status='published', published_by=$1, published_at=now(), updated_by=$1 where id=$2 and organization_id=$3 returning *`, [context.profileId, draft.rows[0].id, context.organizationId]);
    const publication = published.rows[0]!;
    await insertAuditEvent(database, context, { action: "program.publication_published", after: publication, entityId: publication.id, entityType: "program_publication" });
    return publication;
  });
}

/**
 * Data landing publik dibentuk otomatis dari record Program yang aktif.
 * Query ini sengaja hanya menghasilkan agregat; identitas penerima, pengajuan,
 * assessment, approval, PIC mitra, dan audit tidak pernah melewati endpoint ini.
 */
export async function getPublicProgramLanding(programId: string) {
  const client = await getDatabasePool().connect();
  try {
    const result = await client.query(
      `select
         program.id as program_id,
         program.code as program_code,
         program.name as program_name,
         coalesce(nullif(program.description, ''), nullif(program.objective, ''), 'Informasi program sosial-dakwah.') as program_summary,
         program.objective,
         program.starts_at,
         program.ends_at,
         program.support_modes,
         program.budget_amount::text as budget_amount,
         program.cash_budget_amount::text as cash_budget_amount,
         program.goods_budget_amount::text as goods_budget_amount,
         program.logistics_budget_amount::text as logistics_budget_amount,
         organization.name as organization_name,
         coalesce(area_stats.area_count, 0)::int as delivery_area_count,
         coalesce(area_stats.quota_capacity, 0)::int as quota_capacity,
         coalesce(area_stats.quota_used, 0)::int as quota_used,
         coalesce(case_stats.eligible_beneficiary_count, 0)::int as eligible_beneficiary_count,
         coalesce(distribution_stats.completed_distribution_count, 0)::int as completed_distribution_count,
         coalesce(distribution_stats.completed_distribution_amount, 0)::numeric(20,2)::text as completed_distribution_amount
       from public.programs program
       join public.organizations organization on organization.id = program.organization_id
       left join lateral (
         select count(*)::int as area_count,
                coalesce(sum(area.quota_capacity), 0)::int as quota_capacity,
                coalesce(sum(usage.quota_used), 0)::int as quota_used
         from public.program_delivery_areas area
         left join lateral (
           select count(*)::int as quota_used
           from public.program_application_allocations allocation
           where allocation.organization_id = area.organization_id
             and allocation.delivery_area_id = area.id
             and allocation.status in ('reserved', 'allocated')
         ) usage on true
         where area.organization_id = program.organization_id and area.program_id = program.id
       ) area_stats on true
       left join lateral (
         select count(*)::int as eligible_beneficiary_count
         from public.beneficiary_cases beneficiary_case
         where beneficiary_case.organization_id = program.organization_id
           and beneficiary_case.program_id = program.id
           and beneficiary_case.status = 'eligible'
       ) case_stats on true
       left join lateral (
         select count(*) filter (where distribution.status = 'completed')::int as completed_distribution_count,
                coalesce(sum(distribution.amount) filter (where distribution.status = 'completed'), 0)::numeric(20,2) as completed_distribution_amount
         from public.distribution_plans distribution
         where distribution.organization_id = program.organization_id and distribution.program_id = program.id
       ) distribution_stats on true
       where program.id = $1 and program.status = 'active' and not program.is_archived
       limit 1`,
      [programId],
    );
    return result.rows[0] ?? null;
  } finally { client.release(); }
}
