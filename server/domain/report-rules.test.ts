import { describe, expect, it } from "vitest";

import { resolveReportPeriod } from "./report-rules";

describe("report period", () => {
  it("menghasilkan periode 30 hari inklusif dalam UTC", () => {
    expect(
      resolveReportPeriod("30d", new Date("2026-08-09T08:00:00.000Z")),
    ).toEqual({
      from: "2026-07-11T00:00:00.000Z",
      range: "30d",
      to: "2026-08-09T23:59:59.999Z",
    });
  });

  it("mendukung periode tahunan", () => {
    expect(
      resolveReportPeriod("365d", new Date("2026-08-09T08:00:00.000Z"))
        .from,
    ).toBe("2025-08-10T00:00:00.000Z");
  });
});
