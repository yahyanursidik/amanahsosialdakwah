import { describe, expect, it } from "vitest";

import {
  assertAidPackagePackingTransition,
  assertPositivePackageCount,
  assertSubstitutionAllowed,
} from "./aid-package-rules";

describe("aid package rules", () => {
  it("mengizinkan draft dipacking dan packed direversal", () => {
    expect(() =>
      assertAidPackagePackingTransition("draft", "packed"),
    ).not.toThrow();
    expect(() =>
      assertAidPackagePackingTransition("packed", "reversed"),
    ).not.toThrow();
  });

  it("menolak transisi final dan unpack draft", () => {
    expect(() =>
      assertAidPackagePackingTransition("draft", "reversed"),
    ).toThrow();
    expect(() =>
      assertAidPackagePackingTransition("reversed", "packed"),
    ).toThrow();
  });

  it("mewajibkan izin dan alasan substitusi", () => {
    const base = {
      actualProductId: crypto.randomUUID(),
      requestedProductId: crypto.randomUUID(),
    };
    expect(() =>
      assertSubstitutionAllowed({
        ...base,
        allowSubstitution: false,
        reason: "Barang setara tersedia",
      }),
    ).toThrow();
    expect(() =>
      assertSubstitutionAllowed({
        ...base,
        allowSubstitution: true,
        reason: "pendek",
      }),
    ).toThrow();
    expect(() =>
      assertSubstitutionAllowed({
        ...base,
        allowSubstitution: true,
        reason: "Produk setara dan satuan sama",
      }),
    ).not.toThrow();
  });

  it("membatasi jumlah paket", () => {
    expect(() => assertPositivePackageCount(25)).not.toThrow();
    expect(() => assertPositivePackageCount(0)).toThrow();
    expect(() => assertPositivePackageCount(1.5)).toThrow();
  });
});
