import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction } from "../db/client";
import { engagementSql } from "../domain/donor-rules";
import { DomainError } from "../domain/errors";
import type {
  CreateDonorInput,
  DonorContactInput,
  DonorInteractionInput,
  DonorListQuery,
  DonorProfileInput,
  UpdateDonorInput,
} from "../routes/donor-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { normalizePhone, normalizeText } from "./beneficiary-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

/**
 * Semua pemberian per kontak dari transaksi sumber: dana (posted), donasi
 * barang (nilai taksiran), wakaf (diterima), dan pembayaran kafalah.
 * Setiap sumber tetap tunduk pada RLS modulnya masing-masing.
 */
const givingCte = `
  giving as (
    select receipt.donor_contact_id as contact_id, 'cash'::text as kind,
           receipt.amount, receipt.received_at as gift_at
    from public.fund_receipts receipt
    where receipt.organization_id = $1 and receipt.status = 'posted'
      and receipt.donor_contact_id is not null
    union all
    select donation.donor_contact_id, 'in_kind', donation.estimated_total_value, donation.received_at
    from public.in_kind_donations donation
    where donation.organization_id = $1 and donation.donor_contact_id is not null
    union all
    select contribution.wakif_contact_id, 'waqf', contribution.amount, contribution.received_at
    from public.waqf_contributions contribution
    where contribution.organization_id = $1 and contribution.status = 'received'
      and contribution.wakif_contact_id is not null
    union all
    select match.sponsor_contact_id, 'kafalah', payment.amount, payment.paid_at
    from public.kafalah_payments payment
    join public.kafalah_schedules schedule
      on schedule.id = payment.schedule_id and schedule.organization_id = payment.organization_id
    join public.kafalah_contracts contract
      on contract.id = schedule.contract_id and contract.organization_id = schedule.organization_id
    join public.kafalah_matches match
      on match.id = contract.match_id and match.organization_id = contract.organization_id
    where payment.organization_id = $1 and payment.status = 'received'
  ),
  totals as (
    select contact_id,
           coalesce(sum(amount) filter (where kind = 'cash'), 0) as cash_total,
           coalesce(sum(amount) filter (where kind = 'in_kind'), 0) as goods_total,
           coalesce(sum(amount) filter (where kind = 'waqf'), 0) as waqf_total,
           coalesce(sum(amount) filter (where kind = 'kafalah'), 0) as kafalah_total,
           coalesce(sum(amount), 0) as grand_total,
           coalesce(sum(amount) filter (where gift_at >= date_trunc('year', now())), 0) as this_year_total,
           count(*)::int as gift_count,
           min(gift_at) as first_gift_at,
           max(gift_at) as last_gift_at
    from giving
    group by contact_id
  ),
  registry as (
    select contact_id from totals
    union
    select contact_id from public.crm_donor_profiles where organization_id = $1
    union
    select contact_id from public.crm_contact_roles
    where organization_id = $1 and role_type in ('donor', 'kafil') and status = 'active'
    union
    select donor_contact_id from public.waqf_assets
    where organization_id = $1 and donor_contact_id is not null
  ),
  donors as (
    select contact.id, contact.display_name, contact.contact_type, contact.primary_phone,
           contact.whatsapp_phone, contact.primary_email, contact.city, contact.normalized_phone,
           profile.id as profile_id, profile.segment, profile.preferred_channel,
           profile.recurring_amount::text as recurring_amount, profile.recurring_frequency,
           profile.relationship_manager_id, manager.display_name as manager_name,
           coalesce(profile.status, 'active') as donor_status,
           coalesce(totals.cash_total, 0) as cash_total,
           coalesce(totals.goods_total, 0) as goods_total,
           coalesce(totals.waqf_total, 0) as waqf_total,
           coalesce(totals.kafalah_total, 0) as kafalah_total,
           coalesce(totals.grand_total, 0) as grand_total,
           coalesce(totals.this_year_total, 0) as this_year_total,
           coalesce(totals.gift_count, 0) as gift_count,
           totals.first_gift_at, totals.last_gift_at,
           ${engagementSql("totals.last_gift_at")} as engagement,
           exists (
             select 1 from public.waqf_assets asset
             where asset.donor_contact_id = contact.id and asset.organization_id = $1
           ) as donated_waqf_asset,
           follow.next_follow_up_at, coalesce(follow.open_follow_ups, 0) as open_follow_ups
    from registry
    join public.crm_contacts contact
      on contact.id = registry.contact_id and contact.organization_id = $1
    left join public.crm_donor_profiles profile
      on profile.contact_id = contact.id and profile.organization_id = $1
    left join public.profiles manager on manager.id = profile.relationship_manager_id
    left join totals on totals.contact_id = contact.id
    left join lateral (
      select min(interaction.follow_up_at) as next_follow_up_at, count(*)::int as open_follow_ups
      from public.crm_interactions interaction
      where interaction.contact_id = contact.id and interaction.organization_id = $1
        and interaction.follow_up_status = 'open'
    ) follow on true
  )
`;

const moneyColumns = `cash_total::text as cash_total, goods_total::text as goods_total,
  waqf_total::text as waqf_total, kafalah_total::text as kafalah_total,
  grand_total::text as grand_total, this_year_total::text as this_year_total`;

export async function listDonors(context: RequestContext, query: DonorListQuery) {
  requirePermission(context, "donors.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const add = (value: unknown) => `$${values.push(value)}`;
    const filters: string[] = [];
    if (query.q) {
      const like = add(`%${query.q}%`);
      const digits = query.q.replace(/\D/g, "");
      filters.push(
        `(display_name ilike ${like} or primary_email ilike ${like} or city ilike ${like}${
          digits.length >= 4 ? ` or normalized_phone like ${add(`%${normalizePhone(digits)}%`)}` : ""
        })`,
      );
    }
    if (query.giving_type === "cash") filters.push("cash_total > 0");
    if (query.giving_type === "in_kind") filters.push("goods_total > 0");
    if (query.giving_type === "waqf") filters.push("(waqf_total > 0 or donated_waqf_asset)");
    if (query.giving_type === "kafalah") filters.push("kafalah_total > 0");
    if (query.segment === "unprofiled") filters.push("profile_id is null");
    else if (query.segment) filters.push(`segment = ${add(query.segment)}`);
    if (query.engagement) filters.push(`engagement = ${add(query.engagement)}`);
    if (query.manager) {
      filters.push(`relationship_manager_id = ${add(query.manager === "me" ? context.profileId : query.manager)}`);
    }
    if (query.follow_up === "due") filters.push("next_follow_up_at <= now() + interval '1 day'");
    if (query.follow_up === "open") filters.push("open_follow_ups > 0");
    if (query.recurring === "yes") filters.push("recurring_frequency in ('monthly','quarterly','yearly')");
    const where = filters.length ? `where ${filters.join(" and ")}` : "";
    const order = {
      // Kolom dikualifikasi agar mengurutkan nilai numerik, bukan alias teks.
      name: "donors.display_name",
      recent: "donors.last_gift_at desc nulls last, donors.display_name",
      total: "donors.grand_total desc, donors.last_gift_at desc nulls last, donors.display_name",
    }[query.sort];
    const limit = add(query.pageSize);
    const offset = add((query.page - 1) * query.pageSize);
    const result = await client.query<Row & { total_count: number }>(
      `with ${givingCte}
       select id, display_name, contact_type, primary_phone, whatsapp_phone, primary_email, city,
              profile_id, segment, preferred_channel, recurring_amount, recurring_frequency,
              relationship_manager_id, manager_name, donor_status, ${moneyColumns},
              gift_count, first_gift_at, last_gift_at, engagement, donated_waqf_asset,
              next_follow_up_at, open_follow_ups, count(*) over()::int as total_count
       from donors ${where}
       order by ${order}
       limit ${limit} offset ${offset}`,
      values,
    );
    return {
      data: result.rows.map((row) => {
        const copy: Record<string, unknown> = { ...row };
        delete copy.total_count;
        return copy;
      }),
      page: query.page,
      pageSize: query.pageSize,
      total: result.rows[0]?.total_count ?? 0,
    };
  });
}

export async function getDonorSummary(context: RequestContext) {
  requirePermission(context, "donors.read");
  return withTenantTransaction(context, async (_database, client) => {
    const summary = (
      await client.query<Row>(
        `with ${givingCte}
         select count(*)::int as total,
                count(*) filter (where engagement = 'active')::int as active,
                count(*) filter (where engagement = 'cooling')::int as cooling,
                count(*) filter (where engagement = 'lapsed')::int as lapsed,
                count(*) filter (where engagement = 'never')::int as never,
                count(*) filter (where recurring_frequency in ('monthly','quarterly','yearly'))::int as recurring,
                count(*) filter (where first_gift_at >= date_trunc('year', now()))::int as new_this_year,
                count(*) filter (where waqf_total > 0 or donated_waqf_asset)::int as wakif,
                count(*) filter (where next_follow_up_at <= now() + interval '1 day')::int as follow_ups_due,
                coalesce(sum(this_year_total), 0)::text as this_year_total
         from donors`,
        [context.organizationId],
      )
    ).rows[0];
    const followUps = context.permissions.has("crm_interactions.read")
      ? (
          await client.query<Row>(
            `select interaction.id, interaction.contact_id, contact.display_name,
                    interaction.follow_up_at, interaction.follow_up_note, interaction.summary,
                    interaction.interaction_type, assignee.display_name as assignee_name
             from public.crm_interactions interaction
             join public.crm_contacts contact
               on contact.id = interaction.contact_id and contact.organization_id = interaction.organization_id
             left join public.profiles assignee on assignee.id = interaction.follow_up_assigned_to
             where interaction.organization_id = $1 and interaction.follow_up_status = 'open'
             order by interaction.follow_up_at nulls last
             limit 20`,
            [context.organizationId],
          )
        ).rows
      : [];
    return { ...summary, followUps };
  });
}

async function rows(client: PoolClient, sql: string, values: unknown[]) {
  return (await client.query<Row>(sql, values)).rows;
}

export async function getDonor(context: RequestContext, contactId: string) {
  requirePermission(context, "donors.read");
  return withTenantTransaction(context, async (_database, client) => {
    const org = context.organizationId;
    const values = [org, contactId];
    const donor = (
      await client.query<Row>(
        `with ${givingCte}
         select id, ${moneyColumns}, gift_count, first_gift_at, last_gift_at, engagement,
                donated_waqf_asset, next_follow_up_at, open_follow_ups
         from donors where id = $2`,
        values,
      )
    ).rows[0];
    const contact = (
      await client.query<Row>(
        `select contact.*,
                coalesce((select array_agg(role.role_type order by role.role_type)
                          from public.crm_contact_roles role
                          where role.contact_id = contact.id and role.organization_id = contact.organization_id
                            and role.status = 'active'), '{}') as roles
         from public.crm_contacts contact where contact.id = $2 and contact.organization_id = $1`,
        values,
      )
    ).rows[0] ?? missing("Donatur tidak ditemukan.");
    const profile =
      (
        await client.query<Row>(
          `select profile.*, profile.recurring_amount::text as recurring_amount,
                  manager.display_name as manager_name
           from public.crm_donor_profiles profile
           left join public.profiles manager on manager.id = profile.relationship_manager_id
           where profile.contact_id = $2 and profile.organization_id = $1`,
          values,
        )
      ).rows[0] ?? null;

    const [yearly, timeline, commitments, sponsorships, waqfAssets, programs] = await Promise.all([
      rows(
        client,
        `with ${givingCte}
         select extract(year from gift_at)::int as year, kind, sum(amount)::text as amount, count(*)::int as gifts
         from giving where contact_id = $2
         group by 1, 2 order by 1 desc, 2`,
        values,
      ),
      rows(
        client,
        `select * from (
           select receipt.id, 'cash' as kind, receipt.reference_number, receipt.amount::text as amount,
                  receipt.received_at as gift_at, receipt.status,
                  coalesce(program.name, restriction.name) as purpose, receipt.payment_method as detail,
                  '/funds' as href
           from public.fund_receipts receipt
           join public.fund_restrictions restriction
             on restriction.id = receipt.restriction_id and restriction.organization_id = receipt.organization_id
           left join public.programs program
             on program.id = restriction.program_id and program.organization_id = restriction.organization_id
           where receipt.organization_id = $1 and receipt.donor_contact_id = $2
           union all
           select donation.id, 'in_kind', donation.reference_number, donation.estimated_total_value::text,
                  donation.received_at, donation.status, program.name,
                  (select string_agg(product.name || ' × ' || trim(to_char(item.quantity, 'FM999999990.####')) || ' ' || item.unit, ', ')
                   from public.in_kind_donation_items item
                   join public.inventory_products product
                     on product.id = item.product_id and product.organization_id = item.organization_id
                   where item.donation_id = donation.id and item.organization_id = donation.organization_id),
                  '/in-kind-donations/' || donation.id
           from public.in_kind_donations donation
           left join public.programs program
             on program.id = donation.program_id and program.organization_id = donation.organization_id
           where donation.organization_id = $1 and donation.donor_contact_id = $2
           union all
           select contribution.id, 'waqf', contribution.reference_number, contribution.amount::text,
                  contribution.received_at, contribution.status, asset.name,
                  concat_ws(' · ', contribution.contribution_form, contribution.certificate_number,
                            case when contribution.on_behalf_of is not null then 'atas nama ' || contribution.on_behalf_of end),
                  '/waqf/assets/' || asset.id
           from public.waqf_contributions contribution
           join public.waqf_assets asset
             on asset.id = contribution.asset_id and asset.organization_id = contribution.organization_id
           where contribution.organization_id = $1 and contribution.wakif_contact_id = $2
           union all
           select payment.id, 'kafalah', payment.payment_reference, payment.amount::text,
                  payment.paid_at, payment.status, contract.reference_number, payment.channel, '/kafalah'
           from public.kafalah_payments payment
           join public.kafalah_schedules schedule
             on schedule.id = payment.schedule_id and schedule.organization_id = payment.organization_id
           join public.kafalah_contracts contract
             on contract.id = schedule.contract_id and contract.organization_id = schedule.organization_id
           join public.kafalah_matches match
             on match.id = contract.match_id and match.organization_id = contract.organization_id
           where payment.organization_id = $1 and match.sponsor_contact_id = $2
         ) gifts
         order by gift_at desc
         limit 100`,
        values,
      ),
      rows(
        client,
        `select commitment.id, commitment.reference_number, commitment.amount::text as amount,
                commitment.currency, commitment.committed_at, commitment.expected_at, commitment.status,
                commitment.notes, restriction.name as restriction_name,
                coalesce((select sum(receipt.amount) from public.fund_receipts receipt
                          where receipt.commitment_id = commitment.id and receipt.organization_id = commitment.organization_id
                            and receipt.status = 'posted'), 0)::text as received_amount
         from public.fund_commitments commitment
         join public.fund_restrictions restriction
           on restriction.id = commitment.restriction_id and restriction.organization_id = commitment.organization_id
         where commitment.organization_id = $1 and commitment.donor_contact_id = $2
         order by commitment.committed_at desc`,
        values,
      ),
      rows(
        client,
        `select match.id, match.reference_number, match.matched_amount::text as matched_amount,
                match.start_date, match.end_date, match.status
         from public.kafalah_matches match
         where match.organization_id = $1 and match.sponsor_contact_id = $2
         order by match.start_date desc`,
        values,
      ),
      rows(
        client,
        `select asset.id, asset.reference_number, asset.name, asset.asset_type,
                asset.operational_status, asset.acquisition_value::text as acquisition_value
         from public.waqf_assets asset
         where asset.organization_id = $1
           and (asset.donor_contact_id = $2 or exists (
             select 1 from public.waqf_contributions contribution
             where contribution.asset_id = asset.id and contribution.organization_id = asset.organization_id
               and contribution.wakif_contact_id = $2 and contribution.status = 'received'))
         order by asset.name`,
        values,
      ),
      rows(
        client,
        `select distinct program.id, program.name, program.status
         from public.programs program
         where program.organization_id = $1 and program.id in (
           select restriction.program_id
           from public.fund_receipts receipt
           join public.fund_restrictions restriction
             on restriction.id = receipt.restriction_id and restriction.organization_id = receipt.organization_id
           where receipt.organization_id = $1 and receipt.donor_contact_id = $2 and receipt.status = 'posted'
           union
           select donation.program_id from public.in_kind_donations donation
           where donation.organization_id = $1 and donation.donor_contact_id = $2
         )
         order by program.name`,
        values,
      ),
    ]);

    const interactions = context.permissions.has("crm_interactions.read")
      ? await rows(
          client,
          `select interaction.id, interaction.interaction_type, interaction.direction,
                  interaction.occurred_at, interaction.summary, interaction.follow_up_at,
                  interaction.follow_up_note, interaction.follow_up_status, interaction.follow_up_done_at,
                  author.display_name as author_name, assignee.display_name as assignee_name
           from public.crm_interactions interaction
           left join public.profiles author on author.id = interaction.created_by
           left join public.profiles assignee on assignee.id = interaction.follow_up_assigned_to
           where interaction.organization_id = $1 and interaction.contact_id = $2
           order by coalesce(interaction.occurred_at, interaction.created_at) desc
           limit 50`,
          values,
        )
      : [];
    const consents = context.permissions.has("crm_consents.read")
      ? await rows(
          client,
          `select id, consent_type, channel, status, consented_at, withdrawn_at, expires_at
           from public.crm_consents
           where organization_id = $1 and contact_id = $2
           order by created_at desc`,
          values,
        )
      : [];

    return {
      commitments,
      consents,
      contact,
      interactions,
      permissions: {
        canManage: context.permissions.has("donors.manage"),
        canManageInteractions: context.permissions.has("crm_interactions.manage"),
      },
      profile,
      programs,
      sponsorships,
      timeline,
      totals: donor ?? {
        cash_total: "0",
        engagement: "never",
        gift_count: 0,
        goods_total: "0",
        grand_total: "0",
        kafalah_total: "0",
        this_year_total: "0",
        waqf_total: "0",
      },
      waqfAssets,
      yearly,
    };
  });
}

function contactValues(input: DonorContactInput) {
  return [
    input.contact_type,
    input.display_name,
    normalizeText(input.display_name),
    input.primary_email ?? null,
    input.primary_email ? normalizeText(input.primary_email) : null,
    input.primary_phone ?? null,
    input.primary_phone ? normalizePhone(input.primary_phone) : null,
    input.whatsapp_phone ?? null,
    input.contact_type === "person" ? (input.gender ?? null) : null,
    input.birth_date ?? null,
    input.address_line ?? null,
    input.city ?? null,
    input.province ?? null,
  ];
}

const profileColumns = [
  "segment",
  "acquisition_source",
  "preferred_channel",
  "giving_interests",
  "recurring_amount",
  "recurring_frequency",
  "recurring_day",
  "receipt_preference",
  "report_preference",
  "publish_name",
  "relationship_manager_id",
  "notes",
  "status",
] as const;

function profileValues(input: DonorProfileInput) {
  const recurring = input.recurring_frequency !== "none";
  return [
    input.segment,
    input.acquisition_source ?? null,
    input.preferred_channel,
    input.giving_interests,
    recurring ? (input.recurring_amount ?? null) : null,
    input.recurring_frequency,
    recurring ? (input.recurring_day ?? null) : null,
    input.receipt_preference,
    input.report_preference,
    input.publish_name,
    input.relationship_manager_id ?? null,
    input.notes ?? null,
    input.status,
  ];
}

async function assertManager(client: PoolClient, context: RequestContext, profileId: string | null | undefined) {
  if (!profileId) return;
  const member = await client.query(
    `select 1 from public.memberships where organization_id = $1 and profile_id = $2 and status = 'active'`,
    [context.organizationId, profileId],
  );
  if (!member.rows[0]) {
    throw new DomainError("VALIDATION_ERROR", "PIC harus anggota aktif organisasi.", 400);
  }
}

async function upsertProfile(
  client: PoolClient,
  context: RequestContext,
  contactId: string,
  input: DonorProfileInput,
) {
  await client.query(
    `insert into public.crm_donor_profiles (
       ${profileColumns.join(", ")}, organization_id, contact_id, created_by, updated_by
     ) values (${profileColumns.map((_, index) => `$${index + 1}`).join(", ")},
       $${profileColumns.length + 1}, $${profileColumns.length + 2}, $${profileColumns.length + 3}, $${profileColumns.length + 3})
     on conflict (contact_id, organization_id) do update set
       ${profileColumns.map((column) => `${column} = excluded.${column}`).join(", ")},
       updated_by = excluded.updated_by`,
    [...profileValues(input), context.organizationId, contactId, context.profileId],
  );
  await client.query(
    `insert into public.crm_contact_roles (organization_id, contact_id, role_type, status, created_by)
     values ($1, $2, 'donor', 'active', $3)
     on conflict (organization_id, contact_id, role_type) do update set status = 'active', updated_at = now()`,
    [context.organizationId, contactId, context.profileId],
  );
}

export async function createDonor(context: RequestContext, input: CreateDonorInput) {
  requirePermission(context, "donors.manage");
  requirePermission(context, "crm_contact_roles.manage");
  if (input.contact && !input.contact_id) requirePermission(context, "crm_contacts.manage");
  return withTenantTransaction(context, async (database, client) => {
    await assertManager(client, context, input.profile.relationship_manager_id);
    let contactId = input.contact_id ?? null;
    if (contactId) {
      const exists = await client.query(
        `select 1 from public.crm_contacts where id = $1 and organization_id = $2`,
        [contactId, context.organizationId],
      );
      if (!exists.rows[0]) missing("Kontak tidak ditemukan.");
      const already = await client.query(
        `select 1 from public.crm_donor_profiles where contact_id = $1 and organization_id = $2`,
        [contactId, context.organizationId],
      );
      if (already.rows[0]) {
        throw new DomainError("CONFLICT", "Kontak ini sudah terdaftar sebagai donatur.", 409);
      }
    } else if (input.contact) {
      const created = await client.query<{ id: string }>(
        `insert into public.crm_contacts (
           contact_type, display_name, normalized_name, primary_email, normalized_email,
           primary_phone, normalized_phone, whatsapp_phone, gender, birth_date,
           address_line, city, province, organization_id, status, created_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',$15)
         returning id`,
        [...contactValues(input.contact), context.organizationId, context.profileId],
      );
      contactId = created.rows[0]?.id ?? missing("Kontak donatur gagal dibuat.");
    }
    await upsertProfile(client, context, contactId!, input.profile);
    await insertAuditEvent(database, context, {
      action: "donor.created",
      after: input,
      entityId: contactId!,
      entityType: "crm_donor_profile",
    });
    return { id: contactId };
  });
}

export async function updateDonor(context: RequestContext, contactId: string, input: UpdateDonorInput) {
  requirePermission(context, "donors.manage");
  if (input.contact) requirePermission(context, "crm_contacts.manage");
  return withTenantTransaction(context, async (database, client) => {
    const before = (
      await client.query<Row>(
        `select * from public.crm_donor_profiles where contact_id = $1 and organization_id = $2`,
        [contactId, context.organizationId],
      )
    ).rows[0];
    await assertManager(client, context, input.profile.relationship_manager_id);
    if (input.contact) {
      const updated = await client.query(
        `update public.crm_contacts set
           contact_type = $1, display_name = $2, normalized_name = $3, primary_email = $4,
           normalized_email = $5, primary_phone = $6, normalized_phone = $7, whatsapp_phone = $8,
           gender = $9, birth_date = $10, address_line = $11, city = $12, province = $13,
           updated_at = now()
         where id = $14 and organization_id = $15 returning id`,
        [...contactValues(input.contact), contactId, context.organizationId],
      );
      if (!updated.rows[0]) missing("Donatur tidak ditemukan.");
    }
    await upsertProfile(client, context, contactId, input.profile);
    await insertAuditEvent(database, context, {
      action: "donor.updated",
      after: input,
      before,
      entityId: contactId,
      entityType: "crm_donor_profile",
    });
    return { id: contactId };
  });
}

export async function addDonorInteraction(
  context: RequestContext,
  contactId: string,
  input: DonorInteractionInput,
) {
  requirePermission(context, "crm_interactions.manage");
  return withTenantTransaction(context, async (database, client) => {
    const exists = await client.query(
      `select 1 from public.crm_contacts where id = $1 and organization_id = $2`,
      [contactId, context.organizationId],
    );
    if (!exists.rows[0]) missing("Donatur tidak ditemukan.");
    await assertManager(client, context, input.follow_up_assigned_to);
    const created = await client.query<Row>(
      `insert into public.crm_interactions (
         organization_id, contact_id, interaction_type, direction, occurred_at, summary,
         follow_up_note, follow_up_at, follow_up_status, follow_up_assigned_to, created_by
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       returning id`,
      [
        context.organizationId,
        contactId,
        input.interaction_type,
        input.direction,
        input.occurred_at ?? new Date().toISOString(),
        input.summary,
        input.follow_up_note ?? null,
        input.follow_up_at ?? null,
        input.follow_up_at ? "open" : "none",
        input.follow_up_at ? (input.follow_up_assigned_to ?? context.profileId) : null,
        context.profileId,
      ],
    );
    const id = created.rows[0]?.id ?? missing("Interaksi gagal disimpan.");
    await insertAuditEvent(database, context, {
      action: "donor.interaction_logged",
      after: input,
      entityId: id,
      entityType: "crm_interaction",
    });
    return { id };
  });
}

export async function completeDonorFollowUp(
  context: RequestContext,
  contactId: string,
  interactionId: string,
  note: string | undefined,
) {
  requirePermission(context, "crm_interactions.manage");
  return withTenantTransaction(context, async (database, client) => {
    const updated = await client.query<Row>(
      `update public.crm_interactions
       set follow_up_status = 'done', follow_up_done_at = now(),
           follow_up_note = case when $1::text is null then follow_up_note
                                 else concat_ws(' — ', follow_up_note, 'Selesai: ' || $1::text) end,
           updated_at = now()
       where id = $2 and contact_id = $3 and organization_id = $4 and follow_up_status = 'open'
       returning id`,
      [note ?? null, interactionId, contactId, context.organizationId],
    );
    if (!updated.rows[0]) missing("Tindak lanjut tidak ditemukan atau sudah selesai.");
    await insertAuditEvent(database, context, {
      action: "donor.follow_up_completed",
      after: { note },
      entityId: interactionId,
      entityType: "crm_interaction",
    });
    return { id: interactionId, status: "done" };
  });
}
