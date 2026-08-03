import { describe, expect, it } from "vitest";
import {
  createKafalahNeedSchema,
  createKafalahMatchSchema,
} from "./kafalah-schemas";

describe("kafalah schemas", () => {
  it("menerima kebutuhan exact money", () => {
    expect(
      createKafalahNeedSchema.safeParse({
        beneficiary_contact_id: crypto.randomUUID(),
        need_type: "education",
        title: "Biaya pendidikan tahunan",
        description: "Kebutuhan pendidikan yang telah diverifikasi.",
        approved_amount: "12000000.00",
        period_months: 12,
      }).success,
    ).toBe(true);
  });
  it("menolak periode matching terbalik", () => {
    expect(
      createKafalahMatchSchema.safeParse({
        need_id: crypto.randomUUID(),
        sponsor_contact_id: crypto.randomUUID(),
        matched_amount: "1000.00",
        start_date: "2026-03-01",
        end_date: "2026-02-01",
      }).success,
    ).toBe(false);
  });
});
