import { describe, expect, it } from "vitest";

import { decodePhoto, verificationToAssessment } from "../services/field-service";
import { createFieldReportSchema, createFieldTasksSchema } from "./field-schemas";

const base = {
  client_reference: "fld-4b1f7a30-2d6e-4c7b-9a51-0f6c2b1d9e77",
  occurred_at: "2026-09-29T08:00:00.000Z",
  report_type: "situation",
  summary: "Akses jalan ke posko terputus longsor sejak pagi.",
  title: "Situasi akses jalan",
};
const beneficiary = "0b9d6a3e-5b3c-4f1c-9a36-3d6c2a1b0f11";
const tinyJpeg =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

describe("field report schemas", () => {
  it("menerima laporan situasi minimal", () => {
    expect(createFieldReportSchema.safeParse(base).success).toBe(true);
  });

  it("mewajibkan penerima dan hasil untuk kunjungan verifikasi", () => {
    expect(
      createFieldReportSchema.safeParse({ ...base, report_type: "verification_visit" }).success,
    ).toBe(false);
    expect(
      createFieldReportSchema.safeParse({
        ...base,
        beneficiary_contact_id: beneficiary,
        report_type: "verification_visit",
        verification_result: "eligible",
      }).success,
    ).toBe(true);
  });

  it("mewajibkan tingkat keparahan untuk insiden", () => {
    expect(
      createFieldReportSchema.safeParse({ ...base, report_type: "incident" }).success,
    ).toBe(false);
  });

  it("menolak koordinat GPS yang tidak lengkap dan lebih dari 4 foto", () => {
    expect(
      createFieldReportSchema.safeParse({ ...base, latitude: -6.9 }).success,
    ).toBe(false);
    expect(
      createFieldReportSchema.safeParse({
        ...base,
        photos: Array.from({ length: 5 }, () => ({ data_url: tinyJpeg })),
      }).success,
    ).toBe(false);
  });

  it("menolak foto berformat selain JPEG/PNG/WebP", () => {
    expect(
      createFieldReportSchema.safeParse({
        ...base,
        photos: [{ data_url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=" }],
      }).success,
    ).toBe(false);
  });
});

describe("field report rules", () => {
  it("mendekode foto dan menolak ukuran berlebih", () => {
    expect(decodePhoto(tinyJpeg).mimeType).toBe("image/jpeg");
    const oversized = `data:image/jpeg;base64,${Buffer.alloc(700_000).toString("base64")}`;
    expect(() => decodePhoto(oversized)).toThrow(/600 KB/);
  });

  it("memetakan hasil verifikasi ke status asesmen penerima", () => {
    expect(verificationToAssessment.eligible).toBe("eligible");
    expect(verificationToAssessment.not_eligible).toBe("not_eligible");
    expect(verificationToAssessment.not_found).toBe("in_review");
  });
});

describe("createFieldTasksSchema", () => {
  const task = {
    assigned_profile_id: "0b6f1d3e-5b1a-4f43-9d8f-2c1e7a9b4d10",
    task_type: "distribution",
  };

  it("menerima penyaluran dana dan barang sekaligus", () => {
    const result = createFieldTasksSchema.safeParse({
      ...task,
      cash_amount: "300000",
      goods_package_count: 1,
      support_modes: ["cash", "in_kind"],
    });
    expect(result.success).toBe(true);
  });

  it("menolak penyaluran tanpa bentuk bantuan atau tanpa nominal dana", () => {
    expect(createFieldTasksSchema.safeParse(task).success).toBe(false);
    expect(
      createFieldTasksSchema.safeParse({ ...task, support_modes: ["cash"] }).success,
    ).toBe(false);
    expect(
      createFieldTasksSchema.safeParse({ ...task, support_modes: ["in_kind"] }).success,
    ).toBe(false);
  });

  it("tugas lainnya wajib berjudul", () => {
    expect(
      createFieldTasksSchema.safeParse({ ...task, task_type: "other" }).success,
    ).toBe(false);
    expect(
      createFieldTasksSchema.safeParse({ ...task, task_type: "other", title: "Cek gudang cabang" }).success,
    ).toBe(true);
  });
});
