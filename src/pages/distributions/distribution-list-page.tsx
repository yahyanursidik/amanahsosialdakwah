import { useState } from "react";
import { useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Eye, Plus } from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type {
  DistributionPlan,
  DistributionStatus,
} from "@/features/distributions/types";

function statusTone(status: DistributionStatus) {
  if (["completed", "verified", "confirmed"].includes(status)) return "success" as const;
  if (["cancelled", "revision_required"].includes(status)) return "danger" as const;
  if (["ready", "assigned", "in_progress", "executed"].includes(status)) return "info" as const;
  return "neutral" as const;
}

export function DistributionListPage() {
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
  const { query, result } = useList<DistributionPlan>({
    resource: "distributions",
    filters,
    pagination: { currentPage: page, pageSize, mode: "server" },
    queryOptions: { placeholderData: (previous) => previous },
  });
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columns: ResourceTableColumn<DistributionPlan>[] = [
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
      header: "Penerima",
      key: "beneficiary",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.beneficiary_name}</strong>
          <small>{item.case_reference}</small>
        </div>
      ),
    },
    {
      header: "Program",
      key: "program",
      render: (item) => item.program_name,
    },
    {
      align: "right",
      header: "Nominal",
      key: "amount",
      render: (item) => (
        <MoneyDisplay amount={item.amount} currency={item.currency} />
      ),
    },
    {
      header: "Petugas",
      key: "assignee",
      render: (item) => item.assignee_name ?? "Belum ditugaskan",
    },
    {
      header: "Status",
      key: "status",
      render: (item) => (
        <StatusBadge tone={statusTone(item.status)}>
          {item.status.replaceAll("_", " ")}
        </StatusBadge>
      ),
    },
  ];

  if (query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader title="Distribusi Amanah" eyebrow="Operasional Lapangan" />
        <ErrorState
          title="Distribusi tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission distributions.read."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="distribution-list-title">
      <PageHeader
        eyebrow="Operasional Lapangan"
        title="Distribusi Amanah"
        description="Rencanakan, tugaskan, laksanakan, konfirmasi, dan verifikasi penyerahan kepada penerima."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="distributions"
            onClick={() => create("distributions")}
          >
            <Plus aria-hidden="true" size={16} />
            Rencana Distribusi
          </ProtectedActionButton>
        }
      />
      <FilterBar
        searchPlaceholder="Cari referensi, penerima, atau program..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          aria-label="Filter status distribusi"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Semua status</option>
          {[
            "draft",
            "ready",
            "assigned",
            "in_progress",
            "executed",
            "confirmed",
            "revision_required",
            "verified",
            "completed",
            "cancelled",
          ].map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </FilterBar>
      <ResourceTable
        columns={columns}
        items={result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada rencana distribusi"
            description="Rencana dibuat dari pencairan dana yang sudah dibukukan dan kasus yang eligible."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("distributions", item.id)}
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
