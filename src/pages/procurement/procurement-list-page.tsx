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
  ProcurementRequest,
  ProcurementRequestStatus,
} from "@/features/procurement/types";

function statusTone(status: ProcurementRequestStatus) {
  if (["approved", "goods_received", "ordered"].includes(status)) {
    return "success" as const;
  }
  if (status === "cancelled") return "danger" as const;
  if (status === "submitted") return "info" as const;
  return "neutral" as const;
}

export function ProcurementListPage() {
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
  const { query, result } = useList<ProcurementRequest>({
    resource: "procurement",
    filters,
    pagination: { currentPage: page, pageSize, mode: "server" },
    queryOptions: { placeholderData: (previous) => previous },
  });
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columns: ResourceTableColumn<ProcurementRequest>[] = [
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
      header: "Kebutuhan",
      key: "title",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.title}</strong>
          <small>{item.program_name ?? "Tanpa program"}</small>
        </div>
      ),
    },
    {
      header: "Vendor / PO",
      key: "vendor",
      render: (item) =>
        item.purchase_order_reference
          ? `${item.vendor_name ?? "Vendor"} / ${item.purchase_order_reference}`
          : (item.vendor_name ?? "Belum ada vendor"),
    },
    {
      align: "right",
      header: "Nilai Quote",
      key: "amount",
      render: (item) =>
        item.quote_amount ? (
          <MoneyDisplay
            amount={item.quote_amount}
            currency={item.quote_currency ?? item.currency}
          />
        ) : (
          "Belum ada"
        ),
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
        <PageHeader title="Pengadaan" eyebrow="Procurement" />
        <ErrorState
          title="Pengadaan tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission procurement_requests.read."
          onRetry={() => query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="procurement-list-title">
      <PageHeader
        eyebrow="Procurement"
        title="Pengadaan Amanah"
        description="Kelola permintaan, vendor, purchase order, penerimaan barang, dan invoice vendor."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="procurement_requests"
            onClick={() => create("procurement")}
          >
            <Plus aria-hidden="true" size={16} />
            Permintaan Pengadaan
          </ProtectedActionButton>
        }
      />
      <FilterBar
        searchPlaceholder="Cari referensi, kebutuhan, atau vendor..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          aria-label="Filter status pengadaan"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">Semua status</option>
          {["draft", "submitted", "approved", "ordered", "goods_received", "cancelled"].map(
            (value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ),
          )}
        </select>
      </FilterBar>
      <ResourceTable
        columns={columns}
        items={result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={query.isLoading}
        empty={
          <EmptyState
            title="Belum ada pengadaan"
            description="Buat permintaan pengadaan untuk kebutuhan barang atau jasa operasional amanah."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("procurement", item.id)}
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
