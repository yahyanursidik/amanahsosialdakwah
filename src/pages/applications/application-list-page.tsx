import { useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Eye, Plus } from "lucide-react";

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
import { WorkflowStatusBadge } from "@/features/applications/components/workflow-status-badge";
import type { ApplicationRecord } from "@/features/applications/types";

export function ApplicationListPage() {
  const { create, show } = useNavigation();
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
  const { query, result } = useList<ApplicationRecord>({
    resource: "applications",
    filters,
    pagination: { currentPage: page, pageSize, mode: "server" },
    queryOptions: { placeholderData: (previous) => previous },
  });
  const items = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columns: ResourceTableColumn<ApplicationRecord>[] = [
    {
      header: "Nomor",
      key: "reference_number",
      render: (item) => (
        <span className="text-primary font-mono text-xs font-semibold">
          {item.reference_number}
        </span>
      ),
    },
    {
      header: "Pemohon",
      key: "applicant",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.applicant_name ?? "Kontak"}</strong>
          <small>{item.program_name ?? "Program"}</small>
        </div>
      ),
    },
    {
      header: "Kebutuhan",
      key: "requested_support",
      render: (item) => (
        <span className="line-clamp-2">{item.requested_support}</span>
      ),
    },
    {
      header: "Urgensi",
      key: "urgency",
      render: (item) => <span className="capitalize">{item.urgency}</span>,
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
        <PageHeader title="Pengajuan Bantuan" eyebrow="Applications & Cases" />
        <ErrorState
          title="Pengajuan tidak dapat dimuat"
          description="Periksa koneksi dan organisasi aktif, lalu coba kembali."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="application-list-title">
      <PageHeader
        eyebrow="Applications & Cases"
        title="Pengajuan Bantuan"
        description="Kelola intake, screening, dan konversi pengajuan menjadi kasus penerima."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="applications"
            onClick={() => create("applications")}
          >
            <Plus aria-hidden="true" size={16} />
            Buat Pengajuan
          </ProtectedActionButton>
        }
      />

      <FilterBar
        searchPlaceholder="Cari nomor, pemohon, atau program..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          aria-label="Filter status pengajuan"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Diajukan</option>
          <option value="in_screening">Screening</option>
          <option value="accepted">Diterima</option>
          <option value="rejected">Ditolak</option>
          <option value="converted">Menjadi kasus</option>
        </select>
      </FilterBar>

      <ResourceTable
        columns={columns}
        items={items}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada pengajuan"
            description="Buat pengajuan pertama dari profil penerima manfaat yang sudah aktif."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("applications", item.id)}
          >
            <Eye aria-hidden="true" size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
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
