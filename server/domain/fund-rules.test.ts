import { describe, expect, it } from "vitest";

import {
  applyFundMovement,
  assertRestrictionCompatibility,
  assertSufficientFunds,
  commitmentStatus,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "./fund-rules";

describe("fund rules", () => {
  it("menghitung uang tanpa floating point", () => {
    expect(moneyToMinorUnits("1000000.25")).toBe(100000025n);
    expect(minorUnitsToMoney(100000025n)).toBe("1000000.25");
    expect(() => moneyToMinorUnits("1.234")).toThrow(/tidak valid/);
  });

  it("menolak over-allocation", () => {
    expect(() => assertSufficientFunds("100.00", "100.01")).toThrow(
      /tidak mencukupi/,
    );
    expect(() => assertSufficientFunds("100.00", "100.00")).not.toThrow();
  });

  it("memaksa kompatibilitas restricted fund", () => {
    expect(() =>
      assertRestrictionCompatibility({
        allocationProgramId: "program-b",
        restrictionProgramId: "program-a",
        restrictionType: "program",
      }),
    ).toThrow(/tidak kompatibel/);
    expect(() =>
      assertRestrictionCompatibility({
        allocationProgramId: "program-b",
        restrictionProgramId: null,
        restrictionType: "unrestricted",
      }),
    ).not.toThrow();
  });

  it("mempertahankan saldo non-negatif melalui ledger", () => {
    const received = applyFundMovement(
      { allocated: 0n, available: 0n, disbursed: 0n },
      { allocated: 0n, available: 10000n, disbursed: 0n },
    );
    const allocated = applyFundMovement(received, {
      allocated: 7000n,
      available: -7000n,
      disbursed: 0n,
    });
    expect(allocated).toEqual({
      allocated: 7000n,
      available: 3000n,
      disbursed: 0n,
    });
    expect(() =>
      applyFundMovement(allocated, {
        allocated: -7001n,
        available: 0n,
        disbursed: 7001n,
      }),
    ).toThrow(/saldo negatif/);
  });

  it("membedakan commitment dan receipt", () => {
    expect(commitmentStatus("100.00", "0.00")).toBe("active");
    expect(commitmentStatus("100.00", "50.00")).toBe("partially_received");
    expect(commitmentStatus("100.00", "100.00")).toBe("fulfilled");
  });
});
