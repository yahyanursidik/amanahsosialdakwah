import { describe, expect, it } from "vitest";

import {
  assertBatchRequirement,
  assertInventoryAdjustmentTransition,
  assertNoNegativeInventoryBalance,
  assertNonZeroAdjustmentDelta,
  assertPositiveInventoryQuantity,
} from "./inventory-rules";

describe("inventory rules", () => {
  it("rejects invalid adjustment transitions", () => {
    expect(() =>
      assertInventoryAdjustmentTransition("draft", "posted"),
    ).toThrow(/tidak valid/);
    expect(() =>
      assertInventoryAdjustmentTransition("submitted", "approved"),
    ).not.toThrow();
  });

  it("guards positive movement quantities and non-zero deltas", () => {
    expect(() => assertPositiveInventoryQuantity("0")).toThrow(/lebih dari nol/);
    expect(() => assertNonZeroAdjustmentDelta("0.0000")).toThrow(/tidak boleh nol/);
    expect(() => assertPositiveInventoryQuantity("1.2500")).not.toThrow();
    expect(() => assertNonZeroAdjustmentDelta("-2")).not.toThrow();
  });

  it("prevents negative official balances", () => {
    expect(() => assertNoNegativeInventoryBalance("-0.0001")).toThrow(
      /tidak boleh negatif/,
    );
    expect(() => assertNoNegativeInventoryBalance("0")).not.toThrow();
  });

  it("requires batch and expiry metadata only when product configuration needs it", () => {
    expect(() =>
      assertBatchRequirement({
        batchNumber: undefined,
        expiresAt: undefined,
        productTracksBatch: true,
        productTracksExpiry: false,
      }),
    ).toThrow(/nomor batch/);
    expect(() =>
      assertBatchRequirement({
        batchNumber: "B-1",
        expiresAt: undefined,
        productTracksBatch: true,
        productTracksExpiry: true,
      }),
    ).toThrow(/kedaluwarsa/);
    expect(() =>
      assertBatchRequirement({
        batchNumber: "B-1",
        expiresAt: "2026-12-31",
        productTracksBatch: true,
        productTracksExpiry: true,
      }),
    ).not.toThrow();
  });
});
