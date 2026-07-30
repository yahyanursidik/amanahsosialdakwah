import { StatusBadge } from "@/components/design-system";

const labels: Record<string, string> = {
  active: "Aktif",
  approved: "Disetujui",
  draft: "Draft",
  eligible: "Layak",
  manual_review: "Review manual",
  not_eligible: "Belum layak",
  pending: "Belum dinilai",
  published: "Published",
  retired: "Tidak aktif",
  revision_requested: "Perlu revisi",
  submitted: "Menunggu review",
};

export function AssessmentStatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" ||
    status === "approved" ||
    status === "eligible" ||
    status === "published"
      ? "success"
      : status === "not_eligible"
        ? "danger"
        : status === "revision_requested" ||
            status === "manual_review" ||
            status === "submitted"
          ? "warning"
          : "neutral";

  return (
    <StatusBadge tone={tone}>
      {labels[status] ?? status.replaceAll("_", " ")}
    </StatusBadge>
  );
}
