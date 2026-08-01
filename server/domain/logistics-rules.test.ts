import { describe, expect, it } from "vitest";

import {
  assertIndependentIncidentResolution,
  assertLogisticsShipmentTransition,
  nextStatusForTrackingEvent,
} from "./logistics-rules";

describe("logistics rules", () => {
  it("mengizinkan alur shipment dan return yang sah", () => {
    expect(() =>
      assertLogisticsShipmentTransition("draft", "dispatched"),
    ).not.toThrow();
    expect(() =>
      assertLogisticsShipmentTransition("in_transit", "delivered"),
    ).not.toThrow();
    expect(() =>
      assertLogisticsShipmentTransition("returning", "returned"),
    ).not.toThrow();
  });

  it("menolak perubahan dari status final", () => {
    expect(() =>
      assertLogisticsShipmentTransition("returned", "dispatched"),
    ).toThrow();
    expect(() =>
      assertLogisticsShipmentTransition("cancelled", "dispatched"),
    ).toThrow();
  });

  it("memetakan tracking ke status tanpa menerima event final", () => {
    expect(nextStatusForTrackingEvent("dispatched", "picked_up")).toBe(
      "in_transit",
    );
    expect(
      nextStatusForTrackingEvent("return_requested", "return_in_transit"),
    ).toBe("returning");
    expect(() => nextStatusForTrackingEvent("draft", "in_transit")).toThrow();
  });

  it("menerapkan maker-checker penyelesaian insiden", () => {
    expect(() =>
      assertIndependentIncidentResolution({ reportedBy: "a", resolvedBy: "b" }),
    ).not.toThrow();
    expect(() =>
      assertIndependentIncidentResolution({ reportedBy: "a", resolvedBy: "a" }),
    ).toThrow();
  });
});
