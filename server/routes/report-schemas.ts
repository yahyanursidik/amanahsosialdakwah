import { z } from "zod";

export const reportQuerySchema = z.object({
  range: z.enum(["30d", "90d", "365d"]).default("30d"),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
