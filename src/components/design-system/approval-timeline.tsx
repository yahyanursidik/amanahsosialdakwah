import { CheckCircle2, CircleDashed, Clock3, XCircle } from "lucide-react";

import { StatusBadge } from "./status-badge";

type ApprovalTimelineItem = {
  actor?: string;
  description?: React.ReactNode;
  status: "approved" | "pending" | "rejected" | "waiting";
  time?: string;
  title: string;
};

type ApprovalTimelineProps = {
  items: ApprovalTimelineItem[];
};

const timelineIcons = {
  approved: CheckCircle2,
  pending: Clock3,
  rejected: XCircle,
  waiting: CircleDashed,
} as const;

const timelineTones = {
  approved: "success",
  pending: "info",
  rejected: "danger",
  waiting: "neutral",
} as const;

export function ApprovalTimeline({ items }: ApprovalTimelineProps) {
  return (
    <ol className="approval-timeline">
      {items.map((item, index) => {
        const Icon = timelineIcons[item.status];

        return (
          <li key={`${item.title}-${index}`}>
            <span className="approval-timeline__icon">
              <Icon aria-hidden="true" size={16} />
            </span>
            <div className="approval-timeline__body">
              <div className="approval-timeline__head">
                <h3>{item.title}</h3>
                <StatusBadge tone={timelineTones[item.status]}>
                  {item.status}
                </StatusBadge>
              </div>
              {item.description ? <p>{item.description}</p> : null}
              <div className="approval-timeline__meta">
                {item.actor ? <span>{item.actor}</span> : null}
                {item.time ? <time>{item.time}</time> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type { ApprovalTimelineItem };
