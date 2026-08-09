import { describe, expect, it } from "vitest";

import {
  assertBenefitDistributionCapacity,
  assertIndependentVerification,
  assertWaqfRegistration,
} from "./waqf-rules";

describe("waqf rules", () => {
  it("menolak registrasi tanpa dokumen legal terverifikasi", () => {
    expect(() =>
      assertWaqfRegistration({
        createdBy: "maker",
        currentStatus: "draft",
        hasVerifiedLegalDocument: false,
        registeredBy: "checker",
      }),
    ).toThrow(/dokumen legal/i);
  });

  it("menerapkan maker-checker untuk verifikasi dokumen dan registrasi", () => {
    expect(() =>
      assertIndependentVerification({
        createdBy: "same",
        verifiedBy: "same",
      }),
    ).toThrow(/berbeda/i);

    expect(() =>
      assertWaqfRegistration({
        createdBy: "same",
        currentStatus: "draft",
        hasVerifiedLegalDocument: true,
        registeredBy: "same",
      }),
    ).toThrow(/berbeda/i);
  });

  it("menolak distribusi manfaat yang melampaui pendapatan", () => {
    expect(() =>
      assertBenefitDistributionCapacity({
        distributedAmount: 800,
        incomeAmount: 1000,
        requestedAmount: 250,
      }),
    ).toThrow(/melebihi pendapatan/i);
  });
});
