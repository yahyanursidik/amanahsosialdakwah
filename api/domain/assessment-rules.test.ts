import { describe, expect, it } from "vitest";

import {
  assertIndependentReviewer,
  calculateAssessmentScore,
  canEditAssessment,
  canReviewAssessment,
  scoreAnswer,
  type ScorableQuestion,
} from "./assessment-rules";

const questions: ScorableQuestion[] = [
  {
    id: "income",
    maxScore: 40,
    options: [
      { label: "Tidak ada", value: "none" },
      { label: "Rendah", value: "low" },
    ],
    questionType: "single_select",
    required: true,
    scoringRules: {
      type: "exact",
      values: { low: 20, none: 40 },
    },
  },
  {
    id: "dependants",
    maxScore: 60,
    options: [],
    questionType: "number",
    required: true,
    scoringRules: {
      ranges: [
        { max: 2, min: 0, score: 10 },
        { min: 3, score: 60 },
      ],
      type: "range",
    },
  },
];

describe("assessment rules", () => {
  it("menghitung skor dan outcome hanya dari aturan template", () => {
    const result = calculateAssessmentScore(
      questions,
      new Map<string, unknown>([
        ["income", "none"],
        ["dependants", 4],
      ]),
      70,
    );

    expect(result.totalScore).toBe(100);
    expect(result.percentage).toBe(100);
    expect(result.outcome).toBe("eligible");
  });

  it("membatasi skor jawaban pada max score", () => {
    expect(
      scoreAnswer(
        {
          ...questions[0]!,
          scoringRules: {
            type: "exact",
            values: { none: 999 },
          },
        },
        "none",
      ),
    ).toBe(40);
  });

  it("menolak submit ketika jawaban wajib belum lengkap", () => {
    expect(() =>
      calculateAssessmentScore(
        questions,
        new Map([["income", "low"]]),
        70,
      ),
    ).toThrow("Semua pertanyaan wajib");
  });

  it("mencegah self-review", () => {
    expect(() => assertIndependentReviewer("profile-a", "profile-a")).toThrow(
      "tidak boleh mereview",
    );
    expect(() =>
      assertIndependentReviewer("profile-a", "profile-b"),
    ).not.toThrow();
  });

  it("membatasi transisi edit dan review", () => {
    expect(canEditAssessment("revision_requested")).toBe(true);
    expect(canEditAssessment("submitted")).toBe(false);
    expect(canReviewAssessment("submitted")).toBe(true);
    expect(canReviewAssessment("approved")).toBe(false);
  });
});
