export const formatRupiah = (amount: string | number) =>
  `Rp${Number(amount).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

export function taskStatusTone(status: string) {
  if (status === "done") return "success" as const;
  if (status === "cancelled") return "neutral" as const;
  if (status === "in_progress") return "info" as const;
  return "warning" as const;
}

/** Keterangan tenggat yang mudah dibaca: "Hari ini", "Besok", "Lewat 2 hari". */
export function dueLabel(dueDate: string | null) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return { late: false, text: "Hari ini" };
  if (days === 1) return { late: false, text: "Besok" };
  if (days < 0) return { late: true, text: `Lewat ${-days} hari` };
  return {
    late: false,
    text: due.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  };
}

/** Salinan objek tanpa satu kunci (untuk state berbentuk peta). */
export function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}
