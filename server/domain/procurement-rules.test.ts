import { describe, expect, it } from "vitest";

import {
  assertProcurementItems,
  assertProcurementRequestTransition,
  assertPurchaseOrderTransition,
} from "./procurement-rules";

describe("procurement rules", () => {
  it("allows the happy request workflow", () => {
    expect(() =>
      assertProcurementRequestTransition("draft", "submitted"),
    ).not.toThrow();
    expect(() =>
      assertProcurementRequestTransition("submitted", "approved"),
    ).not.toThrow();
    expect(() =>
      assertProcurementRequestTransition("approved", "ordered"),
    ).not.toThrow();
    expect(() =>
      assertProcurementRequestTransition("ordered", "goods_received"),
    ).not.toThrow();
  });

  it("rejects invalid request and PO transitions", () => {
    expect(() =>
      assertProcurementRequestTransition("draft", "approved"),
    ).toThrow(/tidak valid/);
    expect(() => assertPurchaseOrderTransition("draft", "received")).toThrow(
      /tidak valid/,
    );
  });

  it("requires positive procurement item quantities", () => {
    expect(() =>
      assertProcurementItems([{ name: "Beras", quantity: "10", unit: "kg" }]),
    ).not.toThrow();
    expect(() =>
      assertProcurementItems([{ name: "Beras", quantity: "0", unit: "kg" }]),
    ).toThrow(/lebih dari nol/);
  });
});
