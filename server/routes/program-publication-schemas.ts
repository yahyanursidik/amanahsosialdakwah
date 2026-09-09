import { z } from "zod";

export const programPublicationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const publicProgramSlugParamsSchema = z.object({
  slug: z.string().uuid(),
});

export const programPublicationDraftSchema = z.object({
  impact_headline: z.string().max(180).optional().nullable(),
  public_slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  public_summary: z.string().min(20).max(1_200),
  public_title: z.string().min(3).max(200),
  report_narrative: z.string().min(20).max(8_000),
  report_period_end: z.string().date().optional().nullable(),
  report_period_start: z.string().date().optional().nullable(),
  report_title: z.string().min(3).max(200),
  reported_beneficiary_count: z.coerce.number().int().min(0),
  reported_cash_amount: z.coerce.number().min(0).optional().nullable(),
  reported_goods_value: z.coerce.number().min(0).optional().nullable(),
  reported_logistics_amount: z.coerce.number().min(0).optional().nullable(),
}).refine(
  (value) => !value.report_period_start || !value.report_period_end || value.report_period_end >= value.report_period_start,
  { message: "Periode akhir laporan harus setelah periode awal.", path: ["report_period_end"] },
);

export type ProgramPublicationDraftInput = z.infer<typeof programPublicationDraftSchema>;
