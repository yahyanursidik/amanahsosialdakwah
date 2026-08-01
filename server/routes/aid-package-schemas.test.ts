import { describe, expect, it } from "vitest";

import {
  createAidPackagePackingSchema,
  createAidPackageTemplateSchema,
  packAidPackageSchema,
} from "./aid-package-schemas";

describe("aid package schemas", () => {
  it("menerima template paket dengan kuantitas presisi", () => {
    const parsed = createAidPackageTemplateSchema.safeParse({
      code: "SEMBAKO-01",
      name: "Paket Sembako Keluarga",
      items: [
        { product_id: crypto.randomUUID(), quantity: "2.5000", unit: "kg" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("menolak produk template duplikat", () => {
    const productId = crypto.randomUUID();
    expect(
      createAidPackageTemplateSchema.safeParse({
        code: "DUP-01",
        name: "Paket duplikat",
        items: [
          { product_id: productId, quantity: "1", unit: "pcs" },
          { product_id: productId, quantity: "2", unit: "pcs" },
        ],
      }).success,
    ).toBe(false);
  });

  it("membatasi package count dan alasan substitusi", () => {
    expect(
      createAidPackagePackingSchema.safeParse({
        template_id: crypto.randomUUID(),
        warehouse_id: crypto.randomUUID(),
        package_count: 0,
      }).success,
    ).toBe(false);
    expect(
      packAidPackageSchema.safeParse({
        substitutions: [
          {
            template_item_id: crypto.randomUUID(),
            product_id: crypto.randomUUID(),
            reason: "pendek",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
