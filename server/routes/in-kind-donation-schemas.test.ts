import { describe, expect, it } from "vitest";

import { receiveInKindDonationSchema } from "./in-kind-donation-schemas";

const product = "3f0c2b9e-1a4d-4c7e-8f21-6b5a9d0e7c33";
const warehouse = "7a1e4c2d-9b3f-4e8a-a6d5-2c1b0f9e8d77";

const valid = {
  donor_name: "Toko Berkah",
  donor_type: "institution",
  giving_type: "sedekah",
  items: [{ product_id: product, quantity: "25", unit_value: "15000" }],
  received_at: "2026-09-29T08:00:00.000Z",
  warehouse_id: warehouse,
};

describe("in-kind donation schemas", () => {
  it("menerima donasi barang valid", () => {
    expect(receiveInKindDonationSchema.safeParse(valid).success).toBe(true);
  });

  it("mengizinkan donatur anonim tanpa nama", () => {
    expect(
      receiveInKindDonationSchema.safeParse({
        ...valid,
        donor_name: undefined,
        donor_type: "anonymous",
      }).success,
    ).toBe(true);
  });

  it("mewajibkan identitas donatur non-anonim", () => {
    expect(
      receiveInKindDonationSchema.safeParse({ ...valid, donor_name: undefined })
        .success,
    ).toBe(false);
  });

  it("menolak jumlah nol dan produk ganda", () => {
    expect(
      receiveInKindDonationSchema.safeParse({
        ...valid,
        items: [{ product_id: product, quantity: "0" }],
      }).success,
    ).toBe(false);
    expect(
      receiveInKindDonationSchema.safeParse({
        ...valid,
        items: [
          { product_id: product, quantity: "1" },
          { product_id: product, quantity: "2" },
        ],
      }).success,
    ).toBe(false);
  });

  it("hanya menautkan aset wakaf untuk jenis amanah wakaf", () => {
    expect(
      receiveInKindDonationSchema.safeParse({
        ...valid,
        waqf_asset_id: product,
      }).success,
    ).toBe(false);
    expect(
      receiveInKindDonationSchema.safeParse({
        ...valid,
        giving_type: "waqf",
        waqf_asset_id: product,
      }).success,
    ).toBe(true);
  });
});
