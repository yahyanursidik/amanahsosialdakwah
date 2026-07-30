import { StatusBadge } from "@/components/design-system";

const labels: Record<string, string> = {
  active: "Aktif",
  approved: "Disetujui",
  cancelled: "Dibatalkan",
  draft: "Draft",
  in_progress: "Dalam proses",
  pending: "Menunggu",
  published: "Published",
  rejected: "Ditolak",
  retired: "Tidak aktif",
  revision_requested: "Perlu revisi",
};

export function ApprovalStatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" || status === "approved" || status === "published"
      ? "success"
      : status === "rejected" || status === "cancelled"
        ? "danger"
        : status === "in_progress" || status === "pending"
          ? "info"
          : status === "revision_requested"
            ? "warning"
            : "neutral";
  return <StatusBadge tone={tone}>{labels[status] ?? status}</StatusBadge>;
}
