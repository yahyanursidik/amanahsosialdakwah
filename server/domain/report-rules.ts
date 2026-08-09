export type ReportRange = "30d" | "90d" | "365d";

const rangeDays: Record<ReportRange, number> = {
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

export function resolveReportPeriod(range: ReportRange, now = new Date()) {
  const to = new Date(now);
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - rangeDays[range] + 1);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);

  return {
    from: from.toISOString(),
    range,
    to: to.toISOString(),
  };
}
