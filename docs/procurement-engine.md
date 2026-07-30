# Procurement Engine

## Scope fase 13

Fase ini menyediakan vertical slice pengadaan:

- permintaan pengadaan berbasis kebutuhan program atau organisasi;
- vendor dari CRM contact bertipe institution;
- purchase order;
- goods receipt append-only;
- invoice vendor dan referensi pembayaran;
- event pengadaan dan audit;
- idempotency untuk issue PO dan goods receipt.

Inventory stock movement penuh belum dibuat pada fase ini. Penerimaan barang
baru menjadi fakta procurement; stock balance, batch, expiry, FEFO, reservation,
dan adjustment masuk fase Inventory.

## Alur status

Permintaan pengadaan:

```text
draft -> submitted -> approved -> ordered -> goods_received
```

Jalur pembatalan tersedia dari `draft`, `submitted`, `approved`, dan `ordered`.

Purchase order:

```text
draft -> issued -> partially_received -> received
```

PO dapat dibatalkan selama belum final. Request dan PO final tidak dapat
diubah; koreksi dilakukan dengan pembatalan tercatat dan pembuatan record baru.

## Permission

- `procurement_requests.read`
- `procurement_requests.manage`
- `procurement_requests.submit`
- `procurement_requests.approve`
- `procurement_requests.cancel`
- `purchase_orders.read`
- `purchase_orders.manage`
- `purchase_orders.issue`
- `purchase_orders.cancel`
- `goods_receipts.read`
- `goods_receipts.receive`
- `vendor_invoices.read`
- `vendor_invoices.manage`

Owner dan admin memperoleh seluruh permission procurement. Field officer dan
auditor memperoleh read-only; field officer juga dapat mencatat goods receipt.

## Keamanan dan tenant

Semua tabel memakai `organization_id`, UUID, `created_at`, `updated_at` bila
relevan, RLS eksplisit untuk SELECT/INSERT/UPDATE/DELETE, dan grant terbatas ke
`app_runtime`. Foreign key komposit `(id, organization_id)` mencegah relasi
lintas organisasi antara request, vendor, PO, receipt, dan invoice.

Goods receipt, invoice, dan procurement event bersifat append-only. Browser
tidak menerima credential database dan semua command tetap divalidasi ulang di
API server-side.

## Batas fase

- belum ada quotation table terpisah;
- belum ada inventory stock movement;
- belum ada approval workflow generik untuk procurement approval;
- belum ada file evidence untuk nota atau invoice sampai Evidence Service aktif.
