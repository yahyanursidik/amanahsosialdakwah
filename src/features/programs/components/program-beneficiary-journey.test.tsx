import { describe, expect, it } from "vitest";

import { formatJourneyStatus } from "./program-beneficiary-journey";

describe("formatJourneyStatus", () => {
  it("mengganti status teknis dengan copy operasional", () => {
    expect(formatJourneyStatus("converted")).toBe("Menjadi kasus");
    expect(formatJourneyStatus("urgent")).toBe("Mendesak");
    expect(formatJourneyStatus("eligible")).toBe("Layak menerima bantuan");
  });

  it("menggunakan fallback yang masih dapat dibaca untuk status baru", () => {
    expect(formatJourneyStatus("awaiting_partner")).toBe("awaiting partner");
  });
});
