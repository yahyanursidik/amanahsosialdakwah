import { describe, expect, it } from "vitest";

import { createAssessmentTemplateSchema } from "./assessment-schemas";

function templateWithQuestion(question: Record<string, unknown>) {
  return {
    code: "ELIGIBILITY",
    name: "Kelayakan Dasar",
    passing_score: 5,
    sections: [
      {
        title: "Kondisi",
        questions: [
          {
            code: "INCOME",
            prompt: "Bagaimana kondisi penghasilan?",
            question_type: "single_select",
            required: true,
            evidence_required: false,
            options: [
              { label: "Tidak ada", value: "none" },
              { label: "Ada", value: "available" },
            ],
            scoring_rules: {
              type: "exact",
              values: { available: 0, none: 10 },
            },
            max_score: 10,
            ...question,
          },
        ],
      },
    ],
  };
}

describe("assessment API schemas", () => {
  it("menerima template pilihan dengan scoring exact", () => {
    expect(
      createAssessmentTemplateSchema.safeParse(templateWithQuestion({}))
        .success,
    ).toBe(true);
  });

  it("menolak skor maksimum tanpa aturan scoring", () => {
    expect(
      createAssessmentTemplateSchema.safeParse(
        templateWithQuestion({ scoring_rules: { type: "none" } }),
      ).success,
    ).toBe(false);
  });

  it("menolak scoring range pada pertanyaan non-angka", () => {
    expect(
      createAssessmentTemplateSchema.safeParse(
        templateWithQuestion({
          scoring_rules: {
            ranges: [{ min: 0, score: 10 }],
            type: "range",
          },
        }),
      ).success,
    ).toBe(false);
  });
});
