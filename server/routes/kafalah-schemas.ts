import { z } from "zod";

const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .refine((v) => Number(v) > 0);
const date = z.string().date();
const notes = z.string().trim().min(10).max(3000);
export const kafalahIdParamsSchema = z.object({ id: z.string().uuid() });
export const kafalahListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});
export const kafalahIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);
export const createKafalahNeedSchema = z.object({
  beneficiary_contact_id: z.string().uuid(),
  case_id: z.string().uuid().optional(),
  need_type: z.enum([
    "education",
    "living",
    "health",
    "orphan_care",
    "dakwah",
    "other",
  ]),
  title: z.string().trim().min(5).max(200),
  description: notes,
  approved_amount: money,
  currency: z
    .string()
    .length(3)
    .transform((v) => v.toUpperCase())
    .default("IDR"),
  period_months: z.coerce.number().int().min(1).max(120),
});
export const createKafalahMatchSchema = z
  .object({
    need_id: z.string().uuid(),
    sponsor_contact_id: z.string().uuid(),
    matched_amount: money,
    start_date: date,
    end_date: date,
  })
  .refine((v) => v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "Tanggal akhir tidak valid.",
  });
export const createKafalahContractSchema = z
  .object({
    match_id: z.string().uuid(),
    frequency: z.enum(["monthly", "quarterly", "one_time"]),
    periodic_amount: money,
    start_date: date,
    end_date: date,
    terms: z.string().trim().min(20).max(5000),
  })
  .refine((v) => v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "Tanggal akhir tidak valid.",
  });
export const kafalahPaymentSchema = z.object({
  payment_reference: z.string().trim().min(5).max(160),
  amount: money,
  paid_at: z.string().datetime({ offset: true }),
  channel: z.string().trim().min(2).max(80),
});
export const kafalahDistributionSchema = z.object({
  payment_id: z.string().uuid(),
  amount: money,
  distributed_at: z.string().datetime({ offset: true }),
  method: z.string().trim().min(2).max(80),
  confirmation_notes: notes,
});
export const kafalahMonitoringSchema = z
  .object({
    period_start: date,
    period_end: date,
    outcome: z.enum(["stable", "improved", "declined", "critical"]),
    summary: z.string().trim().min(20).max(5000),
  })
  .refine((v) => v.period_end >= v.period_start, {
    path: ["period_end"],
    message: "Periode tidak valid.",
  });
export const kafalahMonitoringDecisionSchema = z.object({
  decision: z.enum(["verified", "revision_requested"]),
  notes,
});
export const kafalahRenewalSchema = z
  .object({
    requested_start_date: date,
    requested_end_date: date,
    periodic_amount: money,
    reason: z.string().trim().min(20).max(5000),
  })
  .refine((v) => v.requested_end_date >= v.requested_start_date, {
    path: ["requested_end_date"],
    message: "Periode tidak valid.",
  });
export const kafalahRenewalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes,
});
export type KafalahListQuery = z.infer<typeof kafalahListQuerySchema>;
export type CreateKafalahNeedInput = z.infer<typeof createKafalahNeedSchema>;
export type CreateKafalahMatchInput = z.infer<typeof createKafalahMatchSchema>;
export type CreateKafalahContractInput = z.infer<
  typeof createKafalahContractSchema
>;
export type KafalahPaymentInput = z.infer<typeof kafalahPaymentSchema>;
export type KafalahDistributionInput = z.infer<
  typeof kafalahDistributionSchema
>;
export type KafalahMonitoringInput = z.infer<typeof kafalahMonitoringSchema>;
export type KafalahMonitoringDecisionInput = z.infer<
  typeof kafalahMonitoringDecisionSchema
>;
export type KafalahRenewalInput = z.infer<typeof kafalahRenewalSchema>;
export type KafalahRenewalDecisionInput = z.infer<
  typeof kafalahRenewalDecisionSchema
>;
