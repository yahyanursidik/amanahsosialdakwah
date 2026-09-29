export type FieldTaskType =
  | "delivery"
  | "distribution"
  | "monitoring"
  | "other"
  | "verification";

export type ChecklistItemKind =
  | "check"
  | "confirmation"
  | "gps"
  | "handover_cash"
  | "handover_goods"
  | "photo"
  | "report";

export type ChecklistAppliesTo = "always" | "cash" | "in_kind";

export type ChecklistItem = {
  hint?: string | null;
  is_required: boolean;
  item_kind: ChecklistItemKind;
  label: string;
};

/** Butir template ceklis yang diatur admin (atau bawaan sistem). */
export type TemplateItem = ChecklistItem & { applies_to: ChecklistAppliesTo };

export const formatRupiah = (amount: string | number) =>
  `Rp${Number(amount).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

const step = (
  label: string,
  kind: ChecklistItemKind = "check",
  required = true,
  appliesTo: ChecklistAppliesTo = "always",
  hint: string | null = null,
): TemplateItem => ({ applies_to: appliesTo, hint, is_required: required, item_kind: kind, label });

/**
 * Template bawaan per jenis tugas; dipakai bila admin belum membuat template
 * sendiri, dan menjadi titik awal saat admin membuat template baru.
 * Placeholder: {nominal}, {paket}, {barang}, {penerima}.
 */
export function defaultTemplateItems(taskType: FieldTaskType): TemplateItem[] {
  switch (taskType) {
    case "distribution":
      return [
        step("Pastikan identitas penerima sesuai (KTP/KK)"),
        step("Serahkan dana {nominal} dan hitung bersama penerima", "handover_cash", true, "cash"),
        step("Serahkan {paket} ({barang}) dan cek kelengkapannya", "handover_goods", true, "in_kind"),
        step("Minta konfirmasi / tanda terima dari penerima", "confirmation"),
        step("Ambil foto serah terima", "photo"),
        step("Ambil lokasi GPS", "gps", false),
      ];
    case "verification":
      return [
        step("Temui penerima atau anggota keluarga"),
        step("Cocokkan identitas dengan KTP/KK"),
        step("Periksa kondisi tempat tinggal dan tanggungan"),
        step("Konfirmasi ke tetangga atau ketua RT", "check", false),
        step("Ambil foto kondisi rumah", "photo"),
        step("Ambil lokasi GPS", "gps", false),
      ];
    case "delivery":
      return [
        step("Ambil barang di gudang dan cocokkan jumlahnya"),
        step("Catat berangkat di aplikasi"),
        step("Serahkan ke penerima atau mitra tujuan", "handover_goods"),
        step("Minta nama dan tanda terima penerima", "confirmation"),
        step("Ambil foto serah terima", "photo"),
      ];
    case "monitoring":
      return [
        step("Kunjungi penerima"),
        step("Tanyakan pemanfaatan bantuan"),
        step("Catat kondisi terkini dan kebutuhan lanjutan"),
        step("Ambil foto kondisi", "photo", false),
      ];
    case "other":
      return [];
  }
}

export type ChecklistContext = {
  beneficiaryName?: string | null;
  cashAmount?: string | null;
  customItems?: string[];
  goodsPackageCount?: number | null;
  goodsSummary?: string | null;
  /** Tambahkan butir "Kirim laporan lapangan" (aturan organisasi). */
  requireReport?: boolean;
  supportModes: Array<"cash" | "in_kind">;
  taskType: FieldTaskType;
};

function fillPlaceholders(label: string, context: ChecklistContext) {
  const values: Record<string, string> = {
    barang: context.goodsSummary?.trim() ?? "",
    nominal: context.cashAmount ? formatRupiah(context.cashAmount) : "",
    paket: context.goodsPackageCount ? `${context.goodsPackageCount} paket` : "barang",
    penerima: context.beneficiaryName?.trim() || "penerima",
  };
  return label
    .replace(/\{(nominal|paket|barang|penerima)\}/g, (_, key: string) => values[key] ?? "")
    .replace(/\s*\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Menyusun ceklis tugas dari template: butir khusus dana/barang hanya muncul
 * bila tugas memang menyalurkan bentuk tersebut, placeholder diisi, butir
 * tambahan dari koordinator disisipkan, lalu "Kirim laporan" di akhir.
 */
export function expandTemplate(
  items: TemplateItem[],
  context: ChecklistContext,
): ChecklistItem[] {
  const goodsInvolved =
    context.supportModes.includes("in_kind") || context.taskType === "delivery";
  const result: ChecklistItem[] = [];
  for (const item of items) {
    if (item.applies_to === "cash" && !context.supportModes.includes("cash")) continue;
    if (item.applies_to === "in_kind" && !goodsInvolved) continue;
    const label = fillPlaceholders(item.label, context);
    if (label.length < 3) continue;
    result.push({
      hint: item.hint?.trim() ? fillPlaceholders(item.hint, context) : null,
      is_required: item.is_required,
      item_kind: item.item_kind,
      label,
    });
  }
  for (const label of context.customItems ?? []) {
    const trimmed = label.trim();
    if (trimmed.length >= 3) {
      result.push({ hint: null, is_required: true, item_kind: "check", label: trimmed });
    }
  }
  if ((context.requireReport ?? true) && !result.some((item) => item.item_kind === "report")) {
    result.push({ hint: null, is_required: true, item_kind: "report", label: "Kirim laporan lapangan" });
  }
  return result;
}

/** Ceklis dari template bawaan (tanpa template organisasi). */
export function buildChecklist(context: ChecklistContext): ChecklistItem[] {
  return expandTemplate(defaultTemplateItems(context.taskType), context);
}

export type TaskProgress = {
  done: number;
  requiredDone: number;
  requiredTotal: number;
  total: number;
};

export function taskProgress(
  items: Array<{ is_done: boolean; is_required: boolean }>,
): TaskProgress {
  return {
    done: items.filter((entry) => entry.is_done).length,
    requiredDone: items.filter((entry) => entry.is_required && entry.is_done).length,
    requiredTotal: items.filter((entry) => entry.is_required).length,
    total: items.length,
  };
}

/**
 * Tugas selesai bila semua butir wajib selesai. Butir "Kirim laporan"
 * dikecualikan karena ditandai otomatis saat laporan diterima server.
 */
export function canCompleteTask<
  T extends { is_done: boolean; is_required: boolean; item_kind: string },
>(
  items: T[],
  { withReport }: { withReport: boolean },
) {
  const pending = items.filter(
    (entry) =>
      entry.is_required &&
      !entry.is_done &&
      !(withReport && entry.item_kind === "report"),
  );
  return { ok: pending.length === 0, pending };
}

export function fieldTaskReportType(taskType: FieldTaskType) {
  return (
    {
      delivery: "delivery",
      distribution: "distribution",
      monitoring: "monitoring",
      other: "situation",
      verification: "verification_visit",
    } as const
  )[taskType];
}

/** Aturan kerja lapangan organisasi (nilai bawaan bila belum diatur). */
export type FieldSettings = {
  default_due_days: number;
  handover_min_photos: number;
  officer_can_uncheck: boolean;
  require_gps_for_handover: boolean;
  require_report_to_complete: boolean;
  verification_updates_profile: boolean;
};

export const defaultFieldSettings: FieldSettings = {
  default_due_days: 3,
  handover_min_photos: 0,
  officer_can_uncheck: true,
  require_gps_for_handover: false,
  require_report_to_complete: true,
  verification_updates_profile: true,
};

/** Validasi laporan serah terima (penyaluran/pengiriman) terhadap aturan. */
export function handoverReportIssues(
  settings: Pick<FieldSettings, "handover_min_photos" | "require_gps_for_handover">,
  report: { hasGps: boolean; photoCount: number; reportType: string },
) {
  if (!["distribution", "delivery"].includes(report.reportType)) return [];
  const issues: string[] = [];
  if (report.photoCount < settings.handover_min_photos) {
    issues.push(`Laporan serah terima wajib melampirkan minimal ${settings.handover_min_photos} foto.`);
  }
  if (settings.require_gps_for_handover && !report.hasGps) {
    issues.push("Laporan serah terima wajib menyertakan lokasi GPS.");
  }
  return issues;
}
