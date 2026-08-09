import { describe, expect, it, vi } from "vitest";

import { checkDatabaseReadiness } from "./readiness-service";

describe("database readiness", () => {
  it("menjalankan probe read-only tanpa memuat data tenant", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ ready: 1 }] });

    const result = await checkDatabaseReadiness({ query });

    expect(query).toHaveBeenCalledWith("select 1 as ready");
    expect(result.databaseLatencyMs).toBeGreaterThanOrEqual(0);
  });
});
