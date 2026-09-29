/** Persentase 0–100 yang aman untuk pembagi nol atau nilai tidak valid. */
export function percentageOf(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0)
    return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}
