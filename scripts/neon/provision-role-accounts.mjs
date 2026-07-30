import { randomBytes } from "node:crypto";

import { createPool, loadDotEnv } from "./shared.mjs";

loadDotEnv();

const branch = process.env.NEON_BRANCH;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const domain = process.env.NEON_ROLE_ACCOUNT_DOMAIN ?? "ihsanuladab.or.id";
const organizationCode =
  process.env.NEON_ROLE_ACCOUNT_ORGANIZATION_CODE ?? "IHSANUL-ADAB-DEV";
const organizationName =
  process.env.NEON_ROLE_ACCOUNT_ORGANIZATION_NAME ?? "Ihsanul Adab Development";

if (!authBaseUrl) {
  throw new Error("NEON_AUTH_BASE_URL belum tersedia.");
}
if (!branch || branch === "production") {
  throw new Error(
    "Provisioning akun role hanya diizinkan pada branch development yang eksplisit.",
  );
}

const accountDefinitions = [
  {
    email: `owner@${domain}`,
    name: "Owner Development",
    role: "organization_owner",
  },
  {
    email: `admin@${domain}`,
    name: "Admin Development",
    role: "organization_admin",
  },
  {
    email: `field.officer@${domain}`,
    name: "Petugas Lapangan Development",
    role: "field_officer",
  },
  {
    email: `auditor@${domain}`,
    name: "Auditor Development",
    role: "auditor",
  },
];

function oneTimePassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

async function signUp(account, password) {
  const response = await fetch(`${authBaseUrl}/sign-up/email`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "http://localhost:5173",
    },
    body: JSON.stringify({
      email: account.email,
      name: account.name,
      password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Neon Auth menolak signup ${account.email} (${response.status}): ${body.slice(0, 300)}`,
    );
  }
}

async function verifyPassword(account, password) {
  const response = await fetch(`${authBaseUrl}/sign-in/email`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "http://localhost:5173",
    },
    body: JSON.stringify({
      email: account.email,
      password,
      rememberMe: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Login verifikasi gagal untuk ${account.email} (${response.status}).`,
    );
  }
}

const pool = createPool({ direct: true });
const provisioned = [];

try {
  for (const account of accountDefinitions) {
    let userResult = await pool.query(
      `select id, email from neon_auth."user" where lower(email) = lower($1) limit 1`,
      [account.email],
    );
    let password = null;
    let authStatus = "existing";

    if (!userResult.rows[0]) {
      password = oneTimePassword();
      await signUp(account, password);
      userResult = await pool.query(
        `select id, email from neon_auth."user" where lower(email) = lower($1) limit 1`,
        [account.email],
      );
      if (!userResult.rows[0]) {
        throw new Error(
          `Akun ${account.email} tidak ditemukan setelah signup Neon Auth.`,
        );
      }
      await verifyPassword(account, password);
      authStatus = "created_and_login_verified";
    }

    provisioned.push({
      ...account,
      authStatus,
      authUserId: userResult.rows[0].id,
      password,
    });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const organizationResult = await client.query(
      `
        insert into public.organizations (code, name, type, status)
        values ($1, $2, 'manager', 'active')
        on conflict (code) do update
        set name = excluded.name, status = 'active', updated_at = now()
        returning id, code, name
      `,
      [organizationCode, organizationName],
    );
    const organization = organizationResult.rows[0];

    for (const account of provisioned) {
      const profileResult = await client.query(
        `
          insert into public.profiles (
            auth_user_id, display_name, email, status
          ) values ($1, $2, $3, 'active')
          on conflict (auth_user_id) do update
          set display_name = excluded.display_name,
              email = excluded.email,
              status = 'active',
              updated_at = now()
          returning id
        `,
        [account.authUserId, account.name, account.email],
      );
      const profileId = profileResult.rows[0].id;
      const membershipResult = await client.query(
        `
          insert into public.memberships (
            organization_id, profile_id, status, created_by
          ) values ($1, $2, 'active', $2)
          on conflict (organization_id, profile_id) do update
          set status = 'active', updated_at = now()
          returning id
        `,
        [organization.id, profileId],
      );
      const roleResult = await client.query(
        `
          select id
          from public.roles
          where organization_id is null and key = $1
          limit 1
        `,
        [account.role],
      );
      if (!roleResult.rows[0]) {
        throw new Error(
          `Role sistem ${account.role} tidak tersedia. Jalankan seed terlebih dahulu.`,
        );
      }
      await client.query(
        `
          insert into public.membership_roles (
            organization_id, membership_id, role_id, created_by
          ) values ($1, $2, $3, $4)
          on conflict (membership_id, role_id) do nothing
        `,
        [
          organization.id,
          membershipResult.rows[0].id,
          roleResult.rows[0].id,
          profileId,
        ],
      );
    }

    const owner = provisioned.find(
      (account) => account.role === "organization_owner",
    );
    if (owner) {
      const ownerProfile = await client.query(
        "select id from public.profiles where auth_user_id = $1",
        [owner.authUserId],
      );
      await client.query(
        `
          update public.organizations
          set created_by = coalesce(created_by, $1), updated_at = now()
          where id = $2
        `,
        [ownerProfile.rows[0].id, organization.id],
      );
    }

    await client.query("commit");
    console.log(
      JSON.stringify(
        {
          branch,
          organization,
          accounts: provisioned.map((account) => ({
            authStatus: account.authStatus,
            email: account.email,
            name: account.name,
            password: account.password,
            role: account.role,
          })),
          notice:
            "Password hanya dicetak sekali dan tidak disimpan di repository. Akun existing mempertahankan password sebelumnya.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
