import { describe, expect, it } from "vitest";

import {
  createWaqfAssetSchema,
  distributeWaqfBenefitSchema,
  verifyWaqfLegalDocumentSchema,
} from "./waqf-schemas";

describe("waqf schemas", () => {
  it("menerima data aset wakaf valid", () => {
    expect(
      createWaqfAssetSchema.safeParse({
        asset_type: "land",
        description: "Tanah wakaf untuk pengembangan rumah tahfidz.",
        name: "Tanah Wakaf Cibiru",
      }).success,
    ).toBe(true);
  });

  it("menolak catatan verifikasi terlalu pendek", () => {
    expect(
      verifyWaqfLegalDocumentSchema.safeParse({
        notes: "ok",
        status: "verified",
      }).success,
    ).toBe(false);
  });

  it("memvalidasi nilai distribusi manfaat sebagai decimal string", () => {
    expect(
      distributeWaqfBenefitSchema.safeParse({
        amount: "1250000.50",
        benefit_type: "scholarship",
        distributed_at: "2026-08-09T09:00:00.000Z",
        notes: "Distribusi hasil wakaf untuk beasiswa santri dhuafa.",
      }).success,
    ).toBe(true);
  });
});
