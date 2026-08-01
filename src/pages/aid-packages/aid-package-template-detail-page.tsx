import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Send } from "lucide-react";
import { useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  QuantityDisplay,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import type {
  AidPackageTemplate,
  AidPackageTemplateItem,
} from "@/features/aid-packages/types";

export function AidPackageTemplateDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<AidPackageTemplate>({
    id,
    resource: "aid_package_templates",
    queryOptions: { enabled: Boolean(id) },
  });
  const publish = useCustomMutation<
    AidPackageTemplate,
    HttpError,
    Record<string, never>
  >();
  if (query.query.isLoading)
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  if (query.query.isError || !query.result)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Paket Bantuan" title="Detail Template" />
        <ErrorState
          title="Template tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  const record = query.result;
  const columns: ResourceTableColumn<AidPackageTemplateItem>[] = [
    {
      key: "product",
      header: "Produk",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.product_name}</strong>
          <small>{item.sku}</small>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Per paket",
      render: (item) => (
        <QuantityDisplay
          value={Number(item.quantity)}
          unit={item.unit}
          maximumFractionDigits={4}
        />
      ),
    },
    {
      key: "substitution",
      header: "Substitusi",
      render: (item) =>
        item.allow_substitution
          ? (item.substitution_notes ?? "Diizinkan")
          : "Tidak",
    },
  ];
  return (
    <section
      className="workspace-page"
      aria-labelledby="package-template-detail-title"
    >
      <PageHeader
        eyebrow={`Paket Bantuan / ${record.code}`}
        title={record.name}
        description={record.description ?? "Template komposisi paket bantuan."}
        meta={
          <StatusBadge
            tone={record.status === "active" ? "success" : "neutral"}
          >
            {record.status}
          </StatusBadge>
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => list("aid_package_templates")}
            >
              <ArrowLeft aria-hidden size={16} />
              Daftar
            </Button>
            {record.status === "draft" ? (
              <CanAccess action="publish" resource="aid_package_templates">
                <Button
                  disabled={publish.mutation.isPending}
                  onClick={() =>
                    publish.mutate(
                      {
                        url: `/api/v1/aid-packages/templates/${record.id}/publish`,
                        method: "post",
                        values: {},
                      },
                      { onSuccess: () => query.query.refetch() },
                    )
                  }
                >
                  <Send aria-hidden size={16} />
                  Terbitkan
                </Button>
              </CanAccess>
            ) : null}
          </>
        }
      />
      {publish.mutation.isError ? (
        <ErrorState
          title="Template gagal diterbitkan"
          description={
            publish.mutation.error?.message ??
            "Periksa permission dan status template."
          }
        />
      ) : null}
      <DetailSection
        title="Kendali template"
        items={[
          { label: "Kode", value: record.code },
          { label: "Status", value: record.status },
          {
            label: "Jumlah komponen",
            value: String(record.items?.length ?? record.item_count),
          },
          {
            label: "Diterbitkan",
            value: record.published_at
              ? new Date(record.published_at).toLocaleString("id-ID")
              : "Belum",
          },
        ]}
      />
      <div className="section-heading">
        <div>
          <h2>Komponen</h2>
          <p>
            Template aktif tidak dapat diedit diam-diam; buat versi/template
            baru untuk koreksi.
          </p>
        </div>
      </div>
      <ResourceTable
        columns={columns}
        items={record.items ?? []}
        getRowId={(item) => item.id}
        empty={<EmptyState title="Komponen tidak tersedia" />}
      />
    </section>
  );
}
