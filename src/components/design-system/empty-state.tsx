import { Inbox } from "lucide-react";

type EmptyStateProps = {
  action?: React.ReactNode;
  description?: React.ReactNode;
  title?: string;
};

export function EmptyState({
  action,
  description = "Belum ada data yang cocok dengan konteks saat ini.",
  title = "Data belum tersedia",
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Inbox aria-hidden="true" size={28} />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
