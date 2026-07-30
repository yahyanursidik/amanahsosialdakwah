import { useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Eye, Plus, Route } from "lucide-react";
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
import type { ApprovalWorkflowRecord } from "@/features/approvals/types";

export function ApprovalWorkflowListPage() {
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
  const { query, result } = useList<ApprovalWorkflowRecord>({
    resource: "approval_workflows",
    filters,
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
  });
  const columns: ResourceTableColumn<ApprovalWorkflowRecord>[] = [
    {
      header: "Kode",
      key: "code",
      render: (item) => (
        <span className="text-primary font-mono text-xs font-semibold">
          {item.code}
        </span>
      ),
    },
    {
      header: "Workflow",
      key: "name",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.name}</strong>
          <small>
            {item.description ?? `Approval untuk ${item.resource_type}`}
          </small>
        </div>
      ),
    },
    {
      header: "Versi aktif",
      key: "version",
      render: (item) =>
        item.published_version_number
          ? `v${item.published_version_number} · ${item.step_count} langkah`
          : "Belum dipublikasikan",
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
        <PageHeader title="Workflow Approval" eyebrow="Approval Engine" />
        <ErrorState
          title="Workflow tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission Anda."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section
      className="workspace-page"
      aria-labelledby="approval-workflow-title"
    >
      <PageHeader
        eyebrow="Approval Engine"
        title="Workflow Approval"
        description="Konfigurasikan maker-checker berversi. Request baru selalu mengunci versi dan langkah yang dipakai."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/approval-requests")}
            >
              <Route aria-hidden="true" size={16} />
              Permintaan
            </Button>
            <ProtectedActionButton
              action="manage"
              resource="approval_workflows"
              onClick={() => create("approval_workflows")}
            >
              <Plus aria-hidden="true" size={16} />
              Buat Workflow
            </ProtectedActionButton>
          </>
        }
      />
      <FilterBar
        searchPlaceholder="Cari kode atau nama workflow..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <select
          aria-label="Filter status workflow"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="active">Aktif</option>
          <option value="retired">Tidak aktif</option>
        </select>
      </FilterBar>
      <ResourceTable
        columns={columns}
        items={result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada workflow approval"
            description="Buat langkah approval pertama lalu publish versinya."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("approval_workflows", item.id)}
          >
            <Eye aria-hidden="true" size={16} />
            <span className="sr-only">Lihat {item.name}</span>
          </Button>
        )}
      />
    </section>
  );
}
