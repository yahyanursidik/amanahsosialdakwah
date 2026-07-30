import { StatusBadge } from "@/components/design-system";
import type { CrmContactsDocument } from "@/generated/neon/models";

const labels: Record<CrmContactsDocument["status"], string> = {
  active: "Aktif",
  archived: "Arsip",
  deceased: "Wafat",
  inactive: "Nonaktif",
};

export function ContactStatusBadge({
  status,
}: {
  status: CrmContactsDocument["status"];
}) {
  const tone =
    status === "active"
      ? "success"
      : status === "archived"
        ? "neutral"
        : "warning";

  return <StatusBadge tone={tone}>{labels[status]}</StatusBadge>;
}
