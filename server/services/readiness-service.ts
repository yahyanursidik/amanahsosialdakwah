import { performance } from "node:perf_hooks";

import type { Pool } from "@neondatabase/serverless";

import { getDatabasePool } from "../db/client";

type ReadinessRow = {
  database_branch: string | null;
  schema_version: string | null;
};

/**
 * Probe read-only. Selain latensi, melaporkan branch Neon dan migration
 * terakhir agar deployment yang tersambung ke branch/database yang salah
 * langsung terlihat (tanpa membuka data tenant atau kredensial).
 */
export async function checkDatabaseReadiness(
  pool: Pick<Pool, "query"> = getDatabasePool(),
): Promise<{
  databaseBranch: string | null;
  databaseLatencyMs: number;
  schemaVersion: string | null;
}> {
  const startedAt = performance.now();
  const result = await pool.query<ReadinessRow>(
    `select current_setting('neon.branch_id', true) as database_branch,
            (select max(version) from public.schema_migrations) as schema_version`,
  );
  const row = result.rows[0];

  return {
    databaseBranch: row?.database_branch || null,
    databaseLatencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
    schemaVersion: row?.schema_version?.replace(/^drizzle\//, "") ?? null,
  };
}
