import { useList, useNavigation } from "@refinedev/core";
import { Eye, Gift, Plus } from "lucide-react";
import { useState } from "react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import {
  donorTypeLabels,
  givingTypeLabels,
  labelOf,
  optionsOf,
} from "@/features/giving/labels";
import type { InKindDonation } from "@/features/in-kind-donations/types";

export function InKindDonationListPage() {
  const { create, show } = useNavigation();
  const [givingType, setGivingType] = useState("");
  const [search, setSearch] = useState("");
  const donations = useList<InKindDonation>({
    resource: "in_kind_donations",
    filters: [
      { field: "giving_type", operator: "eq", value: givingType },
      { field: "q", operator: "eq", value: search },
    ],
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });

  const columns: ResourceTableColumn<InKindDonation>[] = [
    {
      key: "reference",
      header: "Tanda terima",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.reference_number}</strong>
          <small>{new Date(item.received_at).toLocaleString("id-ID")}</small>
        </div>
      ),
    },
    {
      key: "donor",
      header: "Donatur",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.donor_name}</strong>
          <small>{labelOf(donorTypeLabels, item.donor_type)}</small>
        </div>
      ),
    },
    {
      key: "type",
      header: "Jenis amanah",
      render: (item) => (
        <StatusBadge tone="info">
          {labelOf(givingTypeLabels, item.giving_type)}
        </StatusBadge>
      ),
    },
    {
      key: "destination",
      header: "Peruntukan",
      render: (item) =>
        item.program_name ??
        item.waqf_asset_name ??
        "Umum (belum terikat program)",
    },
    {
      key: "items",
      header: "Barang",
      align: "right",
      render: (item) => `${item.item_count ?? 0} jenis`,
    },
    {
      key: "value",
      header: "Estimasi nilai",
      align: "right",
      render: (item) => (
        <MoneyDisplay
          amount={item.estimated_total_value}
          currency={item.currency}
        />
      ),
    },
  ];

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Penghimpunan"
        title="Donasi barang"
        description="Catat barang yang diberikan donatur (sembako, pakaian, alat sekolah, dll.). Barang langsung masuk stok gudang dan dapat dipakai untuk paket bantuan serta distribusi."
        actions={
          <ProtectedActionButton
            action="receive"
            resource="in_kind_donations"
            onClick={() => create("in_kind_donations")}
          >
            <Plus size={16} /> Terima donasi barang
          </ProtectedActionButton>
        }
      />
      <div className="rounded-3xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Gift aria-hidden size={22} />
          </div>
          <div className="text-sm">
            <h2 className="text-lg font-semibold">Alur singkat</h2>
            <ol className="text-muted-foreground mt-1 list-decimal space-y-1 pl-5">
              <li>Pastikan barang sudah ada di master produk Inventory.</li>
              <li>
                Terima donasi: pilih donatur, jenis amanah, gudang, dan rincian
                barang.
              </li>
              <li>
                Cetak tanda terima untuk donatur; stok gudang bertambah otomatis.
              </li>
              <li>
                Gunakan stok untuk Paket bantuan → Logistik → Distribusi.
              </li>
            </ol>
          </div>
        </div>
      </div>
      <div className="filter-bar flex flex-wrap gap-3">
        <input
          aria-label="Cari donasi barang"
          className="min-w-64 flex-1 rounded-xl border px-3 py-2"
          placeholder="Cari nomor, donatur, atau program…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Jenis amanah"
          className="rounded-xl border px-3 py-2"
          value={givingType}
          onChange={(event) => setGivingType(event.target.value)}
        >
          <option value="">Semua jenis amanah</option>
          {optionsOf(givingTypeLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {donations.query.isError ? (
        <ErrorState
          title="Donasi barang tidak dapat dimuat"
          description="Periksa organisasi aktif dan izin donasi barang."
          onRetry={() => donations.query.refetch()}
        />
      ) : (
        <ResourceTable
          columns={columns}
          items={donations.result?.data ?? []}
          getRowId={(item) => item.id}
          isLoading={donations.query.isLoading}
          empty={
            <EmptyState
              title="Belum ada donasi barang"
              description="Catat penerimaan barang pertama agar donatur mendapat tanda terima dan stok tercatat."
            />
          }
          rowActions={(item) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => show("in_kind_donations", item.id)}
            >
              <Eye aria-hidden size={16} />
              <span className="sr-only">Lihat {item.reference_number}</span>
            </Button>
          )}
        />
      )}
    </section>
  );
}
