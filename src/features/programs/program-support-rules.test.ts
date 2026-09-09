import { describe, expect, it } from "vitest";

import {
  programFormSchema,
  resolveProgramSupportModes,
  sumProgramSupportBudget,
} from "./schemas";

const baseProgram = {
  budget_amount: 0,
  category_id: "00000000-0000-4000-8000-000000000001",
  code: "PRG-SUPPORT-01",
  description: "",
  ends_at: "",
  fund_type: "general" as const,
  name: "Program Dukungan Campuran",
  objective: "",
  owner_id: "",
  starts_at: "",
  target_beneficiary_count: 10,
  target_beneficiary_type: "family" as const,
};

describe("program support planning", () => {
  it("menghitung total dari dana, valuasi barang, dan logistik", () => {
    expect(
      sumProgramSupportBudget({
        cash_budget_amount: 1_500_000,
        goods_budget_amount: 2_000_000,
        logistics_budget_amount: 250_000,
      }),
    ).toBe(3_750_000);
  });

  it("menerima program dengan dukungan barang dan biaya pengiriman", () => {
    const result = programFormSchema.safeParse({
      ...baseProgram,
      cash_budget_amount: 0,
      goods_budget_amount: 2_000_000,
      logistics_budget_amount: 250_000,
      support_modes: ["in_kind", "logistics"],
    });

    expect(result.success).toBe(true);
  });

  it("menolak valuasi komponen yang tidak dipilih sebagai bentuk dukungan", () => {
    const result = programFormSchema.safeParse({
      ...baseProgram,
      cash_budget_amount: 0,
      goods_budget_amount: 2_000_000,
      logistics_budget_amount: 0,
      support_modes: ["cash"],
    });

    expect(result.success).toBe(false);
  });

  it("mengamankan UI saat respons program lama belum memiliki bentuk dukungan", () => {
    expect(resolveProgramSupportModes(undefined)).toEqual(["cash"]);
    expect(resolveProgramSupportModes(["in_kind", "invalid"])).toEqual([
      "in_kind",
    ]);
  });
});
