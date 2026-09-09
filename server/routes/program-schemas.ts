import { z } from "zod";

export const programIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const programBeneficiaryJourneyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  q: z.string().trim().max(120).optional(),
  stage: z
    .enum(["all", "needs_action", "in_distribution", "completed"])
    .default("all"),
});

export const createProgramFulfillmentSchema = z.object({
  application_id: z.string().uuid(),
  package_count: z.coerce.number().int().min(1).max(100_000),
  packing_id: z.string().uuid(),
  partner_contact_id: z.string().uuid().optional(),
  partner_pic_name: z.string().trim().min(2).max(160).optional(),
  partner_readiness_status: z
    .enum(["pending", "ready", "accepted", "declined"])
    .default("pending"),
});

export const programFulfillmentIdempotencyKeySchema = z
  .string()
  .min(16)
  .max(200);

export type CreateProgramFulfillmentInput = z.infer<
  typeof createProgramFulfillmentSchema
>;
export type ProgramBeneficiaryJourneyQuery = z.infer<
  typeof programBeneficiaryJourneyQuerySchema
>;
