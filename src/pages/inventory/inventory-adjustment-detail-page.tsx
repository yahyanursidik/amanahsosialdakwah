import { useCustomMutation, useNavigation, useOne, type HttpError } from "@refinedev/core";
import { ArrowLeft, Check, Send, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import {
  DetailSection,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  QuantityDisplay,
  StatusBadge,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  InventoryAdjustment,
  InventoryAdjustmentStatus,
} from "@/features/inventory/types";

function statusTone(status: InventoryAdjustmentStatus) {
  if (["approved", "posted"].includes(status)) return "success" as const;
  if (["cancelled", "rejected"].includes(status)) return "danger" as const;
  if (status === "submitted") return "info" as const;
  return "neutral" as const;
}

export function InventoryAdjustmentDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<InventoryAdjustment>({
    id,
    queryOptions: { enabled: Boolean(id) },
    resource: "inventory_adjustments",
  });
  const command = useCustomMutation<
    InventoryAdjustment,
    HttpError,
    Record<string, unknown>
  >();
  const [notes, setNotes] = useState("");

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
        <PageHeader title="Detail Adjustment" eyebrow="Inventory" />
        <ErrorState
          title="Adjustment tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const record = query.result;
  const mutate = (path: string, values: Record<string, unknown> = {}, idempotent = false) => {
    command.mutate(
      {
        ...(idempotent
          ? { config: { headers: { "Idempotency-Key": crypto.randomUUID() } } }
          : {}),
        method: "post",
        url: path,
        values,
      },
      { onSuccess: () => query.query.refetch() },
    );
  };
  const submit =
    (handler: () => void) =>
    (event: FormEvent) => {
      event.preventDefault();
      handler();
    };

  return (
    <section className="workspace-page" aria-labelledby="inventory-adjustment-detail-title">
      <PageHeader
        eyebrow={`Inventory / ${record.reference_number}`}
        title={record.product_name}
        description={`${record.warehouse_code} - ${record.warehouse_name}`}
        meta={
          <StatusBadge tone={statusTone(record.status)}>
            {record.status.replaceAll("_", " ")}
          </StatusBadge>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => list("inventory_products")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            {record.status === "draft" ? (
              <CanAccess action="submit" resource="inventory_adjustments">
                <Button
                  disabled={command.mutation.isPending}
                  onClick={() =>
                    mutate(`/api/v1/inventory/adjustments/${record.id}/submit`, {
                      notes: "Adjustment siap direview.",
                    })
                  }
                >
                  <Send aria-hidden="true" size={16} />
                  Submit
                </Button>
              </CanAccess>
            ) : null}
            {record.status === "approved" ? (
              <CanAccess action="post" resource="inventory_adjustments">
                <Button
                  disabled={command.mutation.isPending}
                  onClick={() =>
                    mutate(
                      `/api/v1/inventory/adjustments/${record.id}/post`,
                      {},
                      true,
                    )
                  }
                >
                  <Check aria-hidden="true" size={16} />
                  Posting
                </Button>
              </CanAccess>
            ) : null}
          </>
        }
      />

      {command.mutation.isError ? (
        <ErrorState
          title="Command inventory ditolak"
          description={command.mutation.error?.message ?? "Periksa izin, status, dan saldo stok."}
        />
      ) : null}

      <DetailSection
        title="Konteks Adjustment"
        items={[
          { label: "SKU", value: record.sku },
          { label: "Jenis", value: record.adjustment_type.replaceAll("_", " ") },
          {
            label: "Delta",
            value: (
              <QuantityDisplay
                maximumFractionDigits={4}
                unit={record.unit}
                value={Number(record.expected_delta)}
              />
            ),
          },
          { label: "Batch", value: record.batch_number ?? "-" },
          { label: "Expiry", value: record.expires_at ?? "-" },
          { label: "Dibuat oleh", value: record.creator_name ?? "-" },
          { label: "Disetujui oleh", value: record.approver_name ?? "-" },
          { label: "Diposting oleh", value: record.poster_name ?? "-" },
        ]}
      >
        <p className="mt-5 text-sm">{record.notes}</p>
        {record.decision_notes ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Catatan keputusan: {record.decision_notes}
          </p>
        ) : null}
      </DetailSection>

      {record.status === "submitted" ? (
        <CanAccess action="approve" resource="inventory_adjustments">
          <form
            className="form-section"
            onSubmit={submit(() =>
              mutate(`/api/v1/inventory/adjustments/${record.id}/approve`, {
                notes,
              }),
            )}
          >
            <div className="section-heading">
              <div>
                <h2>Keputusan Adjustment</h2>
                <p>Approver tidak boleh sama dengan pembuat adjustment.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="auth-field">
                <Label htmlFor="decision_notes">Catatan keputusan</Label>
                <textarea
                  id="decision_notes"
                  minLength={10}
                  required
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                <Check aria-hidden="true" size={16} />
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={command.mutation.isPending}
                onClick={() =>
                  mutate(`/api/v1/inventory/adjustments/${record.id}/cancel`, {
                    notes,
                  })
                }
              >
                <XCircle aria-hidden="true" size={16} />
                Batalkan
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}
    </section>
  );
}
