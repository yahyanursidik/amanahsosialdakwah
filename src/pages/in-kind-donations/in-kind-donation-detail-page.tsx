import { useNavigation, useOne } from "@refinedev/core";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { Link, useParams } from "react-router";

import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import {
  donorTypeLabels,
  givingTypeLabels,
  itemConditionLabels,
  labelOf,
} from "@/features/giving/labels";
import type { InKindDonation } from "@/features/in-kind-donations/types";
import { useOrganization } from "@/features/organizations/organization-context";

export function InKindDonationDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const { activeOrganization } = useOrganization();
  const query = useOne<InKindDonation>({
    id,
    resource: "in_kind_donations",
    queryOptions: { enabled: Boolean(id) },
  });

  if (query.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  }
  if (query.query.isError || !query.result) {
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Donasi barang" title="Tanda terima" />
        <ErrorState
          title="Donasi barang tidak ditemukan"
          description="Data tidak tersedia atau berada pada organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const record = query.result;
  const organizationName =
    activeOrganization?.organization.name ?? "Lembaga pengelola";

  return (
    <section className="workspace-page print-document">
      <PageHeader
        eyebrow="Penghimpunan · Donasi barang"
        title={`Tanda terima ${record.reference_number}`}
        description="Dokumen ini dapat dicetak atau disimpan sebagai PDF untuk diberikan kepada donatur."
        actions={
          <div className="print-hidden flex gap-2">
            <Button variant="outline" onClick={() => list("in_kind_donations")}>
              <ArrowLeft aria-hidden size={16} /> Daftar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer aria-hidden size={16} /> Cetak tanda terima
            </Button>
          </div>
        }
      />

      <DetailSection
        title={`Tanda Terima Donasi Barang — ${organizationName}`}
        items={[
          { label: "Nomor", value: record.reference_number },
          {
            label: "Diterima pada",
            value: new Date(record.received_at).toLocaleString("id-ID"),
          },
          {
            label: "Donatur",
            value: `${record.donor_name} (${labelOf(donorTypeLabels, record.donor_type)})`,
          },
          {
            label: "Jenis amanah",
            value: labelOf(givingTypeLabels, record.giving_type),
          },
          {
            label: "Peruntukan",
            value:
              record.program_name ??
              record.waqf_asset_name ??
              "Umum — dialokasikan sesuai kebutuhan program",
          },
          { label: "Gudang", value: record.warehouse_name ?? "—" },
          {
            label: "Estimasi nilai",
            value: (
              <MoneyDisplay
                amount={record.estimated_total_value}
                currency={record.currency}
              />
            ),
          },
          { label: "Catatan", value: record.notes ?? "—" },
        ]}
      />

      <DetailSection title="Rincian barang">
        <ResourceTable
          items={record.items ?? []}
          getRowId={(item) => item.id}
          columns={[
            {
              header: "Barang",
              key: "product",
              render: (item) => (
                <div className="crm-contact-cell">
                  <strong>{item.product_name}</strong>
                  <small>
                    {item.product_sku ?? ""}
                    {item.batch_number ? ` · batch ${item.batch_number}` : ""}
                    {item.expires_at ? ` · ED ${item.expires_at}` : ""}
                  </small>
                </div>
              ),
            },
            {
              align: "right",
              header: "Jumlah",
              key: "quantity",
              render: (item) =>
                `${Number(item.quantity).toLocaleString("id-ID")} ${item.unit}`,
            },
            {
              header: "Kondisi",
              key: "condition",
              render: (item) =>
                labelOf(itemConditionLabels, item.item_condition),
            },
            {
              align: "right",
              header: "Nilai / unit",
              key: "unit_value",
              render: (item) => (
                <MoneyDisplay amount={item.unit_value} currency="IDR" />
              ),
            },
            {
              align: "right",
              header: "Subtotal",
              key: "total",
              render: (item) => (
                <MoneyDisplay amount={item.total_value} currency="IDR" />
              ),
            },
          ]}
        />
      </DetailSection>

      <p className="text-muted-foreground text-sm">
        Jazaakumullahu khairan. Barang telah dicatat masuk stok dan akan
        disalurkan sesuai amanah. Donatur dapat meminta laporan penyaluran
        melalui lembaga.
      </p>

      {record.donor_contact_id ? (
        <p className="print-hidden">
          <Link to={`/reports/stakeholders/${record.donor_contact_id}`}>
            <FileText aria-hidden className="mr-1 inline" size={16} />
            Lihat laporan lengkap donatur ini
          </Link>
        </p>
      ) : null}
    </section>
  );
}
