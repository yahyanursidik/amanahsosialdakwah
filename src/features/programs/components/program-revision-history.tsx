import {
  StatusBadge,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import type { ProgramRevisionsDocument } from "@/generated/neon/models";

type ProgramRevisionHistoryProps = {
  revisions: ProgramRevisionsDocument[];
  isLoading?: boolean;
};

const actionTypeLabels: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  activated: { label: "Program diaktifkan", tone: "success" },
  archived: { label: "Program diarsipkan", tone: "danger" },
  completed: { label: "Program diselesaikan", tone: "success" },
  controlled_edit: { label: "Penyesuaian terkontrol", tone: "warning" },
  created: { label: "Program dibuat", tone: "info" },
  draft_updated: { label: "Draft diperbarui", tone: "neutral" },
  paused: { label: "Program ditunda", tone: "warning" },
  restored: { label: "Program dipulihkan", tone: "info" },
  resumed: { label: "Program dilanjutkan", tone: "success" },
};

const revisionColumns: ResourceTableColumn<ProgramRevisionsDocument>[] = [
  {
    header: "Waktu",
    key: "performed_at",
    render: (revision) =>
      new Date(revision.performed_at || revision.$createdAt).toLocaleString(
        "id-ID",
      ),
    width: "12rem",
  },
  {
    header: "Aksi",
    key: "action_type",
    render: (revision) => {
      const config = actionTypeLabels[revision.action_type] ?? {
        label: revision.action_type,
        tone: "neutral" as const,
      };
      return <StatusBadge tone={config.tone}>{config.label}</StatusBadge>;
    },
  },
  {
    header: "Ringkasan perubahan",
    key: "summary",
    render: (revision) => (
      <span className="program-revision__summary">
        {revision.change_summary}
      </span>
    ),
  },
  {
    header: "Alasan",
    key: "reason",
    render: (revision) => revision.reason || "—",
  },
  {
    header: "Petugas",
    key: "performed_by",
    render: (revision) => (
      <span className="font-mono text-xs">
        {revision.performed_by || "Sistem"}
      </span>
    ),
  },
  {
    header: "Perbandingan",
    key: "values",
    render: (revision) =>
      revision.previous_values && revision.new_values ? (
        <details className="program-revision__diff">
          <summary>Lihat</summary>
          <div>
            <p>
              <strong>Sebelum</strong>
              {revision.previous_values}
            </p>
            <p>
              <strong>Sesudah</strong>
              {revision.new_values}
            </p>
          </div>
        </details>
      ) : (
        "—"
      ),
  },
];

export function ProgramRevisionHistory({
  revisions,
  isLoading = false,
}: ProgramRevisionHistoryProps) {
  return (
    <ResourceTable
      columns={revisionColumns}
      getRowId={(revision) => revision.$id}
      isLoading={isLoading}
      items={revisions}
      empty={
        <p className="program-revision__empty">
          Belum ada catatan revisi atau perubahan audit untuk program ini.
        </p>
      }
    />
  );
}
