import { describe, expect, it } from "vitest";

import {
  assertIndependentClosure,
  assertIndependentVerification,
  assertGovernanceTransition,
  calculateGovernanceSla,
} from "./governance-rules";

describe("governance rules", () => {
  it("memberi SLA lebih cepat untuk risiko kritis", () => {
    expect(
      calculateGovernanceSla("critical", "2026-08-09T00:00:00.000Z"),
    ).toEqual({
      resolutionDueAt: "2026-08-10T00:00:00.000Z",
      responseDueAt: "2026-08-09T04:00:00.000Z",
    });
  });

  it("mencegah pelapor menutup laporan sendiri", () => {
    expect(() => assertIndependentClosure("same", "same")).toThrow();
  });

  it("mencegah self-verification corrective action", () => {
    expect(() => assertIndependentVerification("same", "same")).toThrow();
  });

  it("menolak lompatan status insiden langsung ke closed", () => {
    expect(() =>
      assertGovernanceTransition("incident", "reported", "closed"),
    ).toThrow();
  });
});
