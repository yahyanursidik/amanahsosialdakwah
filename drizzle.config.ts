import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "drizzle-kit";

function readEnvValue(key: string): string | undefined {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return process.env[key];
  }

  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.trimStart().startsWith(`${key}=`));

  if (!line) {
    return process.env[key];
  }

  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^(['"])(.*)\1$/, "$2");
}

const databaseUrl =
  readEnvValue("DATABASE_URL_UNPOOLED") ?? readEnvValue("DATABASE_URL");

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED atau DATABASE_URL diperlukan untuk Drizzle.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  out: "./drizzle",
  schema: [
    "./drizzle/schema.ts",
    "./api/db/applications-schema.ts",
    "./api/db/approvals-schema.ts",
    "./api/db/assessments-schema.ts",
    "./api/db/distributions-schema.ts",
    "./api/db/funds-schema.ts",
  ],
  strict: true,
  verbose: true,
});
