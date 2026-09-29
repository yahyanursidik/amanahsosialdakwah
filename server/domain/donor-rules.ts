export type DonorEngagement = "active" | "cooling" | "lapsed" | "never";

/** Batas hari untuk status keaktifan donatur berdasarkan pemberian terakhir. */
export const ENGAGEMENT_ACTIVE_DAYS = 90;
export const ENGAGEMENT_COOLING_DAYS = 365;

/**
 * Keaktifan donatur/wakif: aktif (≤90 hari), perlu disapa (≤1 tahun),
 * tidak aktif (>1 tahun), atau belum pernah memberi.
 */
export function donorEngagement(
  lastGiftAt: Date | string | null | undefined,
  now: Date = new Date(),
): DonorEngagement {
  if (!lastGiftAt) return "never";
  const days = (now.getTime() - new Date(lastGiftAt).getTime()) / 86_400_000;
  if (days <= ENGAGEMENT_ACTIVE_DAYS) return "active";
  if (days <= ENGAGEMENT_COOLING_DAYS) return "cooling";
  return "lapsed";
}

/** Ekspresi SQL yang setara dengan donorEngagement untuk kolom `last_gift_at`. */
export const engagementSql = (column: string) => `case
  when ${column} is null then 'never'
  when ${column} >= now() - interval '${ENGAGEMENT_ACTIVE_DAYS} days' then 'active'
  when ${column} >= now() - interval '${ENGAGEMENT_COOLING_DAYS} days' then 'cooling'
  else 'lapsed' end`;
