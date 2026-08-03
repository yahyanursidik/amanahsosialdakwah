import { describe, expect, it } from "vitest";

import {
  assertIndependentActor,
  assertKafalahNeedTransition,
  buildInstallments,
} from "./kafalah-rules";

describe("kafalah rules", () => {
  it("menerapkan maker-checker", () => {
    expect(() =>
      assertIndependentActor({
        actorId: "checker",
        makerId: "maker",
        operation: "Approval",
      }),
    ).not.toThrow();
    expect(() =>
      assertIndependentActor({
        actorId: "maker",
        makerId: "maker",
        operation: "Approval",
      }),
    ).toThrow("petugas yang berbeda");
  });

  it("menolak perubahan kebutuhan final", () => {
    expect(() =>
      assertKafalahNeedTransition("draft", "approved"),
    ).not.toThrow();
    expect(() => assertKafalahNeedTransition("matched", "approved")).toThrow();
  });

  it("membuat jadwal exact tanpa melebihi matching", () => {
    expect(
      buildInstallments({
        endDate: "2026-03-01",
        frequency: "monthly",
        periodicAmount: "400.00",
        startDate: "2026-01-01",
        totalAmount: "1000.00",
      }),
    ).toEqual([
      { amount: "400.00", dueDate: "2026-01-01", installmentNumber: 1 },
      { amount: "400.00", dueDate: "2026-02-01", installmentNumber: 2 },
      { amount: "200.00", dueDate: "2026-03-01", installmentNumber: 3 },
    ]);
  });
});
