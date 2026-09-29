import fs from "node:fs";

const baseUrl = process.env.PRODUCTION_APP_URL;

if (!baseUrl) {
  throw new Error(
    "PRODUCTION_APP_URL wajib diisi, contoh: https://amanahsosial-dakwahterintegrasi.vercel.app",
  );
}

async function fetchChecked(path, expectedStatus = 200) {
  const response = await fetch(new URL(path, baseUrl), {
    headers: { "user-agent": "amanah-production-smoke/1.0" },
    redirect: "manual",
  });

  if (response.status !== expectedStatus) {
    throw new Error(
      `${path} mengembalikan HTTP ${response.status}, diharapkan ${expectedStatus}.`,
    );
  }

  return response;
}

const healthResponse = await fetchChecked("/api/v1/health");
const health = await healthResponse.json();
if (health.data?.status !== "ok" || !health.meta?.requestId) {
  throw new Error("Health endpoint tidak mengembalikan envelope yang valid.");
}

const readyResponse = await fetchChecked("/api/v1/ready");
const readiness = await readyResponse.json();
if (readiness.data?.status !== "ready") {
  throw new Error("Readiness endpoint belum siap.");
}

// Deployment harus membaca database dengan migration terbaru repository;
// branch lama yang tertinggal membuat menu/fitur baru tidak muncul.
const latestMigration = fs
  .readdirSync(new URL("../drizzle/", import.meta.url))
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort()
  .at(-1);
if (readiness.data.schemaVersion !== latestMigration) {
  throw new Error(
    `Database production tertinggal: schema ${readiness.data.schemaVersion ?? "tidak diketahui"} (branch ${readiness.data.databaseBranch ?? "?"}), repository ${latestMigration}. Periksa DATABASE_URL di Vercel atau jalankan migration.`,
  );
}
const expectedBranch = process.env.PRODUCTION_DATABASE_BRANCH_ID;
if (expectedBranch && readiness.data.databaseBranch !== expectedBranch) {
  throw new Error(
    `Deployment tersambung ke branch ${readiness.data.databaseBranch}, bukan ${expectedBranch}.`,
  );
}

const loginResponse = await fetchChecked("/login");
const loginHtml = await loginResponse.text();
if (!loginHtml.includes('id="root"')) {
  throw new Error("Login shell tidak ditemukan pada deployment production.");
}

for (const header of [
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
]) {
  if (!loginResponse.headers.has(header)) {
    throw new Error(`Header keamanan ${header} belum tersedia.`);
  }
}

console.log(
  `Smoke production lulus: health ok, database ready (${readiness.data.databaseLatencyMs} ms, branch ${readiness.data.databaseBranch}, schema ${readiness.data.schemaVersion}), login shell dan header keamanan tersedia.`,
);
