import { describe, expect, it } from "vitest";

import { createComplaintSchema, createRiskFlagSchema } from "./governance-schemas";

describe("governance schemas", () => {
  it("menerima risk flag lengkap", () => {
    expect(createRiskFlagSchema.safeParse({
      description: "Risiko keterlambatan penyaluran memerlukan mitigasi segera.",
      risk_type: "operational",
      severity: "high",
      subject_type: "distribution",
      title: "Penyaluran berpotensi terlambat",
    }).success).toBe(true);
  });

  it("menolak contact pada pengaduan anonim", () => {
    expect(createComplaintSchema.safeParse({
      category: "service",
      channel: "web",
      complainant_contact_id: "10000000-0000-4000-8000-000000000001",
      description: "Pengaduan layanan yang perlu segera ditindaklanjuti petugas.",
      is_anonymous: true,
      received_at: "2026-08-09T00:00:00.000Z",
      title: "Keluhan layanan lapangan",
    }).success).toBe(false);
  });
});
