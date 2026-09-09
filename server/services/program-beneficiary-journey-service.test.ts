import { describe, expect, it } from "vitest";

import { approvalSubjectAssessmentClause } from "./program-beneficiary-journey-service";

describe("approvalSubjectAssessmentClause", () => {
  it("memakai alias request yang berada dalam scope lateral approval", () => {
    const clause = approvalSubjectAssessmentClause(true);

    expect(clause).toContain("request.subject_type = 'assessment'");
    expect(clause).toContain("request.subject_id = assessment.id");
    expect(clause).not.toContain("approval_request.subject_");
  });

  it("tidak menambahkan relasi asesmen ketika akses asesmen tidak tersedia", () => {
    expect(approvalSubjectAssessmentClause(false)).toBe("");
  });
});
