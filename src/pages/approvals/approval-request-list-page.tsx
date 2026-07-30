import { useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Eye, Plus, Settings2 } from "lucide-react";
import { useNavigate } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { ApprovalStatusBadge } from "@/features/approvals/components/approval-status-badge";
import type { ApprovalRequestRecord } from "@/features/approvals/types";

export function ApprovalRequestListPage() {
  const { create, show } = useNavigation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filters: CrudFilters = [
    ...(search.trim()
      ? [{ field: "q", operator: "eq" as const, value: search.trim() }]
      : []),
    ...(status === "all"
      ? []
      : [{ field: "status", operator: "eq" as const, value: status }]),
  ];
  const { query, result } = useList<ApprovalRequestRecord>({
    resource: "approval_requests",
    filters,
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const columns: ResourceTableColumn<ApprovalRequestRecord>[] = [
    {
      header: "Referensi",
      key: "reference",
      render: (item) => (
        <span className="text-primary font-mono text-xs font-semibold">
          {item.reference_number}
        </span>
      ),
    },
    {
      header: "Permintaan",
      key: "title",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.title}</strong>
          <small>
            {item.workflow_name} v{item.workflow_version_number}
          </small>
        </div>
      ),
    },
    {
      header: "Pemohon",
      key: "requester",
      render: (item) => item.requester_name,
    },
    {
      header: "Status",
      key: "status",
      render: (item) => <ApprovalStatusBadge status={item.status} />,
    },
  ];

  if (query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader title="Permintaan Approval" eyebrow="Approval Engine" />
        <ErrorState
          title="Permintaan tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission Anda."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Approval Engine"
        title="Permintaan Approval"
        description="Pantau keputusan, kuorum, revisi, dan jejak audit pada satu timeline."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/approval-workflows")}
            >
              <Settings2 aria-hidden="true" size={16} />
              Workflow
            </Button>
            <ProtectedActionButton
              action="create"
              resource="approval_requests"
              onClick={() => create("approval_requests")}
            >
              <Plus aria-hidden="true" size={16} />
              Buat Permintaan
            </ProtectedActionButton>
          </>
        }
      />
      <FilterBar
        searchPlaceholder="Cari referensi atau judul..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <select
          aria-label="Filter status approval"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="in_progress">Dalam proses</option>
          <option value="revision_requested">Perlu revisi</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </FilterBar>
      <ResourceTable
        columns={columns}
        items={result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada permintaan approval"
            description="Aktifkan workflow, kemudian buat request dari asesmen atau kasus."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("approval_requests", item.id)}
          >
            <Eye aria-hidden="true" size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />
    </section>
  );
}
