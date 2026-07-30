import { z } from "zod";

export const approvalWorkflowFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Kode minimal 2 karakter.")
    .max(64)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Kode hanya boleh berisi huruf, angka, _ atau -.",
    ),
  name: z.string().trim().min(3, "Nama minimal 3 karakter.").max(200),
  description: z.string().trim().max(2000).optional(),
  resource_type: z.enum(["assessment", "case", "fund_allocation"]),
});

export const approvalRequestFormSchema = z.object({
  workflow_version_id: z.string().uuid("Pilih workflow aktif."),
  subject_type: z.enum(["assessment", "case", "fund_allocation"]),
  subject_id: z.string().uuid("Pilih subjek."),
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(300),
});

export const approvalDecisionFormSchema = z.object({
  decision: z.enum(["approved", "rejected", "revision_requested"]),
  comment: z.string().trim().min(10, "Catatan minimal 10 karakter.").max(4000),
});

export type ApprovalWorkflowFormValues = z.infer<
  typeof approvalWorkflowFormSchema
>;
export type ApprovalRequestFormValues = z.infer<
  typeof approvalRequestFormSchema
>;
export type ApprovalDecisionFormValues = z.infer<
  typeof approvalDecisionFormSchema
>;
