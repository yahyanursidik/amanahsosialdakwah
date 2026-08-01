import {
  useCustomMutation,
  useList,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, PackageCheck, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import type {
  AidPackagePacking,
  AidPackagePackingItem,
  AidPackageTemplateItem,
} from "@/features/aid-packages/types";
import type { InventoryProduct } from "@/features/inventory/types";

type Substitution = { product_id: string; reason: string };

export function AidPackagePackingDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<AidPackagePacking>({
    id,
    resource: "aid_package_packings",
    queryOptions: { enabled: Boolean(id) },
  });
  const products = useList<InventoryProduct>({
    resource: "inventory_products",
    pagination: { currentPage: 1, pageSize: 100, mode: "server" },
    queryOptions: { enabled: query.result?.status === "draft" },
  });
  const command = useCustomMutation<
    AidPackagePacking,
    HttpError,
    Record<string, unknown>
  >();
  const [reason, setReason] = useState("");
  const [substitutions, setSubstitutions] = useState<
    Record<string, Substitution>
  >({});
  const productMap = useMemo(
    () =>
      new Map(
        (products.result?.data ?? []).map((product) => [product.id, product]),
      ),
    [products.result?.data],
  );
  if (query.query.isLoading)
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={8} />
      </section>
    );
  if (query.query.isError || !query.result)
    return (
      <section className="workspace-page">
        <PageHeader eyebrow="Paket Bantuan" title="Detail Packing" />
        <ErrorState
          title="Packing tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  const record = query.result;
  const actualColumns: ResourceTableColumn<AidPackagePackingItem>[] = [
    {
      key: "requested",
      header: "Komponen",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.requested_product_name}</strong>
          <small>{item.requested_sku}</small>
        </div>
      ),
    },
    {
      key: "actual",
      header: "Produk aktual",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.actual_product_name}</strong>
          <small>
            {item.is_substitution ? "Substitusi" : "Sesuai template"}
          </small>
        </div>
      ),
    },
    {
      key: "batch",
      header: "Batch / expiry",
      render: (item) =>
        `${item.batch_number ?? "Tanpa batch"} / ${item.expires_at ?? "-"}`,
    },
    {
      key: "quantity",
      header: "Diambil",
      render: (item) => (
        <QuantityDisplay
          value={Number(item.quantity)}
          unit={item.unit}
          maximumFractionDigits={4}
        />
      ),
    },
  ];
  const run = (
    path: string,
    values: Record<string, unknown>,
    idempotent = false,
  ) =>
    command.mutate(
      {
        url: path,
        method: "post",
        values,
        ...(idempotent
          ? { config: { headers: { "Idempotency-Key": crypto.randomUUID() } } }
          : {}),
      },
      { onSuccess: () => query.query.refetch() },
    );
  return (
    <section className="workspace-page" aria-labelledby="packing-detail-title">
      <PageHeader
        eyebrow={`Paket Bantuan / ${record.reference_number}`}
        title={record.template_name}
        description={`${record.package_count} paket dari ${record.warehouse_code} — ${record.warehouse_name}`}
        meta={
          <StatusBadge
            tone={
              record.status === "packed"
                ? "success"
                : ["cancelled", "reversed"].includes(record.status)
                  ? "danger"
                  : "neutral"
            }
          >
            {record.status}
          </StatusBadge>
        }
        actions={
          <Button
            variant="outline"
            onClick={() => list("aid_package_packings")}
          >
            <ArrowLeft aria-hidden size={16} />
            Daftar
          </Button>
        }
      />
      {command.mutation.isError ? (
        <ErrorState
          title="Command packing ditolak"
          description={
            command.mutation.error?.message ??
            "Periksa stok, batch, status, dan permission."
          }
        />
      ) : null}
      <DetailSection
        title="Konteks packing"
        items={[
          {
            label: "Template",
            value: `${record.template_code} — ${record.template_name}`,
          },
          { label: "Jumlah", value: `${record.package_count} paket` },
          { label: "Tujuan", value: record.recipient_label ?? "-" },
          {
            label: "Dipacking",
            value: record.packed_at
              ? new Date(record.packed_at).toLocaleString("id-ID")
              : "Belum",
          },
          {
            label: "Direversal",
            value: record.reversed_at
              ? new Date(record.reversed_at).toLocaleString("id-ID")
              : "Belum",
          },
        ]}
      >
        {record.notes ? <p className="mt-4 text-sm">{record.notes}</p> : null}
        {record.reversal_reason ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Alasan: {record.reversal_reason}
          </p>
        ) : null}
      </DetailSection>
      {record.status === "draft" ? (
        <CanAccess action="pack" resource="aid_package_packings">
          <section className="form-section">
            <div className="section-heading">
              <div>
                <h2>Konfirmasi komposisi</h2>
                <p>
                  Tanpa pilihan substitusi, sistem mengambil produk template
                  menggunakan FEFO.
                </p>
              </div>
            </div>
            <div className="form-section__body space-y-4">
              {(record.planned_items ?? []).map(
                (item: AidPackageTemplateItem) => {
                  const selected =
                    substitutions[item.id]?.product_id ?? item.product_id;
                  return (
                    <div
                      className="form-grid rounded-xl border p-4"
                      key={item.id}
                    >
                      <div className="auth-field">
                        <Label>Komponen</Label>
                        <strong>{item.product_name}</strong>
                        <small>
                          {item.quantity} {item.unit} × {record.package_count}
                        </small>
                      </div>
                      <div className="auth-field">
                        <Label htmlFor={`actual-${item.id}`}>
                          Produk aktual
                        </Label>
                        <select
                          id={`actual-${item.id}`}
                          value={selected}
                          disabled={!item.allow_substitution}
                          onChange={(e) =>
                            setSubstitutions((current) => ({
                              ...current,
                              [item.id]: {
                                product_id: e.target.value,
                                reason: current[item.id]?.reason ?? "",
                              },
                            }))
                          }
                        >
                          <option value={item.product_id}>
                            {item.sku} — {item.product_name}
                          </option>
                          {item.allow_substitution
                            ? (products.result?.data ?? [])
                                .filter(
                                  (product) =>
                                    product.id !== item.product_id &&
                                    product.base_unit === item.unit,
                                )
                                .map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.sku} — {product.name}
                                  </option>
                                ))
                            : null}
                        </select>
                      </div>
                      {selected !== item.product_id ? (
                        <div className="auth-field auth-field--wide">
                          <Label htmlFor={`reason-${item.id}`}>
                            Alasan substitusi
                          </Label>
                          <input
                            id={`reason-${item.id}`}
                            required
                            minLength={10}
                            value={substitutions[item.id]?.reason ?? ""}
                            onChange={(e) =>
                              setSubstitutions((current) => ({
                                ...current,
                                [item.id]: {
                                  product_id: selected,
                                  reason: e.target.value,
                                },
                              }))
                            }
                          />
                          <small>
                            Satuan:{" "}
                            {productMap.get(selected)?.base_unit ?? item.unit}
                          </small>
                        </div>
                      ) : null}
                    </div>
                  );
                },
              )}
            </div>
            <div className="form-section__footer">
              <Button
                disabled={command.mutation.isPending}
                onClick={() =>
                  run(
                    `/api/v1/aid-packages/packings/${record.id}/pack`,
                    {
                      substitutions: Object.entries(substitutions)
                        .filter(
                          ([itemId, value]) =>
                            value.product_id !==
                            (record.planned_items ?? []).find(
                              (item) => item.id === itemId,
                            )?.product_id,
                        )
                        .map(([template_item_id, value]) => ({
                          template_item_id,
                          product_id: value.product_id,
                          reason: value.reason,
                        })),
                    },
                    true,
                  )
                }
              >
                <PackageCheck aria-hidden size={16} />
                Packing dengan FEFO
              </Button>
            </div>
          </section>
        </CanAccess>
      ) : null}
      {record.status === "draft" || record.status === "packed" ? (
        <section className="form-section">
          <div className="section-heading">
            <div>
              <h2>
                {record.status === "draft"
                  ? "Batalkan rencana"
                  : "Unpack reversal"}
              </h2>
              <p>
                {record.status === "draft"
                  ? "Pembatalan tidak mengubah stok."
                  : "Seluruh movement packing dikembalikan sebagai movement baru."}
              </p>
            </div>
          </div>
          <div className="form-section__body">
            <div className="auth-field">
              <Label htmlFor="packing-reason">Alasan</Label>
              <textarea
                id="packing-reason"
                required
                minLength={10}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <div className="form-section__footer">
            {record.status === "draft" ? (
              <CanAccess action="cancel" resource="aid_package_packings">
                <Button
                  variant="outline"
                  disabled={
                    reason.trim().length < 10 || command.mutation.isPending
                  }
                  onClick={() =>
                    run(`/api/v1/aid-packages/packings/${record.id}/cancel`, {
                      reason,
                    })
                  }
                >
                  <XCircle aria-hidden size={16} />
                  Batalkan
                </Button>
              </CanAccess>
            ) : (
              <CanAccess action="unpack" resource="aid_package_packings">
                <Button
                  variant="outline"
                  disabled={
                    reason.trim().length < 10 || command.mutation.isPending
                  }
                  onClick={() =>
                    run(
                      `/api/v1/aid-packages/packings/${record.id}/unpack`,
                      { reason },
                      true,
                    )
                  }
                >
                  <RotateCcw aria-hidden size={16} />
                  Unpack & reversal
                </Button>
              </CanAccess>
            )}
          </div>
        </section>
      ) : null}
      <div className="section-heading">
        <div>
          <h2>Batch aktual</h2>
          <p>Detail ini append-only dan menjadi bukti pemakaian stok.</p>
        </div>
      </div>
      <ResourceTable
        columns={actualColumns}
        items={record.items ?? []}
        getRowId={(item) => item.id}
        empty={
          <EmptyState
            title="Belum ada batch aktual"
            description="Batch akan dicatat saat packing berhasil."
          />
        }
      />
    </section>
  );
}
