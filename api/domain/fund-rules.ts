export type FundBalance = {
  allocated: bigint;
  available: bigint;
  disbursed: bigint;
};

const moneyPattern = /^(0|[1-9]\d{0,17})(\.\d{1,2})?$/;

export function moneyToMinorUnits(value: string): bigint {
  const normalized = value.trim();
  if (!moneyPattern.test(normalized)) {
    throw new Error("Nominal uang tidak valid.");
  }
  const [whole = "0", fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function minorUnitsToMoney(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function assertSufficientFunds(
  available: string,
  requested: string,
): void {
  if (moneyToMinorUnits(requested) > moneyToMinorUnits(available)) {
    throw new Error("Saldo dana tidak mencukupi.");
  }
}

export function assertRestrictionCompatibility(input: {
  allocationProgramId: string;
  restrictionProgramId: string | null;
  restrictionType: "program" | "unrestricted";
}): void {
  if (
    input.restrictionType === "program" &&
    input.restrictionProgramId !== input.allocationProgramId
  ) {
    throw new Error("Dana terikat tidak kompatibel dengan program tujuan.");
  }
}

export function commitmentStatus(
  committedAmount: string,
  receivedAmount: string,
): "active" | "fulfilled" | "partially_received" {
  const committed = moneyToMinorUnits(committedAmount);
  const received = moneyToMinorUnits(receivedAmount);
  if (received <= 0n) return "active";
  if (received >= committed) return "fulfilled";
  return "partially_received";
}

export function applyFundMovement(
  balance: FundBalance,
  delta: FundBalance,
): FundBalance {
  const next = {
    allocated: balance.allocated + delta.allocated,
    available: balance.available + delta.available,
    disbursed: balance.disbursed + delta.disbursed,
  };
  if (next.available < 0n || next.allocated < 0n || next.disbursed < 0n) {
    throw new Error("Pergerakan dana menghasilkan saldo negatif.");
  }
  return next;
}
