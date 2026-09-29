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

export type ChecklistItem = {
  is_required: boolean;
  item_kind: ChecklistItemKind;
  label: string;
};

const formatRupiah = (amount: string | number) =>
  `Rp${Number(amount).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

/**
 * Ceklis standar per jenis tugas. Tugas penyaluran menyesuaikan bentuk
 * dukungan: dana, barang, atau keduanya dalam satu kunjungan.
 */
export function buildChecklist(input: {
  cashAmount?: string | null;
  customItems?: string[];
  goodsPackageCount?: number | null;
  goodsSummary?: string | null;
  supportModes: Array<"cash" | "in_kind">;
  taskType: FieldTaskType;
}): ChecklistItem[] {
  const item = (
    label: string,
    kind: ChecklistItemKind = "check",
    required = true,
  ): ChecklistItem => ({ is_required: required, item_kind: kind, label });
  const items: ChecklistItem[] = [];

  switch (input.taskType) {
    case "distribution": {
      items.push(item("Pastikan identitas penerima sesuai (KTP/KK)"));
      if (input.supportModes.includes("cash")) {
        items.push(
          item(
            `Serahkan dana ${input.cashAmount ? formatRupiah(input.cashAmount) : ""} dan hitung bersama penerima`.replace("  ", " "),
            "handover_cash",
          ),
        );
      }
      if (input.supportModes.includes("in_kind")) {
        const packages = input.goodsPackageCount ? `${input.goodsPackageCount} paket` : "barang";
        const summary = input.goodsSummary ? ` (${input.goodsSummary})` : "";
        items.push(item(`Serahkan ${packages}${summary} dan cek kelengkapannya`, "handover_goods"));
      }
      items.push(item("Minta konfirmasi / tanda terima dari penerima", "confirmation"));
      items.push(item("Ambil foto serah terima", "photo"));
      items.push(item("Ambil lokasi GPS", "gps", false));
      break;
    }
    case "verification":
      items.push(item("Temui penerima atau anggota keluarga"));
      items.push(item("Cocokkan identitas dengan KTP/KK"));
      items.push(item("Periksa kondisi tempat tinggal dan tanggungan"));
      items.push(item("Konfirmasi ke tetangga atau ketua RT", "check", false));
      items.push(item("Ambil foto kondisi rumah", "photo"));
      items.push(item("Ambil lokasi GPS", "gps", false));
      break;
    case "delivery":
      items.push(item("Ambil barang di gudang dan cocokkan jumlahnya"));
      items.push(item("Catat berangkat di aplikasi"));
      items.push(item("Serahkan ke penerima atau mitra tujuan", "handover_goods"));
      items.push(item("Minta nama dan tanda terima penerima", "confirmation"));
      items.push(item("Ambil foto serah terima", "photo"));
      break;
    case "monitoring":
      items.push(item("Kunjungi penerima"));
      items.push(item("Tanyakan pemanfaatan bantuan"));
      items.push(item("Catat kondisi terkini dan kebutuhan lanjutan"));
      items.push(item("Ambil foto kondisi", "photo", false));
      break;
    case "other":
      break;
  }

  for (const label of input.customItems ?? []) {
    const trimmed = label.trim();
    if (trimmed.length >= 3) items.push(item(trimmed));
  }
  items.push(item("Kirim laporan lapangan", "report"));
  return items;
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
