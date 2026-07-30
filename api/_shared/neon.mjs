import { Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL belum tersedia untuk API server-side.");
}

if (!authBaseUrl) {
  throw new Error("NEON_AUTH_BASE_URL belum tersedia untuk API server-side.");
}

export const pool = new Pool({ connectionString: databaseUrl });

export const tableSchemas = Object.freeze({
  organizations: [
    "id",
    "code",
    "name",
    "legal_name",
    "type",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  organization_units: [
    "id",
    "organization_id",
    "parent_id",
    "code",
    "name",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  profiles: [
    "id",
    "auth_user_id",
    "display_name",
    "email",
    "status",
    "created_at",
    "updated_at",
  ],
  memberships: [
    "id",
    "organization_id",
    "profile_id",
    "organization_unit_id",
    "status",
    "joined_at",
    "created_by",
    "created_at",
    "updated_at",
  ],
  roles: [
    "id",
    "organization_id",
    "key",
    "name",
    "description",
    "is_system",
    "created_by",
    "created_at",
    "updated_at",
  ],
  permissions: [
    "id",
    "key",
    "resource",
    "action",
    "description",
    "created_at",
    "updated_at",
  ],
  role_permissions: [
    "id",
    "organization_id",
    "role_id",
    "permission_id",
    "created_by",
    "created_at",
    "updated_at",
  ],
  membership_roles: [
    "id",
    "organization_id",
    "membership_id",
    "role_id",
    "created_by",
    "created_at",
    "updated_at",
  ],
  organization_relationships: [
    "id",
    "source_organization_id",
    "target_organization_id",
    "relationship_type",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  program_categories: [
    "id",
    "code",
    "name",
    "description",
    "organization_id",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  programs: [
    "id",
    "organization_id",
    "code",
    "name",
    "category_id",
    "description",
    "objective",
    "target_beneficiary_type",
    "target_beneficiary_count",
    "budget_amount",
    "allocated_amount",
    "disbursed_amount",
    "fund_type",
    "status",
    "starts_at",
    "ends_at",
    "owner_id",
    "is_archived",
    "archived_at",
    "archived_by",
    "created_by",
    "created_at",
    "updated_at",
  ],
  program_revisions: [
    "id",
    "organization_id",
    "program_id",
    "action_type",
    "change_summary",
    "reason",
    "previous_values",
    "new_values",
    "performed_by",
    "performed_at",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_contacts: [
    "id",
    "organization_id",
    "contact_type",
    "display_name",
    "legal_name",
    "normalized_name",
    "primary_email",
    "normalized_email",
    "primary_phone",
    "normalized_phone",
    "whatsapp_phone",
    "gender",
    "birth_date",
    "address_line",
    "village",
    "district",
    "city",
    "province",
    "postal_code",
    "status",
    "notes",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_contact_roles: [
    "id",
    "organization_id",
    "contact_id",
    "role_type",
    "status",
    "started_at",
    "ended_at",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_sensitive_identities: [
    "id",
    "organization_id",
    "contact_id",
    "identity_type",
    "identity_ciphertext_ref",
    "identity_last4",
    "identity_hash",
    "verification_status",
    "verified_at",
    "verified_by",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_beneficiary_profiles: [
    "id",
    "organization_id",
    "contact_id",
    "beneficiary_type",
    "vulnerability_level",
    "household_size",
    "income_range",
    "assessment_status",
    "status",
    "eligibility_notes",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_institution_profiles: [
    "id",
    "organization_id",
    "contact_id",
    "institution_type",
    "institution_code",
    "registration_reference",
    "contact_person_name",
    "contact_person_phone",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_tags: [
    "id",
    "organization_id",
    "key",
    "label",
    "description",
    "color",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_contact_tags: [
    "id",
    "organization_id",
    "contact_id",
    "tag_id",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_interactions: [
    "id",
    "organization_id",
    "contact_id",
    "interaction_type",
    "direction",
    "occurred_at",
    "summary",
    "follow_up_note",
    "follow_up_at",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_consents: [
    "id",
    "organization_id",
    "contact_id",
    "consent_type",
    "channel",
    "status",
    "consented_at",
    "withdrawn_at",
    "expires_at",
    "evidence_file_id",
    "notes",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_duplicate_candidates: [
    "id",
    "organization_id",
    "primary_contact_id",
    "duplicate_contact_id",
    "match_score",
    "match_reasons",
    "status",
    "reviewed_by",
    "reviewed_at",
    "created_by",
    "created_at",
    "updated_at",
  ],
  crm_merge_requests: [
    "id",
    "organization_id",
    "source_contact_id",
    "target_contact_id",
    "status",
    "reason",
    "requested_by",
    "requested_at",
    "approved_by",
    "approved_at",
    "applied_at",
    "audit_summary",
    "created_by",
    "created_at",
    "updated_at",
  ],
});

export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

export function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

export async function readJsonBody(request) {
  if (Buffer.isBuffer(request.body)) {
    const raw = request.body.toString("utf8");
    return raw ? JSON.parse(raw) : {};
  }

  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return request.body ? JSON.parse(request.body) : {};
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export async function readRawBody(request) {
  if (typeof request.body === "string" || Buffer.isBuffer(request.body)) {
    return request.body;
  }

  if (request.body && typeof request.body === "object") {
    return JSON.stringify(request.body);
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function requireSession(request) {
  const sessionResponse = await fetch(`${authBaseUrl}/get-session`, {
    method: "GET",
    headers: {
      cookie: request.headers.cookie ?? "",
      accept: "application/json",
    },
  });

  if (!sessionResponse.ok) {
    const error = new Error("Sesi tidak valid.");
    error.statusCode = 401;
    throw error;
  }

  const session = await sessionResponse.json();
  const user = session?.user ?? session?.data?.user;

  if (!user?.id || !user?.email) {
    const error = new Error("Sesi tidak valid.");
    error.statusCode = 401;
    throw error;
  }

  return { session, user };
}

export async function ensureProfileAndBootstrap(user) {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const profileResult = await client.query(
      `
      insert into public.profiles (auth_user_id, display_name, email, status)
      values ($1, $2, $3, 'active')
      on conflict (auth_user_id) do update
      set
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
        email = excluded.email,
        updated_at = now()
      returning *
      `,
      [user.id, user.name ?? user.email, user.email],
    );
    const profile = profileResult.rows[0];
    const membershipCount = await client.query(
      "select count(*)::int as count from public.memberships where profile_id = $1",
      [profile.id],
    );
    const organizationCount = await client.query(
      "select count(*)::int as count from public.organizations",
    );

    if (
      membershipCount.rows[0].count === 0 &&
      organizationCount.rows[0].count === 0
    ) {
      const organization = await client.query(
        `
        insert into public.organizations (code, name, type, status, created_by)
        values ('AMANAHOS', 'AmanahOS', 'manager', 'active', $1)
        returning *
        `,
        [profile.id],
      );
      const membership = await client.query(
        `
        insert into public.memberships (organization_id, profile_id, status, created_by)
        values ($1, $2, 'active', $2)
        returning *
        `,
        [organization.rows[0].id, profile.id],
      );
      const ownerRole = await client.query(
        "select id from public.roles where key = 'organization_owner' and organization_id is null limit 1",
      );

      if (ownerRole.rows[0]) {
        await client.query(
          `
          insert into public.membership_roles (organization_id, membership_id, role_id, created_by)
          values ($1, $2, $3, $4)
          on conflict (membership_id, role_id) do nothing
          `,
          [
            organization.rows[0].id,
            membership.rows[0].id,
            ownerRole.rows[0].id,
            profile.id,
          ],
        );
      }

      const categoryValues = [
        ["PANGAN", "Bantuan Pangan & Sembako"],
        ["KESEHATAN", "Kesehatan & Medis"],
        ["PENDIDIKAN", "Pendidikan & Beasiswa"],
        ["DAKWAH", "Sarana & Operasional Dakwah"],
        ["BENCANA", "Tanggap Bencana & Kemanusiaan"],
        ["WAKAF", "Wakaf Produktif & Sarana"],
      ];

      for (const [code, name] of categoryValues) {
        await client.query(
          `
          insert into public.program_categories (organization_id, code, name, status, created_by)
          values ($1, $2, $3, 'active', $4)
          on conflict (organization_id, code) do nothing
          `,
          [organization.rows[0].id, code, name, profile.id],
        );
      }
    }

    await client.query("commit");
    return profile;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function withRuntimeContext(profileId, organizationId, callback) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("select set_config('app.current_profile_id', $1, true)", [
      profileId,
    ]);
    await client.query(
      "select set_config('app.current_organization_id', $1, true)",
      [organizationId ?? ""],
    );
    await client.query("set local role app_runtime");

    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function toClientDocument(resource, row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    $id: row.id,
    $collectionId: resource,
    $databaseId: "neon",
    $createdAt: row.created_at,
    $updatedAt: row.updated_at,
    $permissions: [],
  };
}

export function assertResource(resource) {
  if (!Object.hasOwn(tableSchemas, resource)) {
    const error = new Error(`Resource tidak dikenal: ${resource}`);
    error.statusCode = 400;
    throw error;
  }

  return tableSchemas[resource];
}

export function normalizeField(resource, field) {
  const mapped =
    field === "$id"
      ? "id"
      : field === "$createdAt"
        ? "created_at"
        : field === "$updatedAt"
          ? "updated_at"
          : field;
  const columns = assertResource(resource);

  if (!columns.includes(mapped)) {
    const error = new Error(`Kolom ${field} tidak valid untuk ${resource}.`);
    error.statusCode = 400;
    throw error;
  }

  return mapped;
}
