import { describe, expect, it } from "vitest";

import {
  createWaqfAssetSchema,
  createWaqfProposalSchema,
  distributeWaqfBenefitSchema,
  recordWaqfContributionSchema,
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

describe("waqf stakeholder schemas", () => {
  const base = {
    asset_type: "building",
    description: "Pembangunan masjid dari patungan wakif.",
    name: "Masjid Al-Ikhlas",
  };

  it("mewajibkan target untuk wakaf melalui uang", () => {
    expect(
      createWaqfAssetSchema.safeParse({
        ...base,
        collection_scheme: "cash_for_asset",
      }).success,
    ).toBe(false);
    expect(
      createWaqfAssetSchema.safeParse({
        ...base,
        collection_scheme: "cash_for_asset",
        fundraising_target: "500000000",
      }).success,
    ).toBe(true);
  });

  it("membatasi skema wakaf uang pada jenis aset uang", () => {
    expect(
      createWaqfAssetSchema.safeParse({
        ...base,
        collection_scheme: "cash_waqf",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan tanggal berakhir untuk wakaf muaqqat", () => {
    expect(
      createWaqfAssetSchema.safeParse({ ...base, waqf_duration: "temporary" })
        .success,
    ).toBe(false);
  });

  it("menerima setoran wakif tanpa kontak bila nama diisi", () => {
    expect(
      recordWaqfContributionSchema.safeParse({
        amount: "1000000",
        received_at: "2026-09-29T08:00:00.000Z",
        wakif_name: "Hamba Allah",
      }).success,
    ).toBe(true);
    expect(
      recordWaqfContributionSchema.safeParse({
        amount: "1000000",
        received_at: "2026-09-29T08:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan serah terima benda untuk setoran non-uang", () => {
    expect(
      recordWaqfContributionSchema.safeParse({
        amount: "25000000",
        contribution_form: "land",
        payment_method: "bank_transfer",
        received_at: "2026-09-29T08:00:00.000Z",
        wakif_name: "Keluarga Fulan",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan aset sumber untuk permohonan manfaat", () => {
    const proposal = {
      description: "Permohonan beasiswa santri dari hasil kebun wakaf.",
      proposer_contact_id: "0b9d6a3e-5b3c-4f1c-9a36-3d6c2a1b0f11",
      title: "Beasiswa santri",
    };
    expect(
      createWaqfProposalSchema.safeParse({
        ...proposal,
        proposal_type: "benefit_request",
      }).success,
    ).toBe(false);
    expect(
      createWaqfProposalSchema.safeParse({
        ...proposal,
        proposal_type: "waqf_project",
        proposed_asset_type: "building",
      }).success,
    ).toBe(true);
  });
});
