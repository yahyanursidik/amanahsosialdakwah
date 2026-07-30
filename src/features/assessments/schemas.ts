import { z } from "zod";

export const assessmentTemplateMetadataSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Kode minimal 2 karakter.")
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Kode hanya boleh berisi huruf, angka, _ atau -."),
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(200),
  description: z.string().trim().max(2000).optional(),
  passing_score: z.coerce.number().min(0),
});

export const assessmentTemplateVersionMetadataSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  passing_score: z.coerce.number().min(0),
});

export const createAssessmentFormSchema = z.object({
  case_id: z.string().uuid("Pilih kasus."),
  template_version_id: z.string().uuid("Pilih template aktif."),
});

export const assessmentReviewFormSchema = z.object({
  decision: z.enum(["approved", "revision_requested"]),
  comment: z.string().trim().min(10, "Catatan minimal 10 karakter.").max(4000),
});

export type AssessmentTemplateMetadataValues = z.infer<
  typeof assessmentTemplateMetadataSchema
>;
export type CreateAssessmentFormValues = z.infer<
  typeof createAssessmentFormSchema
>;
export type AssessmentReviewFormValues = z.infer<
  typeof assessmentReviewFormSchema
>;
