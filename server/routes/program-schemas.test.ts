import { describe, expect, it } from "vitest";

import {
  createProgramFulfillmentSchema,
  programBeneficiaryJourneyQuerySchema,
  programFulfillmentIdempotencyKeySchema,
  programIdParamsSchema,
} from "./program-schemas";

describe("program fulfillment schemas", () => {
  it("menerima tautan fulfilment yang lengkap", () => {
    expect(
      createProgramFulfillmentSchema.safeParse({
        application_id: crypto.randomUUID(),
        package_count: 2,
        packing_id: crypto.randomUUID(),
        partner_contact_id: crypto.randomUUID(),
        partner_pic_name: "Siti Aminah",
        partner_readiness_status: "ready",
      }).success,
    ).toBe(true);
  });

  it("menolak jumlah paket tidak valid dan idempotency key lemah", () => {
    expect(
      createProgramFulfillmentSchema.safeParse({
        application_id: crypto.randomUUID(),
        package_count: 0,
        packing_id: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      programFulfillmentIdempotencyKeySchema.safeParse("short").success,
    ).toBe(false);
  });

  it("mewajibkan UUID pada parameter program", () => {
    expect(programIdParamsSchema.safeParse({ id: "program-a" }).success).toBe(
      false,
    );
  });

  it("membatasi pagination dan filter jejak penerima pada nilai aman", () => {
    expect(
      programBeneficiaryJourneyQuerySchema.safeParse({
        page: "2",
        pageSize: "50",
        q: "Paket pangan",
        stage: "in_distribution",
      }).success,
    ).toBe(true);
    expect(
      programBeneficiaryJourneyQuerySchema.safeParse({
        page: 0,
        pageSize: 999,
        stage: "semua",
      }).success,
    ).toBe(false);
  });
});
