import {
  CheckCircle2,
  Clock3,
  PauseCircle,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusTone;
};

const toneIcons = {
  danger: XCircle,
  info: Clock3,
  neutral: PauseCircle,
  success: CheckCircle2,
  warning: ShieldAlert,
} as const;

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const Icon = toneIcons[tone];

  return (
    <span className={cn("status-badge", `status-badge--${tone}`)}>
      <Icon aria-hidden="true" size={14} />
      <span>{children}</span>
    </span>
  );
}
