import type { Pool } from "@neondatabase/serverless";

import { getDatabasePool } from "../db/client";

export async function checkDatabaseReadiness(
  pool: Pick<Pool, "query"> = getDatabasePool(),
): Promise<{ databaseLatencyMs: number }> {
  const startedAt = performance.now();
  await pool.query("select 1 as ready");

  return {
    databaseLatencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
  };
}
