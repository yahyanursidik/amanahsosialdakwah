import { z } from "zod";

const moneySchema = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/, "Nominal tidak valid.")
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari nol.");
const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

export const fundIdParamsSchema = z.object({ id: z.string().uuid() });
export const fundListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const createFundRestrictionSchema = z
  .object({
    code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(3).max(200),
    restriction_type: z.enum(["unrestricted", "program"]),
    program_id: z.string().uuid().nullable().optional(),
    currency: currencySchema.default("IDR"),
  })
  .superRefine((value, context) => {
    if (value.restriction_type === "program" && !value.program_id) {
      context.addIssue({
        code: "custom",
        message: "Dana terikat program memerlukan program.",
        path: ["program_id"],
      });
    }
    if (value.restriction_type === "unrestricted" && value.program_id) {
      context.addIssue({
        code: "custom",
        message: "Dana tidak terikat tidak boleh memiliki program.",
        path: ["program_id"],
      });
    }
  });

export const createFundCommitmentSchema = z.object({
  donor_contact_id: z.string().uuid().nullable().optional(),
  restriction_id: z.string().uuid(),
  amount: moneySchema,
  currency: currencySchema.default("IDR"),
  committed_at: z.string().datetime({ offset: true }),
  expected_at: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const postFundReceiptSchema = z.object({
  commitment_id: z.string().uuid().nullable().optional(),
  restriction_id: z.string().uuid(),
  donor_contact_id: z.string().uuid().nullable().optional(),
  amount: moneySchema,
  currency: currencySchema.default("IDR"),
  received_at: z.string().datetime({ offset: true }),
  payment_method: z.enum([
    "bank_transfer",
    "cash",
    "card",
    "gateway",
    "other",
  ]),
  external_reference: z.string().trim().max(200).optional(),
});

export const createFundAllocationSchema = z.object({
  restriction_id: z.string().uuid(),
  program_id: z.string().uuid(),
  amount: moneySchema,
  currency: currencySchema.default("IDR"),
  purpose: z.string().trim().min(10).max(2000),
});

export const postFundDisbursementSchema = z.object({
  allocation_id: z.string().uuid(),
  amount: moneySchema,
  currency: currencySchema.default("IDR"),
  recipient_type: z.enum([
    "beneficiary",
    "partner",
    "vendor",
    "staff",
    "other",
  ]),
  recipient_reference: z.string().trim().min(2).max(200),
  payment_method: z.enum([
    "bank_transfer",
    "cash",
    "card",
    "gateway",
    "other",
  ]),
  external_reference: z.string().trim().max(200).optional(),
  disbursed_at: z.string().datetime({ offset: true }),
});

export const reverseFundTransactionSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});

export const createFundReconciliationSchema = z.object({
  restriction_id: z.string().uuid(),
  currency: currencySchema.default("IDR"),
  period_ended_at: z.string().datetime({ offset: true }),
  statement_balance: z
    .string()
    .trim()
    .regex(/^-?(0|[1-9]\d{0,17})(\.\d{1,2})?$/),
  notes: z.string().trim().max(2000).optional(),
});

export type FundListQuery = z.infer<typeof fundListQuerySchema>;
export type CreateFundRestrictionInput = z.infer<
  typeof createFundRestrictionSchema
>;
export type CreateFundCommitmentInput = z.infer<
  typeof createFundCommitmentSchema
>;
export type PostFundReceiptInput = z.infer<typeof postFundReceiptSchema>;
export type CreateFundAllocationInput = z.infer<
  typeof createFundAllocationSchema
>;
export type PostFundDisbursementInput = z.infer<
  typeof postFundDisbursementSchema
>;
export type ReverseFundTransactionInput = z.infer<
  typeof reverseFundTransactionSchema
>;
export type CreateFundReconciliationInput = z.infer<
  typeof createFundReconciliationSchema
>;
