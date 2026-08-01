import { useList, useNavigation } from "@refinedev/core";
import { Eye, PackagePlus, Plus } from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type {
  AidPackagePacking,
  AidPackageTemplate,
} from "@/features/aid-packages/types";

function tone(status: string) {
  if (["active", "packed"].includes(status)) return "success" as const;
  if (["cancelled", "reversed", "archived"].includes(status))
    return "danger" as const;
  return "neutral" as const;
}

export function AidPackageListPage() {
  const { create, show } = useNavigation();
  const templates = useList<AidPackageTemplate>({
    resource: "aid_package_templates",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const packings = useList<AidPackagePacking>({
    resource: "aid_package_packings",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const templateColumns: ResourceTableColumn<AidPackageTemplate>[] = [
    {
      key: "code",
      header: "Kode",
      render: (item) => (
        <span className="text-primary font-mono text-xs font-semibold">
          {item.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Template",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.name}</strong>
          <small>{item.item_count} komponen</small>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      ),
    },
  ];
  const packingColumns: ResourceTableColumn<AidPackagePacking>[] = [
    {
      key: "reference",
      header: "Referensi",
      render: (item) => (
        <span className="text-primary font-mono text-xs font-semibold">
          {item.reference_number}
        </span>
      ),
    },
    {
      key: "template",
      header: "Paket",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.template_name}</strong>
          <small>
            {item.package_count} paket ·{" "}
            {item.recipient_label ?? "Tanpa label penerima"}
          </small>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Gudang",
      render: (item) => `${item.warehouse_code} / ${item.warehouse_name}`,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={tone(item.status)}>{item.status}</StatusBadge>
      ),
    },
  ];

  if (templates.query.isError || packings.query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Operasional" title="Paket Bantuan" />
        <ErrorState
          title="Paket bantuan tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission paket bantuan."
          onRetry={() => {
            void templates.query.refetch();
            void packings.query.refetch();
          }}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="aid-package-title">
      <PageHeader
        eyebrow="Inventory / Aid Packages"
        title="Paket Bantuan"
        description="Susun komposisi baku, packing dengan batch FEFO, dan reversal tanpa menghapus jejak stok."
        actions={
          <>
            <ProtectedActionButton
              action="manage"
              resource="aid_package_templates"
              onClick={() => create("aid_package_templates")}
            >
              <Plus aria-hidden size={16} />
              Template
            </ProtectedActionButton>
            <ProtectedActionButton
              action="manage"
              resource="aid_package_packings"
              onClick={() => create("aid_package_packings")}
            >
              <PackagePlus aria-hidden size={16} />
              Packing
            </ProtectedActionButton>
          </>
        }
      />
      <div className="section-heading">
        <div>
          <h2>Template paket</h2>
          <p>Komposisi per satu paket; template aktif bersifat immutable.</p>
        </div>
      </div>
      <ResourceTable
        columns={templateColumns}
        items={templates.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={templates.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada template paket"
            description="Buat komposisi paket sebelum proses packing."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("aid_package_templates", item.id)}
          >
            <Eye aria-hidden size={16} />
            <span className="sr-only">Lihat {item.name}</span>
          </Button>
        )}
      />
      <div className="section-heading">
        <div>
          <h2>Riwayat packing</h2>
          <p>Setiap packing membukukan batch aktual ke movement stok.</p>
        </div>
      </div>
      <ResourceTable
        columns={packingColumns}
        items={packings.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={packings.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada packing"
            description="Buat rencana packing dari template aktif dan gudang sumber."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("aid_package_packings", item.id)}
          >
            <Eye aria-hidden size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />
    </section>
  );
}
