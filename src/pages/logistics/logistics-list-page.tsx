import { useList, useNavigation } from "@refinedev/core";
import { Eye, Plus, Truck } from "lucide-react";

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
  LogisticsCourier,
  LogisticsShipment,
} from "@/features/logistics/types";

function shipmentTone(status: string) {
  if (status === "delivered") return "success" as const;
  if (["cancelled", "returned"].includes(status)) return "danger" as const;
  if (["dispatched", "in_transit", "returning"].includes(status))
    return "info" as const;
  if (status === "return_requested") return "warning" as const;
  return "neutral" as const;
}

export function LogisticsListPage() {
  const { create, show } = useNavigation();
  const shipments = useList<LogisticsShipment>({
    resource: "logistics_shipments",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const couriers = useList<LogisticsCourier>({
    resource: "logistics_couriers",
    pagination: { currentPage: 1, pageSize: 50, mode: "server" },
  });
  const shipmentColumns: ResourceTableColumn<LogisticsShipment>[] = [
    {
      key: "reference",
      header: "Shipment",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong className="text-primary font-mono text-xs">
            {item.reference_number}
          </strong>
          <small>{item.tracking_number ?? "Belum ada tracking"}</small>
        </div>
      ),
    },
    {
      key: "destination",
      header: "Tujuan",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.destination_name}</strong>
          <small>
            {item.package_count} paket · {item.packing_reference}
          </small>
        </div>
      ),
    },
    {
      key: "courier",
      header: "Kurir",
      render: (item) => `${item.courier_code} / ${item.courier_name}`,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={shipmentTone(item.status)}>
          {item.status.replaceAll("_", " ")}
        </StatusBadge>
      ),
    },
  ];
  const courierColumns: ResourceTableColumn<LogisticsCourier>[] = [
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
      header: "Kurir",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.name}</strong>
          <small>{item.courier_type}</small>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontak",
      render: (item) => item.contact_name ?? "-",
    },
    {
      key: "status",
      header: "Status",
      render: (item) => (
        <StatusBadge tone={item.status === "active" ? "success" : "neutral"}>
          {item.status}
        </StatusBadge>
      ),
    },
  ];
  if (shipments.query.isError || couriers.query.isError)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Operasional" title="Logistik" />
        <ErrorState
          title="Data logistik tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission logistik."
          onRetry={() => {
            void shipments.query.refetch();
            void couriers.query.refetch();
          }}
        />
      </section>
    );
  return (
    <section className="workspace-page" aria-labelledby="logistics-title">
      <PageHeader
        eyebrow="Operasional / Logistics"
        title="Logistik & Shipment"
        description="Kendalikan keberangkatan, tracking, penerimaan, return, dan insiden tanpa menghapus jejak perjalanan."
        actions={
          <>
            <ProtectedActionButton
              action="manage"
              resource="logistics_couriers"
              onClick={() => create("logistics_couriers")}
            >
              <Plus aria-hidden size={16} />
              Kurir
            </ProtectedActionButton>
            <ProtectedActionButton
              action="manage"
              resource="logistics_shipments"
              onClick={() => create("logistics_shipments")}
            >
              <Truck aria-hidden size={16} />
              Shipment
            </ProtectedActionButton>
          </>
        }
      />
      <div className="section-heading">
        <div>
          <h2>Shipment</h2>
          <p>
            Paket yang keluar dari gudang sampai diterima atau dikembalikan.
          </p>
        </div>
      </div>
      <ResourceTable
        columns={shipmentColumns}
        items={shipments.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={shipments.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada shipment"
            description="Buat shipment dari packing berstatus packed."
          />
        }
        rowActions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => show("logistics_shipments", item.id)}
          >
            <Eye aria-hidden size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />
      <div className="section-heading">
        <div>
          <h2>Master kurir</h2>
          <p>Kurir internal, eksternal, dan mitra penyalur.</p>
        </div>
      </div>
      <ResourceTable
        columns={courierColumns}
        items={couriers.result?.data ?? []}
        getRowId={(item) => item.id}
        isLoading={couriers.query.isLoading}
        empty={
          <EmptyState
            title="Belum ada kurir"
            description="Tambahkan kurir sebelum membuat shipment."
          />
        }
      />
    </section>
  );
}
