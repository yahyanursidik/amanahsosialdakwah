export function assertIndependentActor(input: {
  actorId: string;
  makerId: string;
  operation: string;
}): void {
  if (input.actorId === input.makerId) {
    throw new Error(`${input.operation} harus dilakukan petugas yang berbeda.`);
  }
}

export function assertKafalahNeedTransition(
  current: string,
  target: string,
): void {
  const transitions: Record<string, string[]> = {
    draft: ["approved", "cancelled"],
    approved: ["matched", "cancelled"],
    matched: ["fulfilled"],
    fulfilled: [],
    cancelled: [],
  };
  if (!transitions[current]?.includes(target)) {
    throw new Error(`Transisi kebutuhan ${current} ke ${target} tidak valid.`);
  }
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function buildScheduleDates(input: {
  endDate: string;
  frequency: "monthly" | "one_time" | "quarterly";
  startDate: string;
}): string[] {
  const start = dateOnly(input.startDate);
  const end = dateOnly(input.endDate);
  if (end < start) throw new Error("Periode kontrak tidak valid.");
  if (input.frequency === "one_time") return [input.startDate];
  const step = input.frequency === "monthly" ? 1 : 3;
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 120) {
    dates.push(isoDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + step);
  }
  return dates;
}

export function decimalToCents(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Nominal tidak valid.");
  const parts = value.split(".");
  const whole = parts[0];
  const fraction = parts[1] ?? "";
  if (whole === undefined) throw new Error("Nominal tidak valid.");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function centsToDecimal(value: bigint): string {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

export function buildInstallments(input: {
  endDate: string;
  frequency: "monthly" | "one_time" | "quarterly";
  periodicAmount: string;
  startDate: string;
  totalAmount: string;
}) {
  const dates = buildScheduleDates(input);
  const periodic = decimalToCents(input.periodicAmount);
  let remaining = decimalToCents(input.totalAmount);
  const installments = dates.map((dueDate, index) => {
    const amount = remaining < periodic ? remaining : periodic;
    remaining -= amount;
    return {
      amount: centsToDecimal(amount),
      dueDate,
      installmentNumber: index + 1,
    };
  });
  if (remaining > 0n) {
    throw new Error(
      "Periode dan nominal berkala belum menutup nilai matching.",
    );
  }
  return installments.filter((item) => item.amount !== "0.00");
}
