import { describe, expect, it } from "vitest";

import {
  buildChecklist,
  canCompleteTask,
  fieldTaskReportType,
  taskProgress,
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
