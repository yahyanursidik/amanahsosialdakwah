import { useList, useNavigation } from "@refinedev/core";
import { Eye, FileStack, Plus, Sprout } from "lucide-react";
import { Link } from "react-router";

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
import { buttonVariants } from "@/components/ui/button-variants";
import {
  labelOf,
  toneOf,
  waqfAssetTypeLabels,
  waqfLegalStatusLabels,
  waqfOperationalStatusLabels,
  waqfSchemeLabels,
} from "@/features/giving/labels";
import type { WaqfAsset } from "@/features/waqf/types";

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
            {item.reference_number} · {labelOf(waqfAssetTypeLabels, item.asset_type)}
          </small>
          <small>{labelOf(waqfSchemeLabels, item.collection_scheme)}</small>
        </div>
      ),
    },
    {
      key: "donor",
      header: "Wakif",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.donor_name ?? "Wakif kolektif"}</strong>
          <small>
            {item.wakif_count ?? 0} setoran wakif ·{" "}
            <MoneyDisplay amount={item.total_contributions ?? "0"} currency={item.currency} />
            {item.fundraising_target ? (
              <>
                {" "}dari{" "}
                <MoneyDisplay amount={item.fundraising_target} currency={item.currency} />
              </>
            ) : null}
          </small>
        </div>
      ),
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
          <StatusBadge tone={toneOf(item.operational_status)}>
            {labelOf(waqfOperationalStatusLabels, item.operational_status)}
          </StatusBadge>
          <StatusBadge tone={toneOf(item.legal_status)}>
            {labelOf(waqfLegalStatusLabels, item.legal_status)}
          </StatusBadge>
        </div>
      ),
    },
  ];

  if (assets.query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Wakaf" title="Wakaf" />
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
        eyebrow="Wakaf"
        title="Wakaf"
        description="Kelola aset, legalitas, nazhir, valuasi, pemanfaatan, pendapatan, dan distribusi manfaat wakaf tanpa menghapus jejak amanah."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/waqf/proposals"
            >
              <FileStack aria-hidden size={16} /> Pengajuan program wakaf
            </Link>
            <ProtectedActionButton
              action="manage"
              resource="waqf_assets"
              onClick={() => create("waqf_assets")}
            >
              <Plus size={16} /> Aset wakaf
            </ProtectedActionButton>
          </div>
        }
      />
      <div className="rounded-3xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Sprout aria-hidden size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Alur pengelolaan wakaf</h2>
            <ol className="text-muted-foreground mt-1 list-decimal space-y-1 pl-5 text-sm">
              <li>
                Usulan dari individu/lembaga masuk lewat <strong>Pengajuan program wakaf</strong>,
                atau catat aset langsung.
              </li>
              <li>
                Catat <strong>setoran wakif</strong> (wakaf uang, patungan, atau benda) pada detail aset.
              </li>
              <li>
                Lengkapi dokumen legal (AIW/sertifikat) → verifikasi → registrasi aktif.
              </li>
              <li>
                Kelola: nazhir, pemanfaatan, pendapatan hasil, lalu salurkan manfaat.
              </li>
            </ol>
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
