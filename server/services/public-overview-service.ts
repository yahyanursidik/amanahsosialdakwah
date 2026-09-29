import { getDatabasePool } from "../db/client";

/**
 * Ringkasan publik untuk beranda: hanya angka agregat dan program aktif
 * (sama dengan yang sudah terbuka di halaman publik program). Tidak ada
 * identitas penerima, donatur, atau data internal yang dikirim.
 */
export async function getPublicOverview() {
  const client = await getDatabasePool().connect();
  try {
    const stats = (
      await client.query<Record<string, string | number>>(
        `select
           (select count(*)::int from public.organizations where status = 'active') as organizations,
           (select count(*)::int from public.programs where status = 'active' and not is_archived) as active_programs,
           (select count(*)::int from (
              select organization_id, beneficiary_contact_id from public.distribution_plans where status = 'completed'
              union
              select organization_id, beneficiary_contact_id from public.program_beneficiary_fulfillments where status = 'active'
              union
              select organization_id, beneficiary_contact_id from public.waqf_benefit_distributions
              where status = 'completed' and beneficiary_contact_id is not null
            ) reached) as beneficiaries_reached,
           (coalesce((select sum(amount) from public.distribution_plans where status = 'completed' and currency = 'IDR'), 0)
            + coalesce((select sum(amount) from public.waqf_benefit_distributions where status = 'completed' and currency = 'IDR'), 0)
           )::numeric(20,2)::text as distributed_amount,
           (select coalesce(sum(package_count), 0)::int from public.program_beneficiary_fulfillments where status = 'active') as packages_delivered,
           (select count(*)::int from public.waqf_assets where operational_status in ('active', 'under_maintenance')) as waqf_assets`,
      )
    ).rows[0];

    const programs = (
      await client.query<Record<string, unknown>>(
        `select program.id, program.name, program.support_modes,
                coalesce(program.fund_types, array[program.fund_type]) as fund_types,
                coalesce(nullif(program.description, ''), nullif(program.objective, ''), 'Program sosial-dakwah.') as summary,
                program.budget_amount::text as budget_amount,
                program.target_beneficiary_count, program.starts_at, program.ends_at,
                organization.name as organization_name, category.name as category_name,
                coalesce(done.amount, 0)::numeric(20,2)::text as distributed_amount,
                coalesce(done.beneficiaries, 0)::int as beneficiaries_reached
         from public.programs program
         join public.organizations organization
           on organization.id = program.organization_id and organization.status = 'active'
         left join public.program_categories category on category.id = program.category_id
         left join lateral (
           select sum(plan.amount) filter (where plan.status = 'completed') as amount,
                  count(distinct plan.beneficiary_contact_id) filter (where plan.status = 'completed') as beneficiaries
           from public.distribution_plans plan
           where plan.program_id = program.id and plan.organization_id = program.organization_id
         ) done on true
         where program.status = 'active' and not program.is_archived
         order by coalesce(done.amount, 0) desc, program.starts_at desc nulls last
         limit 6`,
      )
    ).rows;

    return { programs, stats, updatedAt: new Date().toISOString() };
  } finally {
    client.release();
  }
}
