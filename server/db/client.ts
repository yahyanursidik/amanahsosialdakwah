import { Pool, type PoolClient } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as applicationSchema from "./applications-schema";
import * as approvalSchema from "./approvals-schema";
import * as assessmentSchema from "./assessments-schema";
import * as distributionSchema from "./distributions-schema";
import * as fundsSchema from "./funds-schema";
import * as foundationSchema from "../../drizzle/schema";
import type { RequestContext } from "../types";

let poolInstance: Pool | null = null;

export function getDatabasePool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum tersedia untuk API server-side.");
  }

  poolInstance ??= new Pool({ connectionString: databaseUrl });
  return poolInstance;
}

export const schema = {
  ...foundationSchema,
  ...applicationSchema,
  ...approvalSchema,
  ...assessmentSchema,
  ...distributionSchema,
  ...fundsSchema,
};

export type TenantDatabase = ReturnType<typeof createDatabase>;

function createDatabase(client: PoolClient) {
  return drizzle(client, { schema });
}

export async function withTenantTransaction<T>(
  context: RequestContext,
  callback: (database: TenantDatabase, client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getDatabasePool().connect();

  try {
    await client.query("begin");
    await client.query(
      "select set_config('app.current_profile_id', $1, true)",
      [context.profileId],
    );
    await client.query(
      "select set_config('app.current_organization_id', $1, true)",
      [context.organizationId],
    );
    await client.query("set local role app_runtime");

    const result = await callback(createDatabase(client), client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
