import { describe, expect, it } from "vitest";

import {
  createFundAllocationSchema,
  createFundRestrictionSchema,
  idempotencyKeySchema,
  postFundDisbursementSchema,
} from "./fund-schemas";

describe("fund command schemas", () => {
  it("menolak nominal dengan lebih dari dua angka desimal", () => {
    const result = createFundAllocationSchema.safeParse({
      amount: "100.001",
      currency: "IDR",
      program_id: crypto.randomUUID(),
      purpose: "Pembiayaan program yang telah diverifikasi",
      restriction_id: crypto.randomUUID(),
    });

    expect(result.success).toBe(false);
  });

  it("mewajibkan program pada pembatasan terikat", () => {
    const result = createFundRestrictionSchema.safeParse({
      code: "ZAKAT",
      currency: "IDR",
      name: "Dana Zakat Program",
      restriction_type: "program",
    });

    expect(result.success).toBe(false);
  });

  it("menolak idempotency key pendek", () => {
    expect(idempotencyKeySchema.safeParse("terlalu-pendek").success).toBe(false);
    expect(
      idempotencyKeySchema.safeParse("fund-command-2026-0001").success,
    ).toBe(true);
  });

  it("membatasi penyaluran ke tipe penerima yang dikenal", () => {
    const result = postFundDisbursementSchema.safeParse({
      allocation_id: crypto.randomUUID(),
      amount: "250000",
      currency: "idr",
      disbursed_at: new Date().toISOString(),
      payment_method: "bank_transfer",
      recipient_reference: "BEN-001",
      recipient_type: "unknown",
    });

    expect(result.success).toBe(false);
  });
});
