export type AssessmentStatus =
  | "approved"
  | "draft"
  | "revision_requested"
  | "submitted";

export type AssessmentOutcome =
  | "eligible"
  | "manual_review"
  | "not_eligible"
  | "pending";

export type QuestionType =
  | "boolean"
  | "date"
  | "long_text"
  | "multi_select"
  | "number"
  | "short_text"
  | "single_select";

export type QuestionOption = {
  label: string;
  value: string;
};

export type ScoringRules =
  | {
      type: "exact";
      values: Record<string, number>;
    }
  | {
      ranges: Array<{
        max?: number;
        min?: number;
        score: number;
      }>;
      type: "range";
    }
  | {
      type: "none";
    };

export type ScorableQuestion = {
  id: string;
  maxScore: number;
  options: QuestionOption[];
  questionType: QuestionType;
  required: boolean;
  scoringRules: ScoringRules;
};

export type AssessmentScore = {
  maxScore: number;
  outcome: Exclude<AssessmentOutcome, "pending">;
  percentage: number;
  questionScores: Map<string, number>;
  totalScore: number;
};

function scalarKey(value: unknown): string | null {
  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return String(value);
  }

  return null;
}

export function isAnswerValueValid(
  question: Pick<
    ScorableQuestion,
    "options" | "questionType"
  >,
  value: unknown,
): boolean {
  const allowedOptions = new Set(
    question.options.map((option) => option.value),
  );

  switch (question.questionType) {
    case "short_text":
    case "long_text":
      return typeof value === "string" && value.trim().length > 0;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "single_select":
      return typeof value === "string" && allowedOptions.has(value);
    case "multi_select":
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(
          (item) => typeof item === "string" && allowedOptions.has(item),
        )
      );
    case "date":
      return (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
      );
  }
}

export function scoreAnswer(
  question: ScorableQuestion,
  value: unknown,
): number {
  if (!isAnswerValueValid(question, value)) {
    throw new Error("Nilai jawaban tidak sesuai tipe pertanyaan.");
  }

  let calculated = 0;

  if (question.scoringRules.type === "exact") {
    const rules = question.scoringRules;
    if (Array.isArray(value)) {
      calculated = value.reduce(
        (total, item) =>
          total + (rules.values[String(item)] ?? 0),
        0,
      );
    } else {
      const key = scalarKey(value);
      calculated = key === null ? 0 : (rules.values[key] ?? 0);
    }
  }

  if (
    question.scoringRules.type === "range" &&
    typeof value === "number"
  ) {
    const range = question.scoringRules.ranges.find(
      (candidate) =>
        (candidate.min === undefined || value >= candidate.min) &&
        (candidate.max === undefined || value <= candidate.max),
    );
    calculated = range?.score ?? 0;
  }

  return Math.min(question.maxScore, Math.max(0, calculated));
}

export function calculateAssessmentScore(
  questions: ScorableQuestion[],
  answers: Map<string, unknown>,
  passingScore: number,
): AssessmentScore {
  const missingRequired = questions.filter(
    (question) =>
      question.required &&
      (!answers.has(question.id) ||
        !isAnswerValueValid(question, answers.get(question.id))),
  );

  if (missingRequired.length > 0) {
    throw new Error("Semua pertanyaan wajib harus dijawab.");
  }

  const questionScores = new Map<string, number>();
  let totalScore = 0;

  for (const question of questions) {
    const value = answers.get(question.id);
    if (value === undefined) {
      questionScores.set(question.id, 0);
      continue;
    }

    const score = scoreAnswer(question, value);
    questionScores.set(question.id, score);
    totalScore += score;
  }

  const maxScore = questions.reduce(
    (total, question) => total + question.maxScore,
    0,
  );
  const percentage =
    maxScore === 0 ? 0 : Math.round((totalScore / maxScore) * 10_000) / 100;
  const outcome: Exclude<AssessmentOutcome, "pending"> =
    maxScore === 0
      ? "manual_review"
      : totalScore >= passingScore
        ? "eligible"
        : "not_eligible";

  return {
    maxScore,
    outcome,
    percentage,
    questionScores,
    totalScore,
  };
}

export function canEditAssessment(status: AssessmentStatus): boolean {
  return status === "draft" || status === "revision_requested";
}

export function canSubmitAssessment(status: AssessmentStatus): boolean {
  return status === "draft" || status === "revision_requested";
}

export function canReviewAssessment(status: AssessmentStatus): boolean {
  return status === "submitted";
}

export function assertIndependentReviewer(
  assessorProfileId: string,
  reviewerProfileId: string,
): void {
  if (assessorProfileId === reviewerProfileId) {
    throw new Error("Asesor tidak boleh mereview asesmennya sendiri.");
  }
}
