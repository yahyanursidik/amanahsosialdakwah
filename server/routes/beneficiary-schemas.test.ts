import { describe, expect, it } from "vitest";

import {
  identityHash,
  maskAccountNumber,
  profileCompleteness,
} from "../services/beneficiary-service";
import { createBeneficiarySchema } from "./beneficiary-schemas";

describe("beneficiary schemas", () => {
  it("menerima penerima minimal hanya dengan nama", () => {
    expect(
      createBeneficiarySchema.safeParse({ display_name: "Ibu Siti" }).success,
    ).toBe(true);
  });

  it("mewajibkan NIK/KK 16 digit", () => {
    const result = createBeneficiarySchema.safeParse({
      display_name: "Ibu Siti",
      identities: [{ identity_number: "12345", identity_type: "nik" }],
    });
    expect(result.success).toBe(false);
  });

  it("menolak jenis identitas ganda", () => {
    const nik = { identity_number: "3273014410820007", identity_type: "nik" };
    expect(
      createBeneficiarySchema.safeParse({
        display_name: "Ibu Siti",
        identities: [nik, nik],
      }).success,
    ).toBe(false);
  });

  it("menolak kategori penerima yang tidak dikenal", () => {
    expect(
      createBeneficiarySchema.safeParse({
        beneficiary_categories: ["bukan-kategori"],
        display_name: "Ibu Siti",
      }).success,
    ).toBe(false);
  });
});

describe("beneficiary privacy helpers", () => {
  it("membuat hash identitas per organisasi tanpa plaintext", () => {
    const hash = identityHash("org-a", "nik", "3273014410820007");
    expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hash).not.toContain("3273014410820007");
    expect(hash).not.toBe(identityHash("org-b", "nik", "3273014410820007"));
  });

  it("menyamarkan nomor rekening", () => {
    expect(maskAccountNumber("7123456789")).toBe("•••• 6789");
    expect(maskAccountNumber(null)).toBeNull();
  });

  it("menghitung kelengkapan profil", () => {
    expect(profileCompleteness({})).toBe(0);
    expect(
      profileCompleteness({ city: "Bandung", primary_phone: "0812" }),
    ).toBeGreaterThan(0);
  });
});
