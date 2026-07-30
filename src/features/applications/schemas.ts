import { z } from "zod";

export const applicationFormSchema = z.object({
  applicant_contact_id: z.string().uuid("Pilih penerima manfaat."),
  channel: z.enum(["walk_in", "referral", "partner", "online", "field"]),
  notes: z.string().trim().max(4000).optional(),
  program_id: z.string().uuid("Pilih program aktif."),
  requested_support: z
    .string()
    .trim()
    .min(10, "Jelaskan kebutuhan minimal 10 karakter.")
    .max(4000),
  urgency: z.enum(["normal", "urgent", "emergency"]),
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
