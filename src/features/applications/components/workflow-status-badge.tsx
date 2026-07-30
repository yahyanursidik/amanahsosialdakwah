import { StatusBadge } from "@/components/design-system";
import type {
  ApplicationStatus,
  CaseStatus,
} from "@/features/applications/types";

const labels: Record<ApplicationStatus | CaseStatus, string> = {
  accepted: "Diterima",
  assessment: "Asesmen",
  assigned: "Ditugaskan",
  cancelled: "Dibatalkan",
  closed: "Ditutup",
  converted: "Menjadi kasus",
  draft: "Draft",
  eligible: "Layak",
  in_screening: "Screening",
  not_eligible: "Tidak layak",
  open: "Terbuka",
  rejected: "Ditolak",
  submitted: "Diajukan",
  verified: "Terverifikasi",
};

function toneForStatus(status: ApplicationStatus | CaseStatus) {
  if (["accepted", "eligible", "verified"].includes(status)) return "success";
  if (["cancelled", "not_eligible", "rejected"].includes(status))
    return "danger";
  if (["in_screening", "assessment", "submitted"].includes(status))
    return "info";
  if (["converted", "assigned", "open"].includes(status)) return "warning";
  return "neutral";
}

export function WorkflowStatusBadge({
  status,
}: {
  status: ApplicationStatus | CaseStatus;
}) {
  return (
    <StatusBadge tone={toneForStatus(status)}>{labels[status]}</StatusBadge>
  );
}
