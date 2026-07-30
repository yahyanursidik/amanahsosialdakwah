import { describe, expect, it } from "vitest";

import {
  applicationStatusAfterScreening,
  canAssignCase,
  canConvertApplication,
  canSubmitApplication,
} from "./application-case-rules";

describe("application and case rules", () => {
  it("hanya mengizinkan draft untuk submit", () => {
    expect(canSubmitApplication("draft")).toBe(true);
    expect(canSubmitApplication("submitted")).toBe(false);
  });

  it("memetakan hasil screening ke status terkontrol", () => {
    expect(applicationStatusAfterScreening("submitted", "pass")).toBe(
      "accepted",
    );
    expect(applicationStatusAfterScreening("submitted", "review")).toBe(
      "in_screening",
    );
    expect(applicationStatusAfterScreening("in_screening", "reject")).toBe(
      "rejected",
    );
  });

  it("menolak screening dari status terminal", () => {
    expect(() => applicationStatusAfterScreening("accepted", "pass")).toThrow(
      /tidak dapat di-screening/,
    );
  });

  it("hanya mengonversi pengajuan diterima dan menugaskan kasus aktif", () => {
    expect(canConvertApplication("accepted")).toBe(true);
    expect(canConvertApplication("submitted")).toBe(false);
    expect(canAssignCase("open")).toBe(true);
    expect(canAssignCase("closed")).toBe(false);
  });
});
