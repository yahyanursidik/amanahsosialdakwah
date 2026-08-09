import { createHash, randomUUID } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import {
  assertProcurementItems,
  assertProcurementRequestTransition,
  assertPurchaseOrderTransition,
  type ProcurementRequestStatus,
  type PurchaseOrderStatus,
} from "../domain/procurement-rules";
import { DomainError } from "../domain/errors";
import type {
  ApproveProcurementRequestInput,
  CancelProcurementInput,
  CreateProcurementRequestInput,
  CreatePurchaseOrderInput,
  ProcurementListQuery,
  ReceiveGoodsInput,
  RecordVendorInvoiceInput,
} from "../routes/procurement-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function requestReference(): string {
  return `PRC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function poReference(): string {
  return `PO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function notFound(message = "Pengadaan tidak ditemukan."): never {
  throw new DomainError("NOT_FOUND", message, 404);
}

function hashRequest(command: string, input: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify({ command, input }))
    .digest("hex");
}

async function runIdempotent<T extends Row>(
  context: RequestContext,
  key: string,
  command: string,
  input: unknown,
  operation: (database: TenantDatabase, client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTenantTransaction(context, async (database, client) => {
    const requestHash = hashRequest(command, input);
    const inserted = await client.query<Row>(
      `
        insert into public.procurement_idempotency_records (
          organization_id, idempotency_key, command_type,
          request_hash, status, created_by
        ) values ($1, $2, $3, $4, 'processing', $5)
        on conflict (organization_id, idempotency_key) do nothing
        returning *
      `,
      [context.organizationId, key, command, requestHash, context.profileId],
    );
    if (!inserted.rows[0]) {
      const existing = await client.query<{
        command_type: string;
        request_hash: string;
        response_snapshot: T | null;
        status: string;
      }>(
        `
          select command_type, request_hash, response_snapshot, status
          from public.procurement_idempotency_records
          where organization_id = $1 and idempotency_key = $2
          for update
        `,
        [context.organizationId, key],
      );
      const record = existing.rows[0];
      if (
        !record ||
        record.command_type !== command ||
        record.request_hash !== requestHash
      ) {
        throw new DomainError(
          "CONFLICT",
          "Idempotency-Key telah digunakan untuk command berbeda.",
          409,
        );
      }
      if (record.status === "completed" && record.response_snapshot) {
        return record.response_snapshot;
      }
      throw new DomainError(
        "CONFLICT",
        "Command dengan Idempotency-Key ini masih diproses.",
        409,
      );
    }

    const result = await operation(database, client);
    await client.query(
      `
        update public.procurement_idempotency_records
        set status = 'completed', response_snapshot = $1, completed_at = now()
        where organization_id = $2 and idempotency_key = $3
      `,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

async function lockRequest(
  client: PoolClient,
  context: RequestContext,
  requestId: string,
): Promise<Row> {
  const result = await client.query<Row>(
    `
      select * from public.procurement_requests
      where id = $1 and organization_id = $2
      for update
    `,
    [requestId, context.organizationId],
  );
  return result.rows[0] ?? notFound("Permintaan pengadaan tidak ditemukan.");
}

async function lockPurchaseOrder(
  client: PoolClient,
  context: RequestContext,
  purchaseOrderId: string,
): Promise<Row> {
  const result = await client.query<Row>(
    `
      select * from public.purchase_orders
      where id = $1 and organization_id = $2
      for update
    `,
    [purchaseOrderId, context.organizationId],
  );
  return result.rows[0] ?? notFound("Purchase order tidak ditemukan.");
}

async function insertEvent(
  client: PoolClient,
  context: RequestContext,
  values: {
    entityId: string;
    entityType: string;
    eventType: string;
    fromStatus?: string | null;
    notes?: string | null;
    toStatus: string;
  },
) {
  await client.query(
    `
      insert into public.procurement_events (
        organization_id, entity_type, entity_id, event_type,
        from_status, to_status, actor_profile_id, notes, request_id
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      context.organizationId,
      values.entityType,
      values.entityId,
      values.eventType,
      values.fromStatus ?? null,
      values.toStatus,
      context.profileId,
      values.notes ?? null,
      context.requestId,
    ],
  );
}

function transitionRequest(
  current: unknown,
  target: ProcurementRequestStatus,
) {
  try {
    assertProcurementRequestTransition(
      current as ProcurementRequestStatus,
      target,
    );
  } catch (error) {
    throw new DomainError(
      "INVALID_STATE",
      error instanceof Error ? error.message : "Transisi pengadaan tidak valid.",
      409,
    );
  }
}

function transitionPurchaseOrder(current: unknown, target: PurchaseOrderStatus) {
  try {
    assertPurchaseOrderTransition(current as PurchaseOrderStatus, target);
  } catch (error) {
    throw new DomainError(
      "INVALID_STATE",
      error instanceof Error ? error.message : "Transisi PO tidak valid.",
      409,
    );
  }
}

export async function listProcurementRequests(
  context: RequestContext,
  query: ProcurementListQuery,
) {
  requirePermission(context, "procurement_requests.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["request.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`request.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(request.reference_number ilike $${values.length}
          or request.title ilike $${values.length}
          or vendor.display_name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `
        select count(*)::int as total
        from public.procurement_requests request
        left join public.crm_contacts vendor
          on vendor.id = request.vendor_contact_id
         and vendor.organization_id = request.organization_id
        where ${where}
      `,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select request.*, program.name as program_name,
          vendor.display_name as vendor_name,
          purchase_order.reference_number as purchase_order_reference,
          purchase_order.status as purchase_order_status,
          purchase_order.id as purchase_order_id
        from public.procurement_requests request
        left join public.programs program
          on program.id = request.program_id
         and program.organization_id = request.organization_id
        left join public.crm_contacts vendor
          on vendor.id = request.vendor_contact_id
         and vendor.organization_id = request.organization_id
        left join public.purchase_orders purchase_order
          on purchase_order.procurement_request_id = request.id
         and purchase_order.organization_id = request.organization_id
        where ${where}
        order by request.updated_at desc
        limit $${values.length - 1} offset $${values.length}
      `,
      values,
    );
    return {
      data: result.rows,
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    };
  });
}

export async function getProcurementRequest(
  context: RequestContext,
  requestId: string,
) {
  requirePermission(context, "procurement_requests.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `
        select request.*, program.name as program_name,
          vendor.display_name as vendor_name,
          coalesce((
            select jsonb_agg(to_jsonb(po) order by po.created_at)
            from public.purchase_orders po
            where po.procurement_request_id = request.id
              and po.organization_id = request.organization_id
          ), '[]'::jsonb) as purchase_orders,
          coalesce((
            select jsonb_agg(to_jsonb(receipt) || jsonb_build_object('receiver_name', receiver.display_name) order by receipt.received_at)
            from public.goods_receipts receipt
            join public.profiles receiver on receiver.id = receipt.received_by
            join public.purchase_orders po
              on po.id = receipt.purchase_order_id
             and po.organization_id = receipt.organization_id
            where po.procurement_request_id = request.id
              and receipt.organization_id = request.organization_id
          ), '[]'::jsonb) as goods_receipts,
          coalesce((
            select jsonb_agg(to_jsonb(invoice) order by invoice.created_at)
            from public.vendor_invoices invoice
            join public.purchase_orders po
              on po.id = invoice.purchase_order_id
             and po.organization_id = invoice.organization_id
            where po.procurement_request_id = request.id
              and invoice.organization_id = request.organization_id
          ), '[]'::jsonb) as vendor_invoices,
          coalesce((
            select jsonb_agg(to_jsonb(event) || jsonb_build_object('actor_name', actor.display_name) order by event.occurred_at)
            from public.procurement_events event
            join public.profiles actor on actor.id = event.actor_profile_id
            where event.organization_id = request.organization_id
              and event.entity_id in (
                request.id,
                coalesce((select po.id from public.purchase_orders po where po.procurement_request_id = request.id and po.organization_id = request.organization_id limit 1), request.id)
              )
          ), '[]'::jsonb) as events
        from public.procurement_requests request
        left join public.programs program
          on program.id = request.program_id and program.organization_id = request.organization_id
        left join public.crm_contacts vendor
          on vendor.id = request.vendor_contact_id and vendor.organization_id = request.organization_id
        where request.id = $1 and request.organization_id = $2
      `,
      [requestId, context.organizationId],
    );
    return result.rows[0] ?? notFound("Permintaan pengadaan tidak ditemukan.");
  });
}

export async function createProcurementRequest(
  context: RequestContext,
  input: CreateProcurementRequestInput,
) {
  requirePermission(context, "procurement_requests.manage");
  try {
    assertProcurementItems(input.items);
  } catch (error) {
    throw new DomainError(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "Item pengadaan tidak valid.",
      400,
    );
  }
  return withTenantTransaction(context, async (database, client) => {
    if (input.program_id) {
      const program = await client.query(
        "select 1 from public.programs where id = $1 and organization_id = $2",
        [input.program_id, context.organizationId],
      );
      if (!program.rows[0]) {
        throw new DomainError("NOT_FOUND", "Program tidak ditemukan.", 404);
      }
    }
    const result = await client.query<Row>(
      `
        insert into public.procurement_requests (
          organization_id, reference_number, program_id, title, purpose,
          items, currency, expected_at, created_by, updated_by
        ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $9)
        returning *
      `,
      [
        context.organizationId,
        requestReference(),
        input.program_id ?? null,
        input.title,
        input.purpose,
        JSON.stringify(input.items),
        input.currency,
        input.expected_at ?? null,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertEvent(client, context, {
      entityId: record.id,
      entityType: "procurement_request",
      eventType: "created",
      toStatus: "draft",
    });
    await insertAuditEvent(database, context, {
      action: "procurement.request_created",
      after: record,
      entityId: record.id,
      entityType: "procurement_request",
    });
    return record;
  });
}

async function changeRequestStatus(
  context: RequestContext,
  requestId: string,
  target: ProcurementRequestStatus,
  permission: string,
  eventType: string,
  notes?: string,
) {
  requirePermission(context, permission);
  return withTenantTransaction(context, async (database, client) => {
    const request = await lockRequest(client, context, requestId);
    transitionRequest(request.status, target);
    const result = await client.query<Row>(
      `
        update public.procurement_requests
        set status = $1, updated_by = $2, updated_at = now()
        where id = $3 and organization_id = $4 returning *
      `,
      [target, context.profileId, requestId, context.organizationId],
    );
    const record = result.rows[0]!;
    await insertEvent(client, context, {
      entityId: record.id,
      entityType: "procurement_request",
      eventType,
      fromStatus: String(request.status),
      notes: notes ?? null,
      toStatus: target,
    });
    await insertAuditEvent(database, context, {
      action: `procurement.${eventType}`,
      after: record,
      before: request,
      entityId: record.id,
      entityType: "procurement_request",
    });
    return record;
  });
}

export async function submitProcurementRequest(
  context: RequestContext,
  requestId: string,
  notes?: string,
) {
  return changeRequestStatus(
    context,
    requestId,
    "submitted",
    "procurement_requests.submit",
    "submitted",
    notes,
  );
}

export async function approveProcurementRequest(
  context: RequestContext,
  requestId: string,
  input: ApproveProcurementRequestInput,
) {
  return changeRequestStatus(
    context,
    requestId,
    "approved",
    "procurement_requests.approve",
    "approved",
    input.notes,
  );
}

export async function cancelProcurementRequest(
  context: RequestContext,
  requestId: string,
  input: CancelProcurementInput,
) {
  return changeRequestStatus(
    context,
    requestId,
    "cancelled",
    "procurement_requests.cancel",
    "cancelled",
    input.reason,
  );
}

export async function createPurchaseOrder(
  context: RequestContext,
  requestId: string,
  input: CreatePurchaseOrderInput,
) {
  requirePermission(context, "purchase_orders.manage");
  return withTenantTransaction(context, async (database, client) => {
    const request = await lockRequest(client, context, requestId);
    if (request.status !== "approved") {
      throw new DomainError(
        "INVALID_STATE",
        "PO hanya dapat dibuat dari permintaan pengadaan yang approved.",
        409,
      );
    }
    const existing = await client.query(
      `
        select 1 from public.purchase_orders
        where procurement_request_id = $1 and organization_id = $2
      `,
      [requestId, context.organizationId],
    );
    if (existing.rows[0]) {
      throw new DomainError(
        "CONFLICT",
        "Permintaan ini sudah memiliki purchase order.",
        409,
      );
    }
    const vendor = await client.query(
      `
        select 1 from public.crm_contacts
        where id = $1 and organization_id = $2
          and contact_type = 'institution' and status = 'active'
      `,
      [input.vendor_contact_id, context.organizationId],
    );
    if (!vendor.rows[0]) {
      throw new DomainError(
        "NOT_FOUND",
        "Vendor aktif tidak ditemukan pada organisasi ini.",
        404,
      );
    }
    const result = await client.query<Row>(
      `
        insert into public.purchase_orders (
          organization_id, procurement_request_id, reference_number,
          vendor_contact_id, amount, currency, expected_delivery_at,
          payment_terms, created_by, updated_by
        ) values ($1, $2, $3, $4, $5::numeric, $6, $7, $8, $9, $9)
        returning *
      `,
      [
        context.organizationId,
        requestId,
        poReference(),
        input.vendor_contact_id,
        input.amount,
        input.currency,
        input.expected_delivery_at ?? null,
        input.payment_terms ?? null,
        context.profileId,
      ],
    );
    const po = result.rows[0]!;
    await client.query(
      `
        update public.procurement_requests
        set vendor_contact_id = $1, quote_amount = $2::numeric,
          quote_currency = $3, updated_by = $4, updated_at = now()
        where id = $5 and organization_id = $6
      `,
      [
        input.vendor_contact_id,
        input.amount,
        input.currency,
        context.profileId,
        requestId,
        context.organizationId,
      ],
    );
    await insertEvent(client, context, {
      entityId: po.id,
      entityType: "purchase_order",
      eventType: "po_created",
      toStatus: "draft",
    });
    await insertAuditEvent(database, context, {
      action: "procurement.po_created",
      after: po,
      entityId: po.id,
      entityType: "purchase_order",
    });
    return po;
  });
}

export async function issuePurchaseOrder(
  context: RequestContext,
  purchaseOrderId: string,
  notes: string | undefined,
  key: string,
) {
  requirePermission(context, "purchase_orders.issue");
  return runIdempotent(
    context,
    key,
    "purchase_order_issued",
    { notes, purchaseOrderId },
    async (database, client) => {
      const po = await lockPurchaseOrder(client, context, purchaseOrderId);
      transitionPurchaseOrder(po.status, "issued");
      const result = await client.query<Row>(
        `
          update public.purchase_orders
          set status = 'issued', issued_at = now(), issued_by = $1,
            updated_by = $1, updated_at = now()
          where id = $2 and organization_id = $3 returning *
        `,
        [context.profileId, purchaseOrderId, context.organizationId],
      );
      const record = result.rows[0]!;
      await client.query(
        `
          update public.procurement_requests
          set status = 'ordered', updated_by = $1, updated_at = now()
          where id = $2 and organization_id = $3
        `,
        [context.profileId, po.procurement_request_id, context.organizationId],
      );
      await insertEvent(client, context, {
        entityId: record.id,
        entityType: "purchase_order",
        eventType: "issued",
        fromStatus: String(po.status),
        notes: notes ?? null,
        toStatus: "issued",
      });
      await insertAuditEvent(database, context, {
        action: "procurement.po_issued",
        after: record,
        before: po,
        entityId: record.id,
        entityType: "purchase_order",
      });
      return record;
    },
  );
}

export async function receiveGoods(
  context: RequestContext,
  purchaseOrderId: string,
  input: ReceiveGoodsInput,
  key: string,
) {
  requirePermission(context, "goods_receipts.receive");
  return runIdempotent(
    context,
    key,
    "goods_received",
    { input, purchaseOrderId },
    async (database, client) => {
      const po = await lockPurchaseOrder(client, context, purchaseOrderId);
      transitionPurchaseOrder(po.status, input.received_status);
      const receipt = await client.query<Row>(
        `
          insert into public.goods_receipts (
            organization_id, purchase_order_id, receipt_number,
            received_status, items_received, condition_summary,
            received_at, received_by
          ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
          returning *
        `,
        [
          context.organizationId,
          purchaseOrderId,
          input.receipt_number,
          input.received_status,
          JSON.stringify(input.items_received),
          input.condition_summary,
          input.received_at,
          context.profileId,
        ],
      );
      await client.query(
        `
          update public.purchase_orders
          set status = $1, updated_by = $2, updated_at = now()
          where id = $3 and organization_id = $4
        `,
        [
          input.received_status,
          context.profileId,
          purchaseOrderId,
          context.organizationId,
        ],
      );
      if (input.received_status === "received") {
        await client.query(
          `
            update public.procurement_requests
            set status = 'goods_received', updated_by = $1, updated_at = now()
            where id = $2 and organization_id = $3
          `,
          [context.profileId, po.procurement_request_id, context.organizationId],
        );
      }
      const record = receipt.rows[0]!;
      await insertEvent(client, context, {
        entityId: purchaseOrderId,
        entityType: "purchase_order",
        eventType: "goods_received",
        fromStatus: String(po.status),
        notes: input.condition_summary,
        toStatus: input.received_status,
      });
      await insertAuditEvent(database, context, {
        action: "procurement.goods_received",
        after: record,
        before: po,
        entityId: record.id,
        entityType: "goods_receipt",
      });
      return record;
    },
  );
}

export async function recordVendorInvoice(
  context: RequestContext,
  purchaseOrderId: string,
  input: RecordVendorInvoiceInput,
) {
  requirePermission(context, "vendor_invoices.manage");
  return withTenantTransaction(context, async (database, client) => {
    const po = await lockPurchaseOrder(client, context, purchaseOrderId);
    if (!["issued", "partially_received", "received"].includes(String(po.status))) {
      throw new DomainError(
        "INVALID_STATE",
        "Invoice hanya dapat dicatat setelah PO diterbitkan.",
        409,
      );
    }
    const invoice = await client.query<Row>(
      `
        insert into public.vendor_invoices (
          organization_id, purchase_order_id, invoice_number, invoice_date,
          amount, currency, payment_reference, created_by
        ) values ($1, $2, $3, $4, $5::numeric, $6, $7, $8)
        returning *
      `,
      [
        context.organizationId,
        purchaseOrderId,
        input.invoice_number,
        input.invoice_date,
        input.amount,
        input.currency,
        input.payment_reference ?? null,
        context.profileId,
      ],
    );
    const record = invoice.rows[0]!;
    await insertEvent(client, context, {
      entityId: purchaseOrderId,
      entityType: "purchase_order",
      eventType: "invoice_recorded",
      fromStatus: String(po.status),
      notes: input.invoice_number,
      toStatus: String(po.status),
    });
    await insertAuditEvent(database, context, {
      action: "procurement.invoice_recorded",
      after: record,
      entityId: record.id,
      entityType: "vendor_invoice",
    });
    return record;
  });
}

export async function cancelPurchaseOrder(
  context: RequestContext,
  purchaseOrderId: string,
  input: CancelProcurementInput,
) {
  requirePermission(context, "purchase_orders.cancel");
  return withTenantTransaction(context, async (database, client) => {
    const po = await lockPurchaseOrder(client, context, purchaseOrderId);
    transitionPurchaseOrder(po.status, "cancelled");
    const result = await client.query<Row>(
      `
        update public.purchase_orders
        set status = 'cancelled', cancelled_reason = $1,
          updated_by = $2, updated_at = now()
        where id = $3 and organization_id = $4 returning *
      `,
      [input.reason, context.profileId, purchaseOrderId, context.organizationId],
    );
    const record = result.rows[0]!;
    await insertEvent(client, context, {
      entityId: record.id,
      entityType: "purchase_order",
      eventType: "po_cancelled",
      fromStatus: String(po.status),
      notes: input.reason,
      toStatus: "cancelled",
    });
    await insertAuditEvent(database, context, {
      action: "procurement.po_cancelled",
      after: record,
      before: po,
      entityId: record.id,
      entityType: "purchase_order",
    });
    return record;
  });
}
