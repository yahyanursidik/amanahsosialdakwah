import { describe, expect, it } from "vitest";

import { reportQuerySchema } from "./report-schemas";

describe("report query schema", () => {
  it("menggunakan 30 hari sebagai periode default", () => {
    expect(reportQuerySchema.parse({})).toEqual({ range: "30d" });
  });

  it("menolak rentang bebas yang berpotensi menjadi query mahal", () => {
    expect(reportQuerySchema.safeParse({ range: "all" }).success).toBe(false);
  });
});
