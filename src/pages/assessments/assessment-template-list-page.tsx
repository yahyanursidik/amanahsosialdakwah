import { useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { ClipboardCheck, Eye, Plus } from "lucide-react";
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
import type { AssessmentTemplateRecord } from "@/features/assessments/types";

export function AssessmentTemplateListPage() {
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
  const { query, result } = useList<AssessmentTemplateRecord>({
    resource: "assessment_templates",
    filters,
    pagination: { currentPage: page, pageSize, mode: "server" },
    queryOptions: { placeholderData: (previous) => previous },
  });
  const items = result?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));
  const columns: ResourceTableColumn<AssessmentTemplateRecord>[] = [
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
      header: "Template",
      key: "name",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.name}</strong>
          <small>{item.description ?? "Tanpa deskripsi"}</small>
        </div>
      ),
    },
    {
      header: "Versi aktif",
      key: "version",
      render: (item) =>
        item.published_version_number
          ? `v${item.published_version_number}`
          : "Belum dipublikasikan",
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
        <PageHeader title="Template Asesmen" eyebrow="Assessment Engine" />
        <ErrorState
          title="Template tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission Anda."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="template-list-title">
      <PageHeader
        eyebrow="Assessment Engine"
        title="Template Asesmen"
        description="Susun instrumen berversi. Versi published menjadi acuan immutable bagi asesmen kasus."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/assessments")}
            >
              <ClipboardCheck aria-hidden="true" size={16} />
              Daftar Asesmen
            </Button>
            <ProtectedActionButton
              action="manage"
              resource="assessment_templates"
              onClick={() => create("assessment_templates")}
            >
              <Plus aria-hidden="true" size={16} />
              Buat Template
            </ProtectedActionButton>
          </>
        }
      />

      <FilterBar
        searchPlaceholder="Cari kode atau nama template..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          aria-label="Filter status template"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="active">Aktif</option>
          <option value="retired">Tidak aktif</option>
        </select>
      </FilterBar>

      <ResourceTable
        columns={columns}
        items={items}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada template asesmen"
            description="Buat instrumen pertama, periksa scoring, lalu publish sebelum digunakan."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("assessment_templates", item.id)}
          >
            <Eye aria-hidden="true" size={16} />
            <span className="sr-only">Lihat {item.name}</span>
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
