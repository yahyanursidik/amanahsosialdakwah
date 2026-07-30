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
import { AssessmentStatusBadge } from "@/features/assessments/components/assessment-status-badge";
import type { AssessmentRecord } from "@/features/assessments/types";

export function AssessmentListPage() {
  const { create, show } = useNavigation();
  const navigate = useNavigate();
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
  const { query, result } = useList<AssessmentRecord>({
    resource: "assessments",
    filters,
    pagination: { currentPage: page, pageSize, mode: "server" },
    queryOptions: { placeholderData: (previous) => previous },
  });
  const items = result?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));
  const columns: ResourceTableColumn<AssessmentRecord>[] = [
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
      header: "Penerima",
      key: "beneficiary",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.beneficiary_name ?? "Penerima manfaat"}</strong>
          <small>{item.case_reference ?? "Kasus"}</small>
        </div>
      ),
    },
    {
      header: "Instrumen",
      key: "template",
      render: (item) =>
        `${item.template_name ?? "Template"} v${item.template_version_number ?? "?"}`,
    },
    {
      header: "Skor",
      key: "score",
      render: (item) => `${item.total_score}/${item.max_score}`,
    },
    {
      header: "Status",
      key: "status",
      render: (item) => <AssessmentStatusBadge status={item.status} />,
    },
  ];

  if (query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader title="Asesmen Kasus" eyebrow="Assessment Engine" />
        <ErrorState
          title="Asesmen tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission Anda."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="assessment-list-title">
      <PageHeader
        eyebrow="Assessment Engine"
        title="Asesmen Kasus"
        description="Isi instrumen published, hitung skor di server, lalu kirim untuk review independen."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/assessment-templates")}
            >
              <Settings2 aria-hidden="true" size={16} />
              Template
            </Button>
            <ProtectedActionButton
              action="manage"
              resource="assessments"
              onClick={() => create("assessments")}
            >
              <Plus aria-hidden="true" size={16} />
              Mulai Asesmen
            </ProtectedActionButton>
          </>
        }
      />

      <FilterBar
        searchPlaceholder="Cari nomor, penerima, kasus, atau template..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          aria-label="Filter status asesmen"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Menunggu review</option>
          <option value="revision_requested">Perlu revisi</option>
          <option value="approved">Disetujui</option>
        </select>
      </FilterBar>

      <ResourceTable
        columns={columns}
        items={items}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada asesmen"
            description="Publish template lalu mulai asesmen dari kasus yang aktif."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("assessments", item.id)}
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
