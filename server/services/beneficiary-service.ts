import { createHash } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type {
  BeneficiaryListQuery,
  CreateBeneficiaryInput,
  UpdateBeneficiaryInput,
} from "../routes/beneficiary-schemas";
import type { RequestContext } from "../types";
import { createApplication } from "./application-case-service";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown>;

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.startsWith("62") ? `0${digits.slice(2)}` : digits;
}

/** Hash per organisasi agar NIK yang sama terdeteksi tanpa menyimpan plaintext. */
export function identityHash(
  organizationId: string,
  identityType: string,
  identityNumber: string,
) {
  const normalized = identityNumber.replace(/\s+/g, "").toUpperCase();
  return `sha256:${createHash("sha256")
    .update(`${organizationId}:${identityType}:${normalized}`)
    .digest("hex")}`;
}

export function maskAccountNumber(value: unknown) {
  const text = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return text ? `•••• ${text.slice(-4)}` : null;
}

const completenessFields = [
  "primary_phone",
  "address_line",
  "city",
  "birth_date",
  "gender",
  "beneficiary_type",
  "vulnerability_level",
  "household_size",
  "income_range",
  "occupation",
  "education_level",
  "housing_status",
  "marital_status",
  "identity_last4",
] as const;

/** Persentase kelengkapan profil (0–100) untuk memandu petugas melengkapi data. */
export function profileCompleteness(row: Row) {
  const filled = completenessFields.filter((field) => {
    const value = row[field];
    return (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      value !== "unknown" &&
      value !== "not_assessed"
    );
  }).length;
  return Math.round((filled / completenessFields.length) * 100);
}

const appearancesCte = `
  appearances as (
    select c.beneficiary_contact_id as contact_id, c.program_id, 'program'::text as source,
           0::numeric as cash, 0::numeric as waqf, 0::int as packages,
           coalesce(c.opened_at, c.created_at) as occurred_at
    from public.beneficiary_cases c where c.organization_id = $1
    union all
    select d.beneficiary_contact_id, d.program_id, 'program',
           case when d.status = 'completed' then d.amount else 0 end, 0, 0,
           coalesce(d.completed_at, d.planned_at)
    from public.distribution_plans d
    where d.organization_id = $1 and d.status <> 'cancelled'
    union all
    select f.beneficiary_contact_id, f.program_id, 'program', 0, 0, f.package_count, f.created_at
    from public.program_beneficiary_fulfillments f
    where f.organization_id = $1 and f.status = 'active'
    union all
    select b.beneficiary_contact_id, b.program_id, 'waqf', 0, b.amount, 0, b.distributed_at
    from public.waqf_benefit_distributions b
    where b.organization_id = $1 and b.status = 'completed' and b.beneficiary_contact_id is not null
    union all
    select u.beneficiary_contact_id, u.program_id, 'waqf', 0, 0, 0, u.start_date::timestamptz
    from public.waqf_utilizations u
    where u.organization_id = $1 and u.status <> 'cancelled' and u.beneficiary_contact_id is not null
    union all
    select k.beneficiary_contact_id, null::uuid, 'kafalah', 0, 0, 0, k.created_at
    from public.kafalah_needs k
    where k.organization_id = $1 and k.status <> 'cancelled'
  ),
  registered as (
    select contact_id from public.crm_contact_roles
    where organization_id = $1 and role_type = 'beneficiary' and status = 'active'
    union
    select contact_id from public.crm_beneficiary_profiles where organization_id = $1
  ),
  base as (
    select contact_id from registered
    union
    select contact_id from appearances where contact_id is not null
  ),
  stats as (
    select a.contact_id,
           coalesce(array_remove(array_agg(distinct program.name), null), '{}') as program_names,
           array_agg(distinct a.source) as sources,
           count(distinct a.program_id)::int as program_count,
           coalesce(sum(a.cash), 0)::text as cash_received,
           coalesce(sum(a.waqf), 0)::text as waqf_received,
           coalesce(sum(a.packages), 0)::int as packages_received,
           max(a.occurred_at) as last_aid_at
    from appearances a
    left join public.programs program
      on program.id = a.program_id and program.organization_id = $1
    group by a.contact_id
  )
`;

const baseFrom = `
  from base
  join public.crm_contacts contact
    on contact.id = base.contact_id and contact.organization_id = $1
  left join public.crm_beneficiary_profiles profile
    on profile.contact_id = contact.id and profile.organization_id = $1
  left join stats on stats.contact_id = contact.id
  left join lateral (
    select identity.identity_last4
    from public.crm_sensitive_identities identity
    where identity.contact_id = contact.id and identity.organization_id = $1
      and identity.identity_type = 'nik'
    order by identity.updated_at desc
    limit 1
  ) nik on true
`;

export async function listBeneficiaries(
  context: RequestContext,
  query: BeneficiaryListQuery,
) {
  requirePermission(context, "crm_beneficiary_profiles.read");
  requirePermission(context, "crm_contacts.read");

  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters: string[] = [];
    const add = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };

    if (query.q) {
      const like = add(`%${query.q}%`);
      const digits = query.q.replace(/\D/g, "");
      filters.push(
        `(contact.display_name ilike ${like} or contact.city ilike ${like} or contact.district ilike ${like}${
          digits.length >= 4
            ? ` or contact.normalized_phone like ${add(`%${normalizePhone(digits)}%`)} or nik.identity_last4 = ${add(digits.slice(-4))}`
            : ""
        })`,
      );
    }
    if (query.program_id) {
      filters.push(
        `exists (select 1 from appearances a where a.contact_id = contact.id and a.program_id = ${add(query.program_id)})`,
      );
    }
    if (query.source === "registered") {
      filters.push(`contact.id in (select contact_id from registered)`);
    } else if (query.source) {
      filters.push(`${add(query.source)} = any(stats.sources)`);
    }
    if (query.status) filters.push(`profile.status = ${add(query.status)}`);
    if (query.vulnerability) {
      filters.push(`profile.vulnerability_level = ${add(query.vulnerability)}`);
    }
    if (query.category) {
      filters.push(`${add(query.category)} = any(profile.beneficiary_categories)`);
    }

    const where = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
    const count = await client.query<{ total: number }>(
      `with ${appearancesCte} select count(*)::int as total ${baseFrom} ${where}`,
      values,
    );
    const limit = add(query.pageSize);
    const offset = add((query.page - 1) * query.pageSize);
    const rows = await client.query<Row>(
      `with ${appearancesCte}
       select contact.id, contact.display_name, contact.contact_type, contact.gender,
              contact.birth_date, contact.primary_phone, contact.address_line,
              contact.village, contact.district, contact.city, contact.province,
              contact.status as contact_status, contact.created_at,
              profile.id as profile_id, profile.beneficiary_type, profile.vulnerability_level,
              profile.household_size, profile.income_range, profile.assessment_status,
              profile.status as profile_status, profile.asnaf_category,
              profile.beneficiary_categories, profile.occupation, profile.education_level,
              profile.housing_status, profile.marital_status,
              nik.identity_last4,
              coalesce(stats.program_names, '{}') as program_names,
              coalesce(stats.sources, '{}') as sources,
              coalesce(stats.program_count, 0) as program_count,
              coalesce(stats.cash_received, '0') as cash_received,
              coalesce(stats.waqf_received, '0') as waqf_received,
              coalesce(stats.packages_received, 0) as packages_received,
              stats.last_aid_at
       ${baseFrom}
       ${where}
       order by coalesce(stats.last_aid_at, contact.created_at) desc, contact.display_name
       limit ${limit} offset ${offset}`,
      values,
    );

    return {
      data: rows.rows.map((row) => ({
        ...row,
        profile_completeness: profileCompleteness(row),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    };
  });
}

export async function getBeneficiarySummary(context: RequestContext) {
  requirePermission(context, "crm_beneficiary_profiles.read");
  requirePermission(context, "crm_contacts.read");

  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `with ${appearancesCte}
       select count(*)::int as total,
              count(profile.id)::int as with_profile,
              count(*) filter (where profile.vulnerability_level in ('high','critical'))::int as high_vulnerability,
              count(*) filter (where stats.contact_id is not null)::int as reached,
              count(*) filter (where 'waqf' = any(stats.sources))::int as waqf_beneficiaries,
              count(*) filter (where 'kafalah' = any(stats.sources))::int as kafalah_beneficiaries,
              count(*) filter (where stats.last_aid_at >= now() - interval '90 days')::int as served_90d
       ${baseFrom}`,
      [context.organizationId],
    );
    return result.rows[0] ?? {};
  });
}

export async function getBeneficiary(context: RequestContext, id: string) {
  requirePermission(context, "crm_beneficiary_profiles.read");
  requirePermission(context, "crm_contacts.read");
  const canReadSensitive = context.permissions.has(
    "crm_sensitive_identities.read",
  );

  return withTenantTransaction(context, async (_database, client) => {
    const org = context.organizationId;
    const contactResult = await client.query<Row>(
      `select contact.*,
              coalesce((select array_agg(role.role_type order by role.role_type)
                        from public.crm_contact_roles role
                        where role.contact_id = contact.id and role.organization_id = contact.organization_id
                          and role.status = 'active'), '{}') as roles
       from public.crm_contacts contact
       where contact.id = $1 and contact.organization_id = $2`,
      [id, org],
    );
    const contact =
      contactResult.rows[0] ?? missing("Penerima manfaat tidak ditemukan.");

    const query = (sql: string) =>
      client.query<Row>(sql, [id, org]).then((result) => result.rows);

    const [
      profiles,
      identities,
      applications,
      cases,
      distributions,
      fulfillments,
      waqfBenefits,
      waqfUtilizations,
      kafalah,
    ] = await Promise.all([
      query(
        `select profile.*, partner.display_name as referral_partner_name
         from public.crm_beneficiary_profiles profile
         left join public.crm_contacts partner
           on partner.id = profile.referral_partner_contact_id and partner.organization_id = profile.organization_id
         where profile.contact_id = $1 and profile.organization_id = $2`,
      ),
      canReadSensitive
        ? query(
            `select identity_type, identity_last4, verification_status, updated_at
             from public.crm_sensitive_identities
             where contact_id = $1 and organization_id = $2
             order by identity_type`,
          )
        : Promise.resolve([] as Row[]),
      query(
        `select application.id, application.reference_number, application.status,
                application.urgency, application.created_at, application.submitter_type,
                program.name as program_name, partner.display_name as partner_name
         from public.aid_applications application
         join public.programs program
           on program.id = application.program_id and program.organization_id = application.organization_id
         left join public.crm_contacts partner
           on partner.id = application.submitting_partner_contact_id and partner.organization_id = application.organization_id
         where application.applicant_contact_id = $1 and application.organization_id = $2
         order by application.created_at desc`,
      ),
      query(
        `select beneficiary_case.id, beneficiary_case.reference_number, beneficiary_case.status,
                beneficiary_case.opened_at, program.name as program_name
         from public.beneficiary_cases beneficiary_case
         join public.programs program
           on program.id = beneficiary_case.program_id and program.organization_id = beneficiary_case.organization_id
         where beneficiary_case.beneficiary_contact_id = $1 and beneficiary_case.organization_id = $2
         order by beneficiary_case.opened_at desc`,
      ),
      query(
        `select plan.id, plan.reference_number, plan.status, plan.amount::text as amount,
                plan.currency, plan.distribution_method, plan.planned_at, plan.completed_at,
                program.name as program_name
         from public.distribution_plans plan
         join public.programs program
           on program.id = plan.program_id and program.organization_id = plan.organization_id
         where plan.beneficiary_contact_id = $1 and plan.organization_id = $2
         order by coalesce(plan.completed_at, plan.planned_at) desc`,
      ),
      query(
        `select fulfillment.id, fulfillment.package_count, fulfillment.status,
                fulfillment.created_at, program.name as program_name,
                packing.reference_number as packing_reference,
                partner.display_name as partner_name
         from public.program_beneficiary_fulfillments fulfillment
         join public.programs program
           on program.id = fulfillment.program_id and program.organization_id = fulfillment.organization_id
         left join public.aid_package_packings packing
           on packing.id = fulfillment.packing_id and packing.organization_id = fulfillment.organization_id
         left join public.crm_contacts partner
           on partner.id = fulfillment.partner_contact_id and partner.organization_id = fulfillment.organization_id
         where fulfillment.beneficiary_contact_id = $1 and fulfillment.organization_id = $2
         order by fulfillment.created_at desc`,
      ),
      query(
        `select benefit.id, benefit.distribution_reference, benefit.amount::text as amount,
                benefit.currency, benefit.benefit_type, benefit.distributed_at,
                asset.id as asset_id, asset.name as asset_name
         from public.waqf_benefit_distributions benefit
         join public.waqf_assets asset
           on asset.id = benefit.asset_id and asset.organization_id = benefit.organization_id
         where benefit.beneficiary_contact_id = $1 and benefit.organization_id = $2
           and benefit.status = 'completed'
         order by benefit.distributed_at desc`,
      ),
      query(
        `select utilization.id, utilization.utilization_type, utilization.status,
                utilization.start_date, utilization.expected_benefit,
                asset.id as asset_id, asset.name as asset_name
         from public.waqf_utilizations utilization
         join public.waqf_assets asset
           on asset.id = utilization.asset_id and asset.organization_id = utilization.organization_id
         where utilization.beneficiary_contact_id = $1 and utilization.organization_id = $2
         order by utilization.start_date desc`,
      ),
      query(
        `select need.id, need.reference_number, need.title, need.need_type, need.status,
                need.approved_amount::text as approved_amount, need.currency, need.created_at
         from public.kafalah_needs need
         where need.beneficiary_contact_id = $1 and need.organization_id = $2
         order by need.created_at desc`,
      ),
    ]);

    const profile = profiles[0]
      ? {
          ...profiles[0],
          bank_account_number: canReadSensitive
            ? profiles[0].bank_account_number
            : maskAccountNumber(profiles[0].bank_account_number),
        }
      : null;
    const nik = identities.find((item) => item.identity_type === "nik");
    const sum = (list: Row[], field: string, onlyStatus?: string) =>
      list
        .filter((row) => !onlyStatus || row.status === onlyStatus)
        .reduce((total, row) => total + Number(row[field] ?? 0), 0)
        .toFixed(2);

    return {
      applications,
      cases,
      contact,
      distributions,
      fulfillments,
      identities,
      kafalah,
      profile,
      profile_completeness: profileCompleteness({
        ...contact,
        ...(profile ?? {}),
        identity_last4: nik?.identity_last4 ?? null,
      }),
      sensitive_visible: canReadSensitive,
      totals: {
        cash_received: sum(distributions, "amount", "completed"),
        packages_received: fulfillments
          .filter((row) => row.status === "active")
          .reduce((total, row) => total + Number(row.package_count ?? 0), 0),
        program_count: new Set(
          [...cases, ...distributions, ...fulfillments].map(
            (row) => row.program_name,
          ),
        ).size,
        waqf_received: sum(waqfBenefits, "amount"),
      },
      waqf_benefits: waqfBenefits,
      waqf_utilizations: waqfUtilizations,
    };
  });
}

async function assertIdentitiesAvailable(
  client: PoolClient,
  context: RequestContext,
  identities: UpdateBeneficiaryInput["identities"],
  contactId: string | null,
) {
  for (const identity of identities) {
    const duplicate = await client.query<{ display_name: string }>(
      `select contact.display_name
       from public.crm_sensitive_identities identity
       join public.crm_contacts contact
         on contact.id = identity.contact_id and contact.organization_id = identity.organization_id
       where identity.organization_id = $1 and identity.identity_type = $2
         and identity.identity_hash = $3
         and ($4::uuid is null or identity.contact_id <> $4::uuid)
       limit 1`,
      [
        context.organizationId,
        identity.identity_type,
        identityHash(
          context.organizationId,
          identity.identity_type,
          identity.identity_number,
        ),
        contactId,
      ],
    );
    if (duplicate.rows[0]) {
      throw new DomainError(
        "CONFLICT",
        `Nomor ${identity.identity_type === "nik" ? "NIK" : "identitas"} tersebut sudah terdaftar atas nama ${duplicate.rows[0].display_name}. Buka data penerima yang ada daripada membuat baru.`,
        409,
      );
    }
  }
}

async function saveIdentities(
  client: PoolClient,
  context: RequestContext,
  contactId: string,
  identities: UpdateBeneficiaryInput["identities"],
) {
  for (const identity of identities) {
    const hash = identityHash(
      context.organizationId,
      identity.identity_type,
      identity.identity_number,
    );
    const last4 = identity.identity_number.slice(-4);
    const updated = await client.query(
      `update public.crm_sensitive_identities
       set identity_hash = $1, identity_last4 = $2,
           identity_ciphertext_ref = 'not-retained:hash-only',
           verification_status = 'unverified', verified_at = null, verified_by = null,
           updated_at = now()
       where organization_id = $3 and contact_id = $4 and identity_type = $5
       returning id`,
      [hash, last4, context.organizationId, contactId, identity.identity_type],
    );
    if (!updated.rows[0]) {
      await client.query(
        `insert into public.crm_sensitive_identities (
           organization_id, contact_id, identity_type, identity_ciphertext_ref,
           identity_last4, identity_hash, created_by
         ) values ($1, $2, $3, 'not-retained:hash-only', $4, $5, $6)`,
        [
          context.organizationId,
          contactId,
          identity.identity_type,
          last4,
          hash,
          context.profileId,
        ],
      );
    }
  }
}

function profileValues(input: UpdateBeneficiaryInput) {
  return [
    input.beneficiary_type,
    input.vulnerability_level,
    input.household_size ?? null,
    input.income_range,
    input.assessment_status,
    input.status,
    input.eligibility_notes ?? null,
    input.birth_place ?? null,
    input.marital_status ?? null,
    input.education_level ?? null,
    input.occupation ?? null,
    input.monthly_income ?? null,
    input.dependents_count ?? null,
    input.housing_status ?? null,
    input.disability_status ?? null,
    input.health_notes ?? null,
    input.asnaf_category ?? null,
    input.beneficiary_categories,
    input.guardian_name ?? null,
    input.guardian_relation ?? null,
    input.guardian_phone ?? null,
    input.emergency_contact_name ?? null,
    input.emergency_contact_phone ?? null,
    input.bank_name ?? null,
    input.bank_account_number ?? null,
    input.bank_account_holder ?? null,
    input.referral_partner_contact_id ?? null,
  ];
}

const profileColumns = `beneficiary_type, vulnerability_level, household_size, income_range,
  assessment_status, status, eligibility_notes, birth_place, marital_status,
  education_level, occupation, monthly_income, dependents_count, housing_status,
  disability_status, health_notes, asnaf_category, beneficiary_categories,
  guardian_name, guardian_relation, guardian_phone, emergency_contact_name,
  emergency_contact_phone, bank_name, bank_account_number, bank_account_holder,
  referral_partner_contact_id`;

function contactValues(input: UpdateBeneficiaryInput) {
  return [
    input.contact_type,
    input.display_name,
    normalizeText(input.display_name),
    input.primary_email ?? null,
    normalizeText(input.primary_email),
    input.primary_phone ?? null,
    normalizePhone(input.primary_phone),
    input.whatsapp_phone ?? null,
    input.gender,
    input.birth_date ?? null,
    input.address_line ?? null,
    input.village ?? null,
    input.district ?? null,
    input.city ?? null,
    input.province ?? null,
    input.postal_code ?? null,
  ];
}

async function ensureReferralPartner(
  client: PoolClient,
  context: RequestContext,
  partnerId: string | null | undefined,
) {
  if (!partnerId) return;
  const partner = await client.query(
    `select 1 from public.crm_contacts
     where id = $1 and organization_id = $2 and status = 'active'`,
    [partnerId, context.organizationId],
  );
  if (!partner.rows[0]) missing("Lembaga pendamping tidak ditemukan.");
}

/**
 * Menambah penerima manfaat dalam satu langkah: kontak, peran penerima,
 * profil lengkap, identitas (hash), dan opsional pendaftaran ke program.
 */
export async function createBeneficiary(
  context: RequestContext,
  input: CreateBeneficiaryInput,
) {
  requirePermission(context, "crm_contacts.manage");
  requirePermission(context, "crm_contact_roles.manage");
  requirePermission(context, "crm_beneficiary_profiles.manage");
  if (input.identities.length > 0) {
    requirePermission(context, "crm_sensitive_identities.manage");
  }
  if (input.enrollment) {
    requirePermission(context, "applications.manage");
  }

  const created = await withTenantTransaction(
    context,
    async (database, client) => {
      await assertIdentitiesAvailable(client, context, input.identities, null);
      await ensureReferralPartner(
        client,
        context,
        input.referral_partner_contact_id,
      );

      const contact = await client.query<Row & { id: string }>(
        `insert into public.crm_contacts (
           contact_type, display_name, normalized_name, primary_email, normalized_email,
           primary_phone, normalized_phone, whatsapp_phone, gender, birth_date,
           address_line, village, district, city, province, postal_code,
           organization_id, status, created_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'active',$18)
         returning *`,
        [...contactValues(input), context.organizationId, context.profileId],
      );
      const contactId =
        contact.rows[0]?.id ?? missing("Kontak penerima gagal dibuat.");

      await client.query(
        `insert into public.crm_contact_roles (organization_id, contact_id, role_type, status, created_by)
         values ($1, $2, 'beneficiary', 'active', $3)
         on conflict (organization_id, contact_id, role_type) do update set status = 'active', updated_at = now()`,
        [context.organizationId, contactId, context.profileId],
      );

      const profile = await client.query<Row>(
        `insert into public.crm_beneficiary_profiles (
           ${profileColumns}, registration_source, organization_id, contact_id, created_by, updated_by
         ) values (${Array.from({ length: 27 }, (_, index) => `$${index + 1}`).join(",")}, $28, $29, $30, $31, $31)
         returning id`,
        [
          ...profileValues(input),
          input.registration_source,
          context.organizationId,
          contactId,
          context.profileId,
        ],
      );

      await saveIdentities(client, context, contactId, input.identities);

      await insertAuditEvent(database, context, {
        action: "beneficiary.created",
        after: {
          contact: contact.rows[0],
          identityTypes: input.identities.map((item) => item.identity_type),
          profileId: profile.rows[0]?.id,
        },
        entityId: contactId,
        entityType: "crm_contact",
      });

      return { contactId };
    },
  );

  let enrollment: { application_id?: string; error?: string } | null = null;
  if (input.enrollment) {
    try {
      const application = await createApplication(context, {
        applicant_contact_id: created.contactId,
        beneficiary_count: input.household_size ?? 1,
        channel: "field",
        program_id: input.enrollment.program_id,
        requested_support: input.enrollment.requested_support,
        submitter_type:
          input.contact_type === "institution" ? "institution" : "individual",
        urgency: input.vulnerability_level === "critical" ? "urgent" : "normal",
      });
      enrollment = { application_id: application.id };
    } catch (error) {
      enrollment = {
        error:
          error instanceof Error
            ? error.message
            : "Pendaftaran ke program gagal.",
      };
    }
  }

  return { enrollment, id: created.contactId };
}

export async function updateBeneficiary(
  context: RequestContext,
  id: string,
  input: UpdateBeneficiaryInput,
) {
  requirePermission(context, "crm_contacts.manage");
  requirePermission(context, "crm_contact_roles.manage");
  requirePermission(context, "crm_beneficiary_profiles.manage");
  if (input.identities.length > 0) {
    requirePermission(context, "crm_sensitive_identities.manage");
  }

  return withTenantTransaction(context, async (database, client) => {
    const before = await client.query<Row>(
      `select * from public.crm_contacts where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    if (!before.rows[0]) missing("Penerima manfaat tidak ditemukan.");

    await assertIdentitiesAvailable(client, context, input.identities, id);
    await ensureReferralPartner(client, context, input.referral_partner_contact_id);

    const contact = await client.query<Row>(
      `update public.crm_contacts set
         contact_type = $1, display_name = $2, normalized_name = $3, primary_email = $4,
         normalized_email = $5, primary_phone = $6, normalized_phone = $7,
         whatsapp_phone = $8, gender = $9, birth_date = $10, address_line = $11,
         village = $12, district = $13, city = $14, province = $15, postal_code = $16,
         updated_at = now()
       where id = $17 and organization_id = $18
       returning *`,
      [...contactValues(input), id, context.organizationId],
    );

    await client.query(
      `insert into public.crm_contact_roles (organization_id, contact_id, role_type, status, created_by)
       values ($1, $2, 'beneficiary', 'active', $3)
       on conflict (organization_id, contact_id, role_type) do update set status = 'active', updated_at = now()`,
      [context.organizationId, id, context.profileId],
    );

    const assignments = profileColumns
      .split(",")
      .map((column, index) => `${column.trim()} = $${index + 1}`)
      .join(", ");
    const updated = await client.query(
      `update public.crm_beneficiary_profiles
       set ${assignments}, updated_by = $28, updated_at = now()
       where contact_id = $29 and organization_id = $30
       returning id`,
      [...profileValues(input), context.profileId, id, context.organizationId],
    );
    if (!updated.rows[0]) {
      await client.query(
        `insert into public.crm_beneficiary_profiles (
           ${profileColumns}, registration_source, organization_id, contact_id, created_by, updated_by
         ) values (${Array.from({ length: 27 }, (_, index) => `$${index + 1}`).join(",")}, 'admin', $28, $29, $30, $30)`,
        [...profileValues(input), context.organizationId, id, context.profileId],
      );
    }

    await saveIdentities(client, context, id, input.identities);

    await insertAuditEvent(database, context, {
      action: "beneficiary.updated",
      after: contact.rows[0],
      before: before.rows[0],
      entityId: id,
      entityType: "crm_contact",
    });

    return { id };
  });
}
