import { describe, expect, it } from "vitest";

import {
  buildChecklist,
  canCompleteTask,
  defaultFieldSettings,
  expandTemplate,
  fieldTaskReportType,
  handoverReportIssues,
  taskProgress,
  type TemplateItem,
} from "./field-task-rules";

describe("field task checklist", () => {
  it("menggabungkan serah terima dana dan barang dalam satu kunjungan", () => {
    const items = buildChecklist({
      cashAmount: "500000",
      goodsPackageCount: 2,
      goodsSummary: "beras, minyak",
      supportModes: ["cash", "in_kind"],
      taskType: "distribution",
    });
    const kinds = items.map((item) => item.item_kind);
    expect(kinds).toContain("handover_cash");
    expect(kinds).toContain("handover_goods");
    expect(items.find((item) => item.item_kind === "handover_cash")?.label).toMatch(/Rp500\.000/);
    expect(items.find((item) => item.item_kind === "handover_goods")?.label).toMatch(/2 paket \(beras, minyak\)/);
    expect(items.at(-1)?.item_kind).toBe("report");
  });

  it("hanya dana atau hanya barang sesuai bentuk dukungan", () => {
    const cashOnly = buildChecklist({ cashAmount: "100000", supportModes: ["cash"], taskType: "distribution" });
    expect(cashOnly.some((item) => item.item_kind === "handover_goods")).toBe(false);
    const goodsOnly = buildChecklist({ goodsPackageCount: 1, supportModes: ["in_kind"], taskType: "distribution" });
    expect(goodsOnly.some((item) => item.item_kind === "handover_cash")).toBe(false);
  });

  it("menambahkan butir khusus dari supervisor", () => {
    const items = buildChecklist({ customItems: ["Bawa formulir SKTM", "  "], supportModes: [], taskType: "verification" });
    expect(items.some((item) => item.label === "Bawa formulir SKTM")).toBe(true);
    expect(items.filter((item) => item.label.trim() === "").length).toBe(0);
  });

  it("menghitung progres dan syarat selesai", () => {
    const items = [
      { is_done: true, is_required: true, item_kind: "check" },
      { is_done: false, is_required: false, item_kind: "gps" },
      { is_done: false, is_required: true, item_kind: "report" },
    ];
    expect(taskProgress(items)).toEqual({ done: 1, requiredDone: 1, requiredTotal: 2, total: 3 });
    expect(canCompleteTask(items, { withReport: true }).ok).toBe(true);
    expect(canCompleteTask(items, { withReport: false }).ok).toBe(false);
  });

  it("memetakan jenis tugas ke jenis laporan", () => {
    expect(fieldTaskReportType("verification")).toBe("verification_visit");
    expect(fieldTaskReportType("other")).toBe("situation");
  });
});

describe("template ceklis organisasi", () => {
  const template: TemplateItem[] = [
    { applies_to: "always", hint: "Sapa dengan salam", is_required: true, item_kind: "check", label: "Temui {penerima}" },
    { applies_to: "cash", is_required: true, item_kind: "handover_cash", label: "Serahkan amplop {nominal}" },
    { applies_to: "in_kind", is_required: true, item_kind: "handover_goods", label: "Serahkan {paket} ({barang})" },
    { applies_to: "always", is_required: false, item_kind: "photo", label: "Foto bersama" },
  ];

  it("menyaring butir dana/barang sesuai bentuk bantuan dan mengisi placeholder", () => {
    const cashOnly = expandTemplate(template, {
      beneficiaryName: "Ibu Siti",
      cashAmount: "250000",
      supportModes: ["cash"],
      taskType: "distribution",
    });
    expect(cashOnly.map((item) => item.label)).toEqual([
      "Temui Ibu Siti",
      "Serahkan amplop Rp250.000",
      "Foto bersama",
      "Kirim laporan lapangan",
    ]);
    expect(cashOnly[0]?.hint).toBe("Sapa dengan salam");

    const goodsOnly = expandTemplate(template, { goodsPackageCount: 3, supportModes: ["in_kind"], taskType: "distribution" });
    expect(goodsOnly.map((item) => item.label)).toContain("Serahkan 3 paket");
    expect(goodsOnly.some((item) => item.item_kind === "handover_cash")).toBe(false);
  });

  it("tidak menambah butir laporan bila aturan organisasi mematikannya", () => {
    const items = expandTemplate(template, { requireReport: false, supportModes: ["cash"], cashAmount: "1000", taskType: "distribution" });
    expect(items.some((item) => item.item_kind === "report")).toBe(false);
  });

  it("tidak menggandakan butir laporan yang sudah ada di template", () => {
    const items = expandTemplate(
      [{ applies_to: "always", is_required: true, item_kind: "report", label: "Unggah laporan ke grup" }],
      { supportModes: [], taskType: "other" },
    );
    expect(items.filter((item) => item.item_kind === "report")).toHaveLength(1);
  });
});

describe("aturan laporan serah terima", () => {
  it("mewajibkan foto dan GPS sesuai pengaturan", () => {
    const settings = { ...defaultFieldSettings, handover_min_photos: 2, require_gps_for_handover: true };
    expect(handoverReportIssues(settings, { hasGps: false, photoCount: 1, reportType: "distribution" })).toHaveLength(2);
    expect(handoverReportIssues(settings, { hasGps: true, photoCount: 2, reportType: "delivery" })).toHaveLength(0);
    expect(handoverReportIssues(settings, { hasGps: false, photoCount: 0, reportType: "situation" })).toHaveLength(0);
  });
});
