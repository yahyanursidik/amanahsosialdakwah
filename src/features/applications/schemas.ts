import { z } from "zod";

export const applicationFormSchema = z
  .object({
    applicant_contact_id: z
      .string()
      .uuid("Pilih pengaju atau penerima manfaat."),
    beneficiary_count: z
      .number({ invalid_type_error: "Isi jumlah penerima." })
      .int()
      .min(1, "Minimal satu penerima."),
    channel: z.enum(["walk_in", "referral", "partner", "online", "field"]),
    notes: z.string().trim().max(4000).optional(),
    program_id: z.string().uuid("Pilih program aktif."),
    requested_amount: z
      .string()
      .trim()
      .regex(/^(\d+(\.\d{1,2})?)?$/, "Gunakan angka tanpa titik ribuan.")
      .optional(),
    requested_support: z
      .string()
      .trim()
      .min(10, "Jelaskan kebutuhan minimal 10 karakter.")
      .max(4000),
    submitter_type: z.enum(["individual", "institution", "partner_on_behalf"]),
    submitting_partner_contact_id: z.string().optional(),
    urgency: z.enum(["normal", "urgent", "emergency"]),
  })
  .superRefine((value, context) => {
    if (
      value.submitter_type === "partner_on_behalf" &&
      !value.submitting_partner_contact_id
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih lembaga mitra yang mengajukan.",
        path: ["submitting_partner_contact_id"],
      });
    }
  });

export const screeningFormSchema = z.object({
  notes: z.string().trim().min(10).max(4000),
  result: z.enum(["pass", "review", "reject"]),
  risk_flags_text: z.string().trim().max(1000).optional(),
});

export const assignmentFormSchema = z.object({
  assigned_to: z.string().uuid("Pilih penanggung jawab."),
  note: z.string().trim().max(1000).optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
export type ScreeningFormValues = z.infer<typeof screeningFormSchema>;
