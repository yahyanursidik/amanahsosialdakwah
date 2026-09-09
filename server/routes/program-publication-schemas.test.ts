import { describe, expect, it } from "vitest";

import {
  programPublicationDraftSchema,
  publicProgramSlugParamsSchema,
} from "./program-publication-schemas";

const draft = {
  impact_headline: "150 keluarga mendapatkan paket pangan.",
  public_slug: "paket-pangan-keluarga",
  public_summary: "Ringkasan publik mengenai tujuan dan jangkauan pelaksanaan program.",
  public_title: "Paket Pangan Keluarga",
  report_narrative: "Laporan publik ini menyampaikan kegiatan dan dampak agregat tanpa identitas penerima.",
  report_period_end: "2026-10-31",
  report_period_start: "2026-10-01",
  report_title: "Laporan Oktober 2026",
  reported_beneficiary_count: 150,
  reported_cash_amount: 1_000_000,
  reported_goods_value: 20_000_000,
  reported_logistics_amount: 300_000,
};

describe("program publication schemas", () => {
  it("menerima laporan publik agregat dan URL Program otomatis berbasis UUID", () => {
    expect(programPublicationDraftSchema.safeParse(draft).success).toBe(true);
    expect(publicProgramSlugParamsSchema.safeParse({ slug: crypto.randomUUID() }).success).toBe(true);
  });

  it("menolak slug yang tidak aman dan periode terbalik", () => {
    expect(programPublicationDraftSchema.safeParse({ ...draft, public_slug: "Program Rahasia" }).success).toBe(false);
    expect(programPublicationDraftSchema.safeParse({ ...draft, report_period_end: "2026-09-30" }).success).toBe(false);
  });

  it("menolak URL publik yang bukan ID Program", () => {
    expect(publicProgramSlugParamsSchema.safeParse({ slug: draft.public_slug }).success).toBe(false);
  });
});
