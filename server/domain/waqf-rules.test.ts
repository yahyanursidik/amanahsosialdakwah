import { describe, expect, it } from "vitest";

import {
  assertBenefitDistributionCapacity,
  assertIndependentProposalReview,
  assertIndependentVerification,
  assertWaqfAcceptsContribution,
  assertWaqfDuration,
  assertWaqfProposalTransition,
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

describe("waqf stakeholder rules", () => {
  it("mengikuti alur status pengajuan program wakaf", () => {
    expect(() =>
      assertWaqfProposalTransition("draft", "submitted"),
    ).not.toThrow();
    expect(() =>
      assertWaqfProposalTransition("under_review", "approved"),
    ).not.toThrow();
    expect(() => assertWaqfProposalTransition("draft", "approved")).toThrow(
      /tidak dapat diubah/i,
    );
    expect(() =>
      assertWaqfProposalTransition("rejected", "converted"),
    ).toThrow();
  });

  it("menolak penilaian pengajuan oleh pencatatnya sendiri", () => {
    expect(() =>
      assertIndependentProposalReview({ createdBy: "a", reviewedBy: "a" }),
    ).toThrow(/berbeda/i);
  });

  it("mewajibkan tanggal berakhir untuk wakaf berjangka", () => {
    expect(() => assertWaqfDuration({ waqfDuration: "temporary" })).toThrow(
      /muaqqat/i,
    );
    expect(() =>
      assertWaqfDuration({
        durationEndDate: "2026-01-01",
        waqfDuration: "permanent",
      }),
    ).toThrow(/muabbad/i);
    expect(() =>
      assertWaqfDuration({
        durationEndDate: "2025-01-01",
        pledgeDate: "2026-01-01",
        waqfDuration: "temporary",
      }),
    ).toThrow(/setelah/i);
  });

  it("hanya menerima setoran pada aset draft bila sedang menghimpun dana", () => {
    expect(() =>
      assertWaqfAcceptsContribution({
        collectionScheme: "cash_for_asset",
        operationalStatus: "draft",
      }),
    ).not.toThrow();
    expect(() =>
      assertWaqfAcceptsContribution({
        collectionScheme: "cash_waqf",
        operationalStatus: "draft",
      }),
    ).toThrow(/draft/i);
    expect(() =>
      assertWaqfAcceptsContribution({
        collectionScheme: "cash_waqf",
        operationalStatus: "retired",
      }),
    ).toThrow(/dihentikan/i);
  });
});
