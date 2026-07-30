import { describe, expect, it } from "vitest";

import {
  createInventoryAdjustmentSchema,
  createInventoryProductSchema,
  postGoodsReceiptInventorySchema,
} from "./inventory-schemas";

describe("inventory schemas", () => {
  it("normalizes a product draft payload", () => {
    const result = createInventoryProductSchema.parse({
      base_unit: "kg",
      name: "Beras premium",
      sku: "BR-001",
    });

    expect(result.track_batch).toBe(false);
    expect(result.track_expiry).toBe(false);
  });

  it("rejects zero adjustment deltas", () => {
    expect(() =>
      createInventoryAdjustmentSchema.parse({
        adjustment_type: "correction",
        expected_delta: "0",
        notes: "Koreksi hasil opname gudang",
        product_id: crypto.randomUUID(),
        warehouse_id: crypto.randomUUID(),
      }),
    ).toThrow(/Delta/);
  });

  it("requires idempotent receipt posting items", () => {
    const result = postGoodsReceiptInventorySchema.safeParse({
      items: [],
      occurred_at: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });
});
