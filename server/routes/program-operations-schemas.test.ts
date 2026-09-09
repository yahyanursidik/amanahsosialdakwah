import { describe, expect, it } from "vitest";

import {
  createProgramApplicationAllocationSchema,
  createProgramDeliveryAreaSchema,
  createProgramPartnerAssignmentSchema,
} from "./program-operations-schemas";

describe("program operations schemas", () => {
  it("menerima area penyaluran dengan kuota", () => {
    expect(
      createProgramDeliveryAreaSchema.safeParse({
        code: "BANDUNG-UTARA",
        name: "Bandung Utara",
        quota_capacity: 120,
      }).success,
    ).toBe(true);
  });

  it("mewajibkan area untuk reservasi kuota", () => {
    expect(
      createProgramApplicationAllocationSchema.safeParse({
        application_id: crypto.randomUUID(),
        status: "reserved",
      }).success,
    ).toBe(false);
  });

  it("mengizinkan waitlist tanpa area dan memvalidasi mitra", () => {
    expect(
      createProgramApplicationAllocationSchema.safeParse({
        application_id: crypto.randomUUID(),
        status: "waitlisted",
      }).success,
    ).toBe(true);
    expect(
      createProgramPartnerAssignmentSchema.safeParse({
        assignment_role: "distributor",
        partner_contact_id: crypto.randomUUID(),
      }).success,
    ).toBe(true);
  });
});
