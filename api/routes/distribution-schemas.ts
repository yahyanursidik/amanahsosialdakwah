import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari nol.");
const dateTime = z.string().datetime({ offset: true });

export const distributionIdParamsSchema = z.object({ id: z.string().uuid() });
export const distributionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});
export const distributionIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const createDistributionPlanSchema = z.object({
  amount: money,
  case_id: z.string().uuid(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  disbursement_id: z.string().uuid(),
  distribution_method: z.enum([
    "cash",
    "bank_transfer",
    "voucher",
    "vendor_payment",
    "reimbursement",
  ]),
  planned_at: dateTime,
  purpose: z.string().trim().min(10).max(2000),
  requires_confirmation: z.boolean().default(true),
});
export const distributionNoteSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});
export const assignDistributionSchema = z.object({
  membership_id: z.string().uuid(),
  notes: z.string().trim().max(2000).optional(),
});
export const executeDistributionSchema = z.object({
  amount: money,
  executed_at: dateTime,
  location_notes: z.string().trim().max(1000).optional(),
  notes: z.string().trim().min(10).max(4000),
  outcome: z.enum(["delivered", "failed"]),
});
export const addDistributionEvidenceSchema = z.object({
  captured_at: dateTime,
  description: z.string().trim().min(10).max(4000),
  evidence_kind: z.enum([
    "field_note",
    "beneficiary_statement",
    "receipt_reference",
  ]),
});
export const confirmDistributionSchema = z.object({
  confirmation_method: z.enum([
    "beneficiary_statement",
    "witness",
    "phone_call",
    "otp",
  ]),
  confirmed_at: dateTime,
  confirmed_by_name: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(2000).optional(),
});
export const verifyDistributionSchema = z.object({
  decision: z.enum(["verified", "revision_required"]),
  notes: z.string().trim().min(10).max(4000),
});
export const cancelDistributionSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});

export type DistributionListQuery = z.infer<typeof distributionListQuerySchema>;
export type CreateDistributionPlanInput = z.infer<
  typeof createDistributionPlanSchema
>;
export type AssignDistributionInput = z.infer<typeof assignDistributionSchema>;
export type ExecuteDistributionInput = z.infer<
  typeof executeDistributionSchema
>;
export type AddDistributionEvidenceInput = z.infer<
  typeof addDistributionEvidenceSchema
>;
export type ConfirmDistributionInput = z.infer<
  typeof confirmDistributionSchema
>;
export type VerifyDistributionInput = z.infer<
  typeof verifyDistributionSchema
>;
export type CancelDistributionInput = z.infer<
  typeof cancelDistributionSchema
>;
