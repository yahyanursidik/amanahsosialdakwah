import { StatusBadge } from "@/components/design-system";
import type { ProgramStatus } from "../types";

type ProgramStatusBadgeProps = {
  status: ProgramStatus;
  isArchived?: boolean;
};

export function ProgramStatusBadge({
  status,
  isArchived,
}: ProgramStatusBadgeProps) {
  if (isArchived) {
    return <StatusBadge tone="danger">Diarsipkan</StatusBadge>;
  }

  switch (status) {
    case "draft":
      return <StatusBadge tone="info">Draft</StatusBadge>;
    case "active":
      return <StatusBadge tone="success">Aktif</StatusBadge>;
    case "paused":
      return <StatusBadge tone="warning">Ditunda</StatusBadge>;
    case "completed":
      return <StatusBadge tone="neutral">Selesai</StatusBadge>;
    case "archived":
      return <StatusBadge tone="danger">Diarsipkan</StatusBadge>;
    default:
      return <StatusBadge tone="neutral">{status}</StatusBadge>;
  }
}
