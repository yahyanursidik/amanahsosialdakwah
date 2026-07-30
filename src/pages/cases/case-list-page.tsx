import { useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Eye } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  ResourceTable,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { WorkflowStatusBadge } from "@/features/applications/components/workflow-status-badge";
import type { CaseRecord } from "@/features/applications/types";

export function CaseListPage() {
  const { show } = useNavigation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const filters: CrudFilters = [
    ...(search.trim()
      ? [{ field: "q", operator: "eq" as const, value: search.trim() }]
      : []),
    ...(status === "all"
      ? []
      : [{ field: "status", operator: "eq" as const, value: status }]),
  ];
  const { query, result } = useList<CaseRecord>({
    resource: "cases",
    filters,
    pagination: { currentPage: page, pageSize, mode: "server" },
  });
  const items = result?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));
  const columns: ResourceTableColumn<CaseRecord>[] = [
    {
      header: "Nomor Kasus",
      key: "reference_number",
      render: (item) => (
        <span className="text-primary font-mono text-xs font-semibold">
          {item.reference_number}
        </span>
      ),
    },
    {
      header: "Penerima",
      key: "beneficiary",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.beneficiary_name ?? "Penerima"}</strong>
          <small>{item.program_name ?? "Program"}</small>
        </div>
      ),
    },
    {
      header: "Penanggung Jawab",
      key: "assignee",
      render: (item) => item.assignee_name ?? "Belum ditugaskan",
    },
    {
      header: "Dibuka",
      key: "opened_at",
      render: (item) => new Date(item.opened_at).toLocaleDateString("id-ID"),
    },
    {
      header: "Status",
      key: "status",
      render: (item) => <WorkflowStatusBadge status={item.status} />,
    },
  ];

  if (query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader title="Kasus Penerima" eyebrow="Applications & Cases" />
        <ErrorState
          title="Kasus tidak dapat dimuat"
          description="Periksa koneksi dan organisasi aktif."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="case-list-title">
      <PageHeader
        eyebrow="Applications & Cases"
        title="Kasus Penerima"
        description="Kasus terbentuk hanya dari pengajuan yang lolos screening."
      />
      <FilterBar
        searchPlaceholder="Cari nomor kasus, penerima, atau program..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          aria-label="Filter status kasus"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Semua status</option>
          <option value="open">Terbuka</option>
          <option value="assigned">Ditugaskan</option>
          <option value="assessment">Asesmen</option>
          <option value="verified">Terverifikasi</option>
          <option value="eligible">Layak</option>
          <option value="not_eligible">Tidak layak</option>
          <option value="closed">Ditutup</option>
        </select>
      </FilterBar>
      <ResourceTable
        columns={columns}
        items={items}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada kasus"
            description="Kasus akan muncul setelah pengajuan diterima dan dikonversi."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("cases", item.id)}
          >
            <Eye aria-hidden="true" size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
