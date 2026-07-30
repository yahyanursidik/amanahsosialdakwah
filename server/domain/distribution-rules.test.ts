import { describe, expect, it } from "vitest";

import {
  assertDistributionCompletion,
  assertDistributionTransition,
  assertIndependentDistributionVerifier,
} from "./distribution-rules";

describe("distribution rules", () => {
  it("menerima alur state yang sah", () => {
    expect(() => assertDistributionTransition("draft", "ready")).not.toThrow();
    expect(() =>
      assertDistributionTransition("verified", "completed"),
    ).not.toThrow();
  });

  it("menolak lompatan state", () => {
    expect(() => assertDistributionTransition("draft", "completed")).toThrow();
  });

  it("mencegah creator dan executor memverifikasi sendiri", () => {
    expect(() =>
      assertIndependentDistributionVerifier("creator", "executor", "creator"),
    ).toThrow();
    expect(() =>
      assertIndependentDistributionVerifier("creator", "executor", "other"),
    ).not.toThrow();
  });

  it("mewajibkan execution, evidence, confirmation, dan verification", () => {
    expect(() =>
      assertDistributionCompletion({
        beneficiaryValid: true,
        evidenceCount: 1,
        executed: true,
        hasConfirmation: true,
        requiresConfirmation: true,
        verified: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertDistributionCompletion({
        beneficiaryValid: true,
        evidenceCount: 0,
        executed: true,
        hasConfirmation: true,
        requiresConfirmation: true,
        verified: true,
      }),
    ).toThrow("bukti");
  });
});
