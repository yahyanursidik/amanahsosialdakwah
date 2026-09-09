import { describe, expect, it } from "vitest";

import { createInitialProgramPlanSchema } from "./program-initial-plan-schemas";

function validPlan() {
  const areaClientId = crypto.randomUUID();
  return {
    cash_budget_amount: 2_000_000,
    category_id: crypto.randomUUID(),
    code: "RAMADAN-2026",
    delivery_areas: [
      {
        address_line: "Jl. Amanah No. 10, dekat masjid",
        city: "Kota Bandung",
        client_id: areaClientId,
        name: "Bandung Utara",
        province: "Jawa Barat",
        quota_capacity: 120,
      },
    ],
    fund_type: "sedekah",
    goods_budget_amount: 1_500_000,
    goods_plan_items: [
      {
        product_id: crypto.randomUUID(),
        quantity: 50,
        unit_value: 30_000,
      },
    ],
    logistics_budget_amount: 500_000,
    name: "Pangan Ramadhan 1447 H",
    partner_assignments: [
      {
        assignment_role: "distributor",
        delivery_area_client_id: areaClientId,
        partner_contact_id: crypto.randomUUID(),
        readiness_status: "ready",
      } as {
        assignment_role: string;
        delivery_area_client_id: string;
        partner_contact_id?: string;
        partner_organization_id?: string;
        readiness_status: string;
      },
    ],
    support_modes: ["cash", "in_kind", "logistics"],
    target_beneficiary_count: 120,
    target_beneficiary_type: "family",
  };
}

describe("initial program plan schema", () => {
  it("menerima program beserta beberapa rencana penyaluran", () => {
    expect(createInitialProgramPlanSchema.safeParse(validPlan()).success).toBe(
      true,
    );
  });

  it("menolak mitra yang ditautkan ke area yang tidak ada", () => {
    const input = validPlan();
    input.partner_assignments[0]!.delivery_area_client_id = crypto.randomUUID();

    expect(createInitialProgramPlanSchema.safeParse(input).success).toBe(false);
  });

  it("menolak nilai barang jika bentuk dukungannya tidak dipilih", () => {
    const input = validPlan();
    input.support_modes = ["cash"];

    expect(createInitialProgramPlanSchema.safeParse(input).success).toBe(false);
  });

  it("menolak valuasi barang yang tidak sama dengan rincian barang", () => {
    const input = validPlan();
    input.goods_budget_amount = 1_600_000;

    expect(createInitialProgramPlanSchema.safeParse(input).success).toBe(false);
  });

  it("menerima lembaga mitra aktif sebagai sumber penugasan", () => {
    const input = validPlan();
    const assignment = input.partner_assignments[0]!;
    assignment.partner_organization_id = crypto.randomUUID();
    delete assignment.partner_contact_id;

    expect(createInitialProgramPlanSchema.safeParse(input).success).toBe(true);
  });

  it("menolak penugasan yang mengirim contact dan lembaga sekaligus", () => {
    const input = validPlan();
    input.partner_assignments[0]!.partner_organization_id = crypto.randomUUID();

    expect(createInitialProgramPlanSchema.safeParse(input).success).toBe(false);
  });
});
