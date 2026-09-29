import { Banknote, CalendarClock, Package } from "lucide-react";
import { Link } from "react-router";

import { StatusBadge } from "@/components/design-system";
import { dueLabel, formatRupiah, taskStatusTone } from "@/features/field/task-format";
import type { FieldTask } from "@/features/field/types";
import {
  fieldTaskPriorityLabels,
  fieldTaskStatusLabels,
  fieldTaskTypeLabels,
  labelOf,
} from "@/features/giving/labels";

/** Lencana bentuk bantuan: dana, barang, atau keduanya dalam satu tugas. */
export function SupportChips({
  task,
}: {
  task: Pick<FieldTask, "cash_amount" | "goods_package_count" | "goods_summary" | "support_modes">;
}) {
  if (task.support_modes.length === 0 && !task.goods_summary) return null;
  return (
    <div className="task-chips">
      {task.support_modes.includes("cash") ? (
        <span className="task-chip task-chip--cash">
          <Banknote aria-hidden size={14} />
          Dana {task.cash_amount ? formatRupiah(task.cash_amount) : ""}
        </span>
      ) : null}
      {task.support_modes.includes("in_kind") || task.goods_summary ? (
        <span className="task-chip task-chip--goods">
          <Package aria-hidden size={14} />
          {task.goods_package_count ? `${task.goods_package_count} paket` : "Barang"}
          {task.goods_summary ? ` · ${task.goods_summary}` : ""}
        </span>
      ) : null}
    </div>
  );
}

export function TaskProgress({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="task-progress" aria-label={`${done} dari ${total} langkah selesai`}>
      <div className="task-progress__bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>
        {done}/{total} langkah
      </small>
    </div>
  );
}

export function TaskCard({ showAssignee = false, task }: { showAssignee?: boolean; task: FieldTask }) {
  const due = dueLabel(task.due_date);
  const open = task.status === "todo" || task.status === "in_progress";
  return (
    <Link className="field-card field-card--link task-card" data-priority={task.priority} to={`/field/tasks/${task.id}`}>
      <header>
        <div>
          <strong>{task.title}</strong>
          <small>
            {labelOf(fieldTaskTypeLabels, task.task_type)}
            {task.program_name ? ` · ${task.program_name}` : ""}
            {showAssignee ? ` · ${task.assignee_name}` : ""}
          </small>
        </div>
        <StatusBadge tone={taskStatusTone(task.status)}>{labelOf(fieldTaskStatusLabels, task.status)}</StatusBadge>
      </header>
      <SupportChips task={task} />
      <div className="task-card__meta">
        {task.priority !== "normal" ? (
          <span className="task-flag" data-priority={task.priority}>
            {labelOf(fieldTaskPriorityLabels, task.priority)}
          </span>
        ) : null}
        {due && open ? (
          <span className="task-due" data-late={due.late}>
            <CalendarClock aria-hidden size={14} /> {due.text}
          </span>
        ) : null}
        {task.location_text ? <span className="task-card__place">{task.location_text}</span> : null}
      </div>
      <TaskProgress done={task.items_done} total={task.items_total} />
    </Link>
  );
}
