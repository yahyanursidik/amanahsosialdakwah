import { useCustomMutation, useNavigation, useOne, type HttpError } from "@refinedev/core";
import { ArrowLeft, Check, FileCheck2, PackageCheck, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

import { CanAccess } from "@/components/access-control/can-access";
import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  ApprovalTimeline,
  DetailSection,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MoneyDisplay,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ApprovalTimelineItem,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  GoodsReceipt,
  ProcurementEvent,
  ProcurementItem,
  ProcurementRequest,
  ProcurementRequestStatus,
  PurchaseOrder,
  VendorInvoice,
} from "@/features/procurement/types";

function statusTone(status: ProcurementRequestStatus | PurchaseOrder["status"]) {
  if (["approved", "ordered", "goods_received", "issued", "received"].includes(status)) {
    return "success" as const;
  }
  if (status === "cancelled") return "danger" as const;
  if (["submitted", "partially_received"].includes(status)) return "info" as const;
  return "neutral" as const;
}

function timeline(events: ProcurementEvent[] = []): ApprovalTimelineItem[] {
  return events.map((event) => ({
    ...(event.actor_name ? { actor: event.actor_name } : {}),
    description: event.notes ?? event.entity_type,
    status:
      event.to_status === "cancelled"
        ? "rejected"
        : ["approved", "issued", "received", "goods_received"].includes(event.to_status)
          ? "approved"
          : "pending",
    time: new Date(event.occurred_at).toLocaleString("id-ID"),
    title: event.event_type.replaceAll("_", " "),
  }));
}

function nowLocalIso() {
  return new Date().toISOString();
}

export function ProcurementDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const query = useOne<ProcurementRequest>({
    resource: "procurement",
    id,
    queryOptions: { enabled: Boolean(id) },
  });
  const record = query.result;
  const command = useCustomMutation<
    Record<string, unknown>,
    HttpError,
    Record<string, unknown>
  >();
  const [approvalNotes, setApprovalNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [vendorContactId, setVendorContactId] = useState("");
  const [poAmount, setPoAmount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptCondition, setReceiptCondition] = useState("");
  const [receivedStatus, setReceivedStatus] = useState<"partially_received" | "received">("received");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  if (query.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }
  if (query.query.isError || !record) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Pengadaan" eyebrow="Procurement" />
        <ErrorState
          title="Pengadaan tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => query.query.refetch()}
        />
      </section>
    );
  }

  const purchaseOrder = record.purchase_orders?.[0];
  const items = record.items ?? [];
  const currency = record.quote_currency ?? record.currency;
  const mutate = (
    url: string,
    values: Record<string, unknown> = {},
    idempotent = false,
    done?: () => void,
  ) => {
    command.mutate(
      {
        ...(idempotent
          ? { config: { headers: { "Idempotency-Key": crypto.randomUUID() } } }
          : {}),
        method: "post",
        url,
        values,
      },
      {
        onSuccess: () => {
          done?.();
          void query.query.refetch();
        },
      },
    );
  };
  const submit =
    (handler: () => void) =>
    (event: FormEvent) => {
      event.preventDefault();
      handler();
    };

  const itemColumns: ResourceTableColumn<ProcurementItem>[] = [
    { header: "Item", key: "name", render: (item) => item.name },
    { header: "Jumlah", key: "quantity", render: (item) => `${item.quantity} ${item.unit}` },
    {
      align: "right",
      header: "Estimasi",
      key: "price",
      render: (item) =>
        item.estimated_unit_price ? (
          <MoneyDisplay amount={item.estimated_unit_price} currency={record.currency} />
        ) : (
          "-"
        ),
    },
  ];
  const receiptColumns: ResourceTableColumn<GoodsReceipt>[] = [
    { header: "Nomor", key: "number", render: (item) => item.receipt_number },
    { header: "Status", key: "status", render: (item) => item.received_status.replaceAll("_", " ") },
    { header: "Ringkasan", key: "summary", render: (item) => item.condition_summary },
    {
      header: "Diterima",
      key: "received",
      render: (item) => new Date(item.received_at).toLocaleString("id-ID"),
    },
  ];
  const invoiceColumns: ResourceTableColumn<VendorInvoice>[] = [
    { header: "Invoice", key: "number", render: (item) => item.invoice_number },
    {
      align: "right",
      header: "Nilai",
      key: "amount",
      render: (item) => <MoneyDisplay amount={item.amount} currency={item.currency} />,
    },
    { header: "Referensi bayar", key: "payment", render: (item) => item.payment_reference ?? "-" },
  ];

  return (
    <section className="workspace-page" aria-labelledby="procurement-detail-title">
      <PageHeader
        eyebrow={`Procurement / ${record.reference_number}`}
        title={record.title}
        description={record.program_name ?? "Pengadaan umum organisasi"}
        meta={
          <StatusBadge tone={statusTone(record.status)}>
            {record.status.replaceAll("_", " ")}
          </StatusBadge>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => list("procurement")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            {record.status === "draft" ? (
              <ProtectedActionButton
                action="submit"
                resource="procurement_requests"
                disabled={command.mutation.isPending}
                onClick={() => mutate(`/api/v1/procurement/${record.id}/submit`)}
              >
                <Send aria-hidden="true" size={16} />
                Submit
              </ProtectedActionButton>
            ) : null}
          </>
        }
      />

      {command.mutation.isError ? (
        <ErrorState
          title="Command pengadaan ditolak"
          description={command.mutation.error?.message ?? "Periksa izin dan status workflow."}
        />
      ) : null}

      <DetailSection
        title="Ringkasan Permintaan"
        items={[
          { label: "Vendor", value: record.vendor_name ?? "Belum dipilih" },
          {
            label: "Nilai quote",
            value: record.quote_amount ? (
              <MoneyDisplay amount={record.quote_amount} currency={currency} />
            ) : (
              "Belum ada"
            ),
          },
          { label: "PO", value: purchaseOrder?.reference_number ?? "Belum dibuat" },
          {
            label: "Target kebutuhan",
            value: record.expected_at
              ? new Date(record.expected_at).toLocaleString("id-ID")
              : "Tidak ditentukan",
          },
        ]}
      >
        <p className="mt-5 text-sm">{record.purpose}</p>
      </DetailSection>

      <DetailSection title="Item Pengadaan">
        <ResourceTable
          columns={itemColumns}
          items={items}
          getRowId={(item) => `${item.name}-${item.unit}`}
          empty={<EmptyState title="Belum ada item" description="Permintaan ini belum memiliki item." />}
        />
      </DetailSection>

      {record.status === "submitted" ? (
        <CanAccess action="approve" resource="procurement_requests">
          <form
            className="form-section"
            onSubmit={submit(() =>
              mutate(`/api/v1/procurement/${record.id}/approve`, {
                notes: approvalNotes,
              }),
            )}
          >
            <div className="section-heading">
              <div>
                <h2>Approval Permintaan</h2>
                <p>Persetujuan ini membuka pembuatan purchase order.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="auth-field">
                <Label htmlFor="approval_notes">Catatan approval</Label>
                <textarea
                  id="approval_notes"
                  required
                  minLength={10}
                  rows={3}
                  value={approvalNotes}
                  onChange={(event) => setApprovalNotes(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                <Check aria-hidden="true" size={16} />
                Approve
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {record.status === "approved" && !purchaseOrder ? (
        <CanAccess action="manage" resource="purchase_orders">
          <form
            className="form-section"
            onSubmit={submit(() =>
              mutate(`/api/v1/procurement/${record.id}/purchase-orders`, {
                amount: poAmount,
                currency: record.currency,
                payment_terms: paymentTerms || undefined,
                vendor_contact_id: vendorContactId,
              }),
            )}
          >
            <div className="section-heading">
              <div>
                <h2>Buat Purchase Order</h2>
                <p>Vendor harus berupa contact institution aktif pada organisasi ini.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="vendor_contact_id">Vendor contact ID</Label>
                <input
                  id="vendor_contact_id"
                  required
                  value={vendorContactId}
                  onChange={(event) => setVendorContactId(event.target.value)}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="po_amount">Nilai PO</Label>
                <input
                  id="po_amount"
                  required
                  inputMode="decimal"
                  value={poAmount}
                  onChange={(event) => setPoAmount(event.target.value)}
                />
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="payment_terms">Termin pembayaran</Label>
                <textarea
                  id="payment_terms"
                  rows={2}
                  value={paymentTerms}
                  onChange={(event) => setPaymentTerms(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                Buat PO
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {purchaseOrder ? (
        <DetailSection
          title="Purchase Order"
          items={[
            { label: "Nomor", value: purchaseOrder.reference_number },
            { label: "Status", value: purchaseOrder.status.replaceAll("_", " ") },
            {
              label: "Nilai",
              value: <MoneyDisplay amount={purchaseOrder.amount} currency={purchaseOrder.currency} />,
            },
            {
              label: "Terbit",
              value: purchaseOrder.issued_at
                ? new Date(purchaseOrder.issued_at).toLocaleString("id-ID")
                : "Belum diterbitkan",
            },
          ]}
        >
          <div className="mt-5 flex flex-wrap gap-2">
            {purchaseOrder.status === "draft" ? (
              <ProtectedActionButton
                action="issue"
                resource="purchase_orders"
                disabled={command.mutation.isPending}
                onClick={() =>
                  mutate(
                    `/api/v1/procurement/purchase-orders/${purchaseOrder.id}/issue`,
                    {},
                    true,
                  )
                }
              >
                <FileCheck2 aria-hidden="true" size={16} />
                Terbitkan PO
              </ProtectedActionButton>
            ) : null}
          </div>
        </DetailSection>
      ) : null}

      {purchaseOrder && ["issued", "partially_received"].includes(purchaseOrder.status) ? (
        <CanAccess action="receive" resource="goods_receipts">
          <form
            className="form-section"
            onSubmit={submit(() =>
              mutate(
                `/api/v1/procurement/purchase-orders/${purchaseOrder.id}/receive`,
                {
                  condition_summary: receiptCondition,
                  items_received: items,
                  receipt_number: receiptNumber,
                  received_at: nowLocalIso(),
                  received_status: receivedStatus,
                },
                true,
              ),
            )}
          >
            <div className="section-heading">
              <div>
                <h2>Terima Barang</h2>
                <p>Penerimaan ini append-only dan belum membuat stok inventory.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="receipt_number">Nomor penerimaan</Label>
                <input
                  id="receipt_number"
                  required
                  value={receiptNumber}
                  onChange={(event) => setReceiptNumber(event.target.value)}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="received_status">Status penerimaan</Label>
                <select
                  id="received_status"
                  value={receivedStatus}
                  onChange={(event) =>
                    setReceivedStatus(event.target.value as "partially_received" | "received")
                  }
                >
                  <option value="received">Lengkap</option>
                  <option value="partially_received">Sebagian</option>
                </select>
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="receipt_condition">Kondisi barang</Label>
                <textarea
                  id="receipt_condition"
                  required
                  minLength={10}
                  rows={3}
                  value={receiptCondition}
                  onChange={(event) => setReceiptCondition(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                <PackageCheck aria-hidden="true" size={16} />
                Catat Penerimaan
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {purchaseOrder && ["issued", "partially_received", "received"].includes(purchaseOrder.status) ? (
        <CanAccess action="manage" resource="vendor_invoices">
          <form
            className="form-section"
            onSubmit={submit(() =>
              mutate(`/api/v1/procurement/purchase-orders/${purchaseOrder.id}/invoices`, {
                amount: invoiceAmount,
                currency: purchaseOrder.currency,
                invoice_date: nowLocalIso(),
                invoice_number: invoiceNumber,
                payment_reference: paymentReference || undefined,
              }),
            )}
          >
            <div className="section-heading">
              <div>
                <h2>Catat Invoice Vendor</h2>
                <p>Referensi pembayaran dicatat tanpa mengubah ledger dana.</p>
              </div>
            </div>
            <div className="form-section__body form-grid">
              <div className="auth-field">
                <Label htmlFor="invoice_number">Nomor invoice</Label>
                <input
                  id="invoice_number"
                  required
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="invoice_amount">Nilai invoice</Label>
                <input
                  id="invoice_amount"
                  required
                  inputMode="decimal"
                  value={invoiceAmount}
                  onChange={(event) => setInvoiceAmount(event.target.value)}
                />
              </div>
              <div className="auth-field">
                <Label htmlFor="payment_reference">Referensi pembayaran</Label>
                <input
                  id="payment_reference"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                Simpan Invoice
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      {["draft", "submitted", "approved", "ordered"].includes(record.status) ? (
        <CanAccess action="cancel" resource="procurement_requests">
          <form
            className="form-section"
            onSubmit={submit(() =>
              mutate(`/api/v1/procurement/${record.id}/cancel`, {
                reason: cancelReason,
              }),
            )}
          >
            <div className="section-heading">
              <div>
                <h2>Batalkan Pengadaan</h2>
                <p>Pembatalan tidak menghapus riwayat atau bukti.</p>
              </div>
            </div>
            <div className="form-section__body">
              <div className="auth-field">
                <Label htmlFor="cancel_reason">Alasan pembatalan</Label>
                <textarea
                  id="cancel_reason"
                  required
                  minLength={10}
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </div>
            </div>
            <div className="form-section__footer">
              <Button type="submit" disabled={command.mutation.isPending}>
                Batalkan
              </Button>
            </div>
          </form>
        </CanAccess>
      ) : null}

      <DetailSection title="Penerimaan Barang">
        <ResourceTable
          columns={receiptColumns}
          items={record.goods_receipts ?? []}
          getRowId={(item) => item.id}
          empty={<EmptyState title="Belum ada penerimaan" description="Goods receipt dicatat setelah PO diterbitkan." />}
        />
      </DetailSection>

      <DetailSection title="Invoice Vendor">
        <ResourceTable
          columns={invoiceColumns}
          items={record.vendor_invoices ?? []}
          getRowId={(item) => item.id}
          empty={<EmptyState title="Belum ada invoice" description="Invoice dicatat setelah PO diterbitkan." />}
        />
      </DetailSection>

      <DetailSection title="Jejak Pengadaan">
        <ApprovalTimeline items={timeline(record.events)} />
      </DetailSection>
    </section>
  );
}
