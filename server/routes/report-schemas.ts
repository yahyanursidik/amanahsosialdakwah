import { z } from "zod";

export const reportQuerySchema = z.object({
  range: z.enum(["30d", "90d", "365d"]).default("30d"),
});

export const stakeholderListQuerySchema = reportQuerySchema.extend({
  role: z
    .enum(["donor", "distribution_partner", "applicant"])
    .default("donor"),
});

export const stakeholderParamsSchema = z.object({
  contactId: z.string().uuid(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type StakeholderListQuery = z.infer<typeof stakeholderListQuerySchema>;
