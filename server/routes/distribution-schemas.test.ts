import { describe, expect, it } from "vitest";

import {
  addDistributionEvidenceSchema,
  createDistributionPlanSchema,
  distributionIdempotencyKeySchema,
} from "./distribution-schemas";

describe("distribution schemas", () => {
  it("menerima plan cash dengan nominal exact", () => {
    expect(
      createDistributionPlanSchema.safeParse({
        amount: "250000.50",
        case_id: crypto.randomUUID(),
        currency: "idr",
        disbursement_id: crypto.randomUUID(),
        distribution_method: "cash",
        planned_at: new Date().toISOString(),
        purpose: "Penyaluran bantuan biaya hidup bulanan",
        requires_confirmation: true,
      }).success,
    ).toBe(true);
  });

  it("menolak bukti tanpa uraian memadai", () => {
    expect(
      addDistributionEvidenceSchema.safeParse({
        captured_at: new Date().toISOString(),
        description: "singkat",
        evidence_kind: "field_note",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan idempotency key yang kuat", () => {
    expect(distributionIdempotencyKeySchema.safeParse("short").success).toBe(
      false,
    );
  });
});
