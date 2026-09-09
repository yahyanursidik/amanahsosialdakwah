import { describe, expect, it } from "vitest";

import {
  canReadProgramBeneficiaryList,
  resolveProgramBeneficiaryJourneyAccess,
} from "./program-beneficiary-journey-rules";

describe("program beneficiary journey access", () => {
  it("requires application, case, and contact read permissions for the candidate list", () => {
    const access = resolveProgramBeneficiaryJourneyAccess(
      new Set(["applications.read", "cases.read"]),
    );

    expect(canReadProgramBeneficiaryList(access)).toBe(false);
  });

  it("exposes only explicitly granted journey sections", () => {
    const access = resolveProgramBeneficiaryJourneyAccess(
      new Set([
        "applications.read",
        "cases.read",
        "crm_contacts.read",
        "distributions.read",
      ]),
    );

    expect(canReadProgramBeneficiaryList(access)).toBe(true);
    expect(access.canReadDistributions).toBe(true);
    expect(access.canReadAssessments).toBe(false);
    expect(access.canReadApprovals).toBe(false);
  });
});
