import { z } from "zod";

export const assessmentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const templateVersionParamsSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
});

export const assessmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});

const optionSchema = z.object({
  label: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(100),
});

const scoringRulesSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("none"),
  }),
  z.object({
    type: z.literal("exact"),
    values: z.record(z.string(), z.number().min(0).max(1_000_000)),
  }),
  z.object({
    type: z.literal("range"),
    ranges: z
      .array(
        z
          .object({
            min: z.number().optional(),
            max: z.number().optional(),
            score: z.number().min(0).max(1_000_000),
          })
          .refine(
            (value) =>
              value.min === undefined ||
              value.max === undefined ||
              value.min <= value.max,
            "Rentang minimum tidak boleh melebihi maksimum.",
          ),
      )
      .min(1)
      .max(50),
  }),
]);

const questionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
    prompt: z.string().trim().min(3).max(1000),
    help_text: z.string().trim().max(1000).optional(),
    question_type: z.enum([
      "short_text",
      "long_text",
      "number",
      "boolean",
      "single_select",
      "multi_select",
      "date",
    ]),
    required: z.boolean().default(false),
    evidence_required: z.boolean().default(false),
    options: z.array(optionSchema).max(100).default([]),
    scoring_rules: scoringRulesSchema.default({ type: "none" }),
    max_score: z.number().min(0).max(1_000_000).default(0),
  })
  .superRefine((value, context) => {
    const optionQuestion =
      value.question_type === "single_select" ||
      value.question_type === "multi_select";
    const exactQuestion =
      optionQuestion || value.question_type === "boolean";
    if (optionQuestion && value.options.length < 2) {
      context.addIssue({
        code: "custom",
        message: "Pertanyaan pilihan memerlukan minimal dua opsi.",
        path: ["options"],
      });
    }
    if (
      new Set(value.options.map((option) => option.value)).size !==
      value.options.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Nilai opsi harus unik.",
        path: ["options"],
      });
    }
    if (
      value.scoring_rules.type === "range" &&
      value.question_type !== "number"
    ) {
      context.addIssue({
        code: "custom",
        message: "Scoring rentang hanya berlaku untuk pertanyaan angka.",
        path: ["scoring_rules"],
      });
    }
    if (value.scoring_rules.type === "exact" && !exactQuestion) {
      context.addIssue({
        code: "custom",
        message: "Scoring exact hanya berlaku untuk pilihan atau boolean.",
        path: ["scoring_rules"],
      });
    }
    if (
      value.scoring_rules.type === "exact" &&
      Object.keys(value.scoring_rules.values).length === 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Scoring exact memerlukan minimal satu nilai.",
        path: ["scoring_rules"],
      });
    }
    if (value.max_score > 0 && value.scoring_rules.type === "none") {
      context.addIssue({
        code: "custom",
        message: "Pertanyaan dengan skor maksimum memerlukan aturan scoring.",
        path: ["scoring_rules"],
      });
    }
    if (value.max_score === 0 && value.scoring_rules.type !== "none") {
      context.addIssue({
        code: "custom",
        message: "Aturan scoring memerlukan skor maksimum lebih dari nol.",
        path: ["max_score"],
      });
    }
  });

const versionStructureSchema = z.object({
  passing_score: z.number().min(0).max(1_000_000),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(200),
        description: z.string().trim().max(1000).optional(),
        questions: z.array(questionSchema).min(1).max(100),
      }),
    )
    .min(1)
    .max(30),
});

export const createAssessmentTemplateSchema = versionStructureSchema.extend({
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
});

export const createTemplateVersionSchema = versionStructureSchema;

export const publishTemplateVersionSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const createAssessmentSchema = z.object({
  case_id: z.string().uuid(),
  template_version_id: z.string().uuid(),
});

const answerValueSchema = z.union([
  z.string().max(10_000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(200)).max(100),
]);

export const saveAssessmentAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        value: answerValueSchema,
      }),
    )
    .min(1)
    .max(300),
});

export const submitAssessmentSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const reviewAssessmentSchema = z.object({
  decision: z.enum(["approved", "revision_requested"]),
  comment: z.string().trim().min(10).max(4000),
});

export type AssessmentListQuery = z.infer<
  typeof assessmentListQuerySchema
>;
export type CreateAssessmentInput = z.infer<
  typeof createAssessmentSchema
>;
export type CreateAssessmentTemplateInput = z.infer<
  typeof createAssessmentTemplateSchema
>;
export type CreateTemplateVersionInput = z.infer<
  typeof createTemplateVersionSchema
>;
export type PublishTemplateVersionInput = z.infer<
  typeof publishTemplateVersionSchema
>;
export type ReviewAssessmentInput = z.infer<
  typeof reviewAssessmentSchema
>;
export type SaveAssessmentAnswersInput = z.infer<
  typeof saveAssessmentAnswersSchema
>;
export type SubmitAssessmentInput = z.infer<
  typeof submitAssessmentSchema
>;
