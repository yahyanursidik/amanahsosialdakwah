import { describe, expect, it } from "vitest";

import { donorEngagement } from "./donor-rules";

describe("donorEngagement", () => {
  const now = new Date("2026-09-29T00:00:00Z");
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

  it("mengelompokkan donatur berdasarkan pemberian terakhir", () => {
    expect(donorEngagement(null, now)).toBe("never");
    expect(donorEngagement(daysAgo(10), now)).toBe("active");
    expect(donorEngagement(daysAgo(90), now)).toBe("active");
    expect(donorEngagement(daysAgo(200), now)).toBe("cooling");
    expect(donorEngagement(daysAgo(400), now)).toBe("lapsed");
  });
});
