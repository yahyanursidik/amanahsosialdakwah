import { describe, expect, it } from "vitest";

import {
  createLogisticsShipmentSchema,
  logisticsTrackingSchema,
} from "./logistics-schemas";

describe("logistics schemas", () => {
  it("menerima shipment dengan tujuan operasional lengkap", () => {
    expect(
      createLogisticsShipmentSchema.safeParse({
        courier_id: crypto.randomUUID(),
        destination_address: "Jalan Amanah Nomor 10 Bandung",
        destination_name: "Penerima Amanah",
        packing_id: crypto.randomUUID(),
      }).success,
    ).toBe(true);
  });

  it("menolak tujuan terlalu pendek", () => {
    expect(
      createLogisticsShipmentSchema.safeParse({
        courier_id: crypto.randomUUID(),
        destination_address: "pendek",
        destination_name: "A",
        packing_id: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("mewajibkan isi untuk tracking note", () => {
    expect(
      logisticsTrackingSchema.safeParse({
        event_at: new Date().toISOString(),
        event_type: "note",
        notes: "abc",
      }).success,
    ).toBe(false);
  });
});
