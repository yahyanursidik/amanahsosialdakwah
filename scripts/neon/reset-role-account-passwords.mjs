import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

import { createPool, loadDotEnv } from "./shared.mjs";

/**
 * Mengatur ulang kata sandi akun Neon Auth (email/password) tanpa bergantung
 * pada pengiriman email. Hash mengikuti format Better Auth yang dipakai Neon
 * Auth: scrypt(N=16384, r=16, p=1, dkLen=64) dengan salt hex 16 byte,
 * disimpan sebagai `salt:key`. Setiap reset diverifikasi dengan login nyata;
 * bila verifikasi gagal, hash lama dikembalikan.
 *
 * Contoh:
 *   node scripts/neon/reset-role-account-passwords.mjs --email admin@ihsanuladab.or.id
 *   node scripts/neon/reset-role-account-passwords.mjs            (empat akun role)
 */

loadDotEnv();

const scryptAsync = promisify(scrypt);
const branch = process.env.NEON_BRANCH;
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const domain = process.env.NEON_ROLE_ACCOUNT_DOMAIN ?? "ihsanuladab.or.id";
const revokeSessions = process.argv.includes("--revoke-sessions");

if (!authBaseUrl) throw new Error("NEON_AUTH_BASE_URL belum tersedia.");
if (!branch) throw new Error("NEON_BRANCH belum tersedia.");
if (
  branch === "production" &&
  process.env.NEON_ALLOW_PRODUCTION_PASSWORD_RESET !== "1"
) {
  throw new Error(
    "Reset sandi production memerlukan NEON_ALLOW_PRODUCTION_PASSWORD_RESET=1.",
  );
}

const requestedEmails = process.argv
  .flatMap((argument, index, list) =>
    argument === "--email" ? [list[index + 1]] : [],
  )
  .filter(Boolean);
const emails =
  requestedEmails.length > 0
    ? requestedEmails
    : ["owner", "admin", "field.officer", "auditor"].map(
        (name) => `${name}@${domain}`,
      );

function oneTimePassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    maxmem: 128 * 16384 * 16 * 2,
    p: 1,
    r: 16,
  });
  return `${salt}:${key.toString("hex")}`;
}

async function canSignIn(email, password) {
  const response = await fetch(`${authBaseUrl}/sign-in/email`, {
    body: JSON.stringify({ email, password, rememberMe: false }),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "http://localhost:5173",
    },
    method: "POST",
  });
  return response.ok;
}

const pool = createPool({ direct: true });
const results = [];

try {
  for (const email of emails) {
    const account = await pool.query(
      `select account.id, account.password, account."userId" as user_id
       from neon_auth."user" auth_user
       join neon_auth.account account on account."userId" = auth_user.id
       where lower(auth_user.email) = lower($1) and account."providerId" = 'credential'
       limit 1`,
      [email],
    );
    const current = account.rows[0];
    if (!current) {
      results.push({ email, status: "tidak ditemukan (belum pernah dibuat)" });
      continue;
    }

    const password = oneTimePassword();
    await pool.query(
      `update neon_auth.account set password = $1, "updatedAt" = now() where id = $2`,
      [await hashPassword(password), current.id],
    );

    if (!(await canSignIn(email, password))) {
      await pool.query(
        `update neon_auth.account set password = $1, "updatedAt" = now() where id = $2`,
        [current.password, current.id],
      );
      results.push({ email, status: "GAGAL verifikasi — sandi lama dipulihkan" });
      continue;
    }

    if (revokeSessions) {
      await pool.query(`delete from neon_auth.session where "userId" = $1`, [
        current.user_id,
      ]);
    }
    results.push({ email, password, status: "berhasil, login terverifikasi" });
  }
} finally {
  await pool.end();
}

console.log(
  JSON.stringify(
    {
      branch,
      notice:
        "Sandi hanya dicetak sekali. Simpan di password manager, lalu ganti melalui menu akun setelah login.",
      results,
    },
    null,
    2,
  ),
);
