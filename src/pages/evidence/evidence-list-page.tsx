import { useList, useNavigation } from "@refinedev/core";
import { Eye, Upload } from "lucide-react";
import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type { EvidenceFile } from "@/features/evidence/types";

function tone(status: string) {
  if (status === "available") return "success" as const;
  if (["deleted", "quarantined"].includes(status)) return "danger" as const;
  if (status === "pending_upload") return "warning" as const;
  return "neutral" as const;
}

export function EvidenceListPage() {
  const { create, show } = useNavigation();
  const query = useList<EvidenceFile>({
    resource: "evidence_files",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const columns: ResourceTableColumn<EvidenceFile>[] = [
    {
      key: "file",
      header: "Bukti",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.original_file_name}</strong>
          <small>
            {item.purpose} · v{item.version}
          </small>
        </div>
      ),
    },
    {
      key: "entity",
      header: "Entitas",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.entity_type.replaceAll("_", " ")}</strong>
          <small className="font-mono">{item.entity_id.slice(0, 8)}…</small>
        </div>
      ),
    },
    {
      key: "classification",
      header: "Klasifikasi",
      render: (item) => (
        <StatusBadge
          tone={
            item.classification === "restricted"
              ? "danger"
              : item.classification === "confidential"
                ? "warning"
                : "neutral"
          }
        >
          {item.classification}
        </StatusBadge>
      ),
    },
    {
      key: "size",
      header: "Ukuran",
      render: (item) =>
        `${(Number(item.size_bytes) / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>
          {item.status.replaceAll("_", " ")}
        </StatusBadge>
      ),
    },
  ];
  if (query.query.isError)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Evidence" title="Bukti & Dokumen" />
        <ErrorState
          title="Bukti tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission evidence."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Evidence Service"
        title="Bukti & Dokumen"
        description="File privat, berversi, terklasifikasi, dan setiap aksesnya diaudit."
        actions={
          <ProtectedActionButton
            action="upload"
            resource="evidence_files"
            onClick={() => create("evidence_files")}
          >
            <Upload aria-hidden size={16} />
            Upload Bukti
          </ProtectedActionButton>
        }
      />
      <ResourceTable
        columns={columns}
        items={query.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={query.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada bukti"
            description="Buat upload intent untuk menyimpan bukti privat."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("evidence_files", item.id)}
          >
            <Eye aria-hidden size={16} />
            <span className="sr-only">Lihat {item.original_file_name}</span>
          </Button>
        )}
      />
    </section>
  );
}
