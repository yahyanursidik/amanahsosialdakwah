import { useList, useNavigation } from "@refinedev/core";
import { Eye, Plus, Sprout } from "lucide-react";

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
import type { WaqfAsset } from "@/features/waqf/types";

function tone(status: string) {
  if (["active", "verified"].includes(status)) return "success" as const;
  if (["disputed", "retired", "suspended"].includes(status))
    return "danger" as const;
  if (["pending_review", "under_maintenance"].includes(status))
    return "warning" as const;
  return "neutral" as const;
}

export function WaqfListPage() {
  const { create, show } = useNavigation();
  const assets = useList<WaqfAsset>({
    resource: "waqf_assets",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });

  const columns: ResourceTableColumn<WaqfAsset>[] = [
    {
      key: "asset",
      header: "Aset wakaf",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.name}</strong>
          <small>
            {item.reference_number} · {item.asset_type.replaceAll("_", " ")}
          </small>
        </div>
      ),
    },
    {
      key: "donor",
      header: "Wakif/Pemberi",
      render: (item) => item.donor_name ?? "Belum dicatat",
    },
    {
      key: "value",
      header: "Nilai terakhir",
      render: (item) =>
        item.latest_valuation || item.acquisition_value ? (
          <MoneyDisplay
            amount={item.latest_valuation ?? item.acquisition_value}
            currency={item.currency}
          />
        ) : (
          "-"
        ),
    },
    {
      key: "impact",
      header: "Pendapatan / Manfaat",
      render: (item) => (
        <div className="crm-contact-cell">
          <MoneyDisplay amount={item.total_income ?? "0"} currency="IDR" />
          <small>
            Manfaat:{" "}
            <MoneyDisplay amount={item.total_benefit ?? "0"} currency="IDR" />
          </small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={tone(item.operational_status)}>
            {item.operational_status.replaceAll("_", " ")}
          </StatusBadge>
          <StatusBadge tone={tone(item.legal_status)}>
            {item.legal_status.replaceAll("_", " ")}
          </StatusBadge>
        </div>
      ),
    },
  ];

  if (assets.query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Program & layanan" title="Wakaf" />
        <ErrorState
          title="Data wakaf tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission wakaf."
          onRetry={() => assets.query.refetch()}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Program & layanan"
        title="Wakaf"
        description="Kelola aset, legalitas, nazhir, valuasi, pemanfaatan, pendapatan, dan distribusi manfaat wakaf tanpa menghapus jejak amanah."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="waqf_assets"
            onClick={() => create("waqf_assets")}
          >
            <Plus size={16} /> Aset wakaf
          </ProtectedActionButton>
        }
      />
      <div className="rounded-3xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Sprout aria-hidden size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Kendali amanah aset</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Aset draft harus memiliki dokumen legal terverifikasi sebelum
              diregistrasi aktif. Pemasukan dan distribusi manfaat dicatat
              append-only.
            </p>
          </div>
        </div>
      </div>
      <ResourceTable
        columns={columns}
        items={assets.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={assets.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada aset wakaf"
            description="Catat aset wakaf pertama, lalu lengkapi dokumen legal dan nazhir."
          />
        }
        rowActions={(item) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => show("waqf_assets", item.id)}
          >
            <Eye aria-hidden size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />
    </section>
  );
}
