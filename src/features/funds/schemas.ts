import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, "Gunakan nominal positif, maksimal 2 desimal.")
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari nol.");
const currency = z.string().trim().regex(/^[A-Z]{3}$/, "Gunakan kode mata uang 3 huruf.");
const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional();

export const fundRestrictionFormSchema = z
  .object({
    code: z.string().trim().min(2).max(64),
    currency,
    name: z.string().trim().min(3).max(200),
    program_id: optionalUuid,
    restriction_type: z.enum(["unrestricted", "program"]),
  })
  .superRefine((value, context) => {
    if (value.restriction_type === "program" && !value.program_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Program wajib untuk dana terikat.",
        path: ["program_id"],
      });
    }
  });

export const fundCommitmentFormSchema = z.object({
  amount: money,
  committed_at: z.string().min(1),
  currency,
  donor_contact_id: optionalUuid,
  expected_at: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
  restriction_id: z.string().uuid(),
});

export const fundReceiptFormSchema = z.object({
  amount: money,
  commitment_id: optionalUuid,
  currency,
  donor_contact_id: optionalUuid,
  external_reference: z.string().trim().max(200).optional(),
  payment_method: z.enum(["bank_transfer", "cash", "card", "gateway", "other"]),
  received_at: z.string().min(1),
  restriction_id: z.string().uuid(),
});

export const fundAllocationFormSchema = z.object({
  amount: money,
  currency,
  program_id: z.string().uuid(),
  purpose: z.string().trim().min(10).max(2000),
  restriction_id: z.string().uuid(),
});

export const fundDisbursementFormSchema = z.object({
  allocation_id: z.string().uuid(),
  amount: money,
  currency,
  disbursed_at: z.string().min(1),
  external_reference: z.string().trim().max(200).optional(),
  payment_method: z.enum(["bank_transfer", "cash", "card", "gateway", "other"]),
  recipient_reference: z.string().trim().min(2).max(200),
  recipient_type: z.enum(["beneficiary", "partner", "vendor", "staff", "other"]),
});

export const fundReconciliationFormSchema = z.object({
  currency,
  notes: z.string().trim().max(2000).optional(),
  period_ended_at: z.string().min(1),
  restriction_id: z.string().uuid(),
  statement_balance: z
    .string()
    .trim()
    .regex(/^-?(0|[1-9]\d*)(\.\d{1,2})?$/, "Nominal tidak valid."),
});

export type FundRestrictionFormValues = z.infer<typeof fundRestrictionFormSchema>;
export type FundCommitmentFormValues = z.infer<typeof fundCommitmentFormSchema>;
export type FundReceiptFormValues = z.infer<typeof fundReceiptFormSchema>;
export type FundAllocationFormValues = z.infer<typeof fundAllocationFormSchema>;
export type FundDisbursementFormValues = z.infer<typeof fundDisbursementFormSchema>;
export type FundReconciliationFormValues = z.infer<typeof fundReconciliationFormSchema>;
