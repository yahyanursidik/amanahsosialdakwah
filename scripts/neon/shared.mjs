import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = path.resolve(scriptDir, "..", "..");

export function readWorkspaceFile(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

export function listSqlFiles(relativeDir) {
  const absoluteDir = path.join(workspaceRoot, relativeDir);

  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  return fs
    .readdirSync(absoluteDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => ({
      fileName,
      relativePath: path.join(relativeDir, fileName).replaceAll("\\", "/"),
      absolutePath: path.join(absoluteDir, fileName),
    }));
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadDotEnv(fileName = ".env") {
  const envPath = path.join(workspaceRoot, fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);

    if (!match) {
      continue;
    }

    const key = match[1].trim();
    const value = unquoteEnvValue(match[2]);

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function getDatabaseUrl({ direct = false } = {}) {
  loadDotEnv();

  const key = direct ? "DATABASE_URL_UNPOOLED" : "DATABASE_URL";
  const value = process.env[key] ?? process.env.DATABASE_URL;

  if (!value) {
    throw new Error(
      `${key} tidak ditemukan. Jalankan: npx.cmd -y neon env pull`,
    );
  }

  return value;
}

export function assertResetIsAllowed() {
  loadDotEnv();

  if (process.env.NEON_ALLOW_RESET !== "1") {
    throw new Error(
      "Reset database diblokir. Set NEON_ALLOW_RESET=1 hanya untuk branch development yang aman.",
    );
  }

  if (
    process.env.NEON_BRANCH === "production" &&
    process.env.NEON_ALLOW_PRODUCTION_RESET !== "1"
  ) {
    throw new Error(
      "Reset branch production diblokir. Set NEON_ALLOW_PRODUCTION_RESET=1 hanya dalam prosedur recovery yang disetujui.",
    );
  }
}

export function assertSeedIsAllowed() {
  loadDotEnv();

  if (
    process.env.NEON_BRANCH === "production" &&
    process.env.NEON_ALLOW_PRODUCTION_SEED !== "1"
  ) {
    throw new Error(
      "Seed diblokir pada branch production. Set NEON_ALLOW_PRODUCTION_SEED=1 hanya jika benar-benar ingin mengisi data seed ke production.",
    );
  }
}

export function createPool(options = {}) {
  return new Pool({
    connectionString: getDatabaseUrl(options),
  });
}

export async function runSqlText(sqlText, options = {}) {
  const pool = createPool(options);

  try {
    await pool.query(sqlText);
  } finally {
    await pool.end();
  }
}
