import { describe, expect, it, vi } from "vitest";

import { checkDatabaseReadiness } from "./readiness-service";

describe("database readiness", () => {
  it("melaporkan branch dan versi skema tanpa memuat data tenant", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          database_branch: "br-still-forest-azm12sid",
          schema_version: "drizzle/0034_beneficiary_registry.sql",
        },
      ],
    });

    const result = await checkDatabaseReadiness({ query });

    expect(query.mock.calls[0]?.[0]).toMatch(/neon\.branch_id/);
    expect(query.mock.calls[0]?.[0]).not.toMatch(/organization|crm_|profiles/);
    expect(result.databaseBranch).toBe("br-still-forest-azm12sid");
    expect(result.schemaVersion).toBe("0034_beneficiary_registry.sql");
    expect(result.databaseLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
