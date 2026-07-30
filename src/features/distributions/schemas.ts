import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/, "Nominal tidak valid.")
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari nol.");

export const distributionPlanFormSchema = z.object({
  amount: money,
  case_id: z.string().uuid("Pilih kasus penerima."),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  disbursement_id: z.string().uuid("Pilih pencairan dana."),
  distribution_method: z.enum([
    "cash",
    "bank_transfer",
    "voucher",
    "vendor_payment",
    "reimbursement",
  ]),
  planned_at: z.string().min(1, "Waktu rencana wajib diisi."),
  purpose: z.string().trim().min(10).max(2000),
  requires_confirmation: z.boolean(),
});

export type DistributionPlanFormValues = z.input<
  typeof distributionPlanFormSchema
>;
