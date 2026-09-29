import type { DonorEngagement } from "./types";

export function engagementTone(engagement: DonorEngagement | string) {
  if (engagement === "active") return "success" as const;
  if (engagement === "cooling") return "warning" as const;
  if (engagement === "lapsed") return "danger" as const;
  return "neutral" as const;
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function waLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
