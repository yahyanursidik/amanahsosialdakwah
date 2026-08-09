import { createHash, randomUUID } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import {
  assertBatchRequirement,
  assertInventoryAdjustmentTransition,
  assertNoNegativeInventoryBalance,
  assertNonZeroAdjustmentDelta,
  assertPositiveInventoryQuantity,
  type InventoryAdjustmentStatus,
} from "../domain/inventory-rules";
import { DomainError } from "../domain/errors";
import type {
  CreateInventoryAdjustmentInput,
  CreateInventoryProductInput,
  CreateInventoryWarehouseInput,
  InventoryDecisionInput,
  InventoryListQuery,
  PostGoodsReceiptInventoryInput,
} from "../routes/inventory-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function adjustmentReference(): string {
  return `INV-ADJ-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function notFound(message = "Data inventory tidak ditemukan."): never {
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
        insert into public.inventory_idempotency_records (
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
          from public.inventory_idempotency_records
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
        update public.inventory_idempotency_records
        set status = 'completed', response_snapshot = $1, completed_at = now()
        where organization_id = $2 and idempotency_key = $3
      `,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

function transitionAdjustment(
  current: unknown,
  target: InventoryAdjustmentStatus,
) {
  try {
    assertInventoryAdjustmentTransition(
      current as InventoryAdjustmentStatus,
      target,
    );
  } catch (error) {
    throw new DomainError(
      "INVALID_STATE",
      error instanceof Error
        ? error.message
        : "Transisi adjustment inventory tidak valid.",
      409,
    );
  }
}

async function loadProduct(
  client: PoolClient,
  context: RequestContext,
  productId: string,
) {
  const result = await client.query<Row>(
    `
      select * from public.inventory_products
      where id = $1 and organization_id = $2 and status = 'active'
    `,
    [productId, context.organizationId],
  );
  return result.rows[0] ?? notFound("Produk inventory aktif tidak ditemukan.");
}

async function assertWarehouse(
  client: PoolClient,
  context: RequestContext,
  warehouseId: string,
) {
  const result = await client.query<Row>(
    `
      select * from public.inventory_warehouses
      where id = $1 and organization_id = $2 and status = 'active'
    `,
    [warehouseId, context.organizationId],
  );
  if (!result.rows[0]) {
    notFound("Gudang aktif tidak ditemukan.");
  }
}

async function resolveBatch(
  client: PoolClient,
  context: RequestContext,
  input: {
    batchNumber: string | null | undefined;
    expiresAt: string | null | undefined;
    product: Row;
    productId: string;
  },
) {
  assertBatchRequirement({
    batchNumber: input.batchNumber,
    expiresAt: input.expiresAt,
    productTracksBatch: Boolean(input.product.track_batch),
    productTracksExpiry: Boolean(input.product.track_expiry),
  });

  if (!input.batchNumber) {
    return null;
  }

  const inserted = await client.query<Row>(
    `
      insert into public.inventory_batches (
        organization_id, product_id, batch_number, expires_at, created_by
      ) values ($1, $2, $3, $4, $5)
      on conflict (organization_id, product_id, batch_number) do update
        set expires_at = coalesce(public.inventory_batches.expires_at, excluded.expires_at),
            updated_at = now()
      returning *
    `,
    [
      context.organizationId,
      input.productId,
      input.batchNumber,
      input.expiresAt ?? null,
      context.profileId,
    ],
  );
  return inserted.rows[0]?.id ?? null;
}

async function applyMovement(
  client: PoolClient,
  context: RequestContext,
  input: {
    batchNumber: string | null | undefined;
    expiresAt: string | null | undefined;
    movementType: string;
    notes: string | null | undefined;
    occurredAt: string;
    productId: string;
    quantity: string;
    sourceId: string;
    sourceType: string;
    unit: string;
    warehouseId: string;
  },
) {
  assertPositiveInventoryQuantity(input.quantity);
  const product = await loadProduct(client, context, input.productId);
  await assertWarehouse(client, context, input.warehouseId);
  if (product.base_unit !== input.unit) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Satuan movement harus sama dengan satuan dasar produk.",
      400,
    );
  }
  const batchId = await resolveBatch(client, context, {
    batchNumber: input.batchNumber,
    expiresAt: input.expiresAt,
    product,
    productId: input.productId,
  });
  const direction = input.movementType.endsWith("_out") ? "out" : "in";

  await client.query(
    `
      insert into public.inventory_balances (
        organization_id, product_id, warehouse_id, batch_id,
        quantity_on_hand, quantity_reserved
      ) values ($1, $2, $3, $4, 0, 0)
      on conflict on constraint inventory_balances_unique do nothing
    `,
    [context.organizationId, input.productId, input.warehouseId, batchId],
  );
  const balance = await client.query<{ quantity_on_hand: string }>(
    `
      select quantity_on_hand
      from public.inventory_balances
      where organization_id = $1 and product_id = $2 and warehouse_id = $3
        and batch_id is not distinct from $4::uuid
      for update
    `,
    [context.organizationId, input.productId, input.warehouseId, batchId],
  );
  const next = await client.query<{ value: string }>(
    "select ($1::numeric + case when $2 = 'in' then $3::numeric else -$3::numeric end)::text as value",
    [balance.rows[0]?.quantity_on_hand ?? "0", direction, input.quantity],
  );
  try {
    assertNoNegativeInventoryBalance(next.rows[0]?.value ?? "0");
  } catch (error) {
    throw new DomainError(
      "INSUFFICIENT_FUNDS",
      error instanceof Error ? error.message : "Stok tidak cukup.",
      409,
    );
  }
  await client.query(
    `
      update public.inventory_balances
      set quantity_on_hand = $1::numeric, updated_at = now()
      where organization_id = $2 and product_id = $3 and warehouse_id = $4
        and batch_id is not distinct from $5::uuid
    `,
    [
      next.rows[0]?.value ?? "0",
      context.organizationId,
      input.productId,
      input.warehouseId,
      batchId,
    ],
  );
  const movement = await client.query<Row>(
    `
      insert into public.inventory_movements (
        organization_id, product_id, warehouse_id, batch_id, movement_type,
        direction, quantity, unit, source_type, source_id, occurred_at,
        notes, request_id, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7::numeric, $8, $9, $10, $11, $12, $13, $14)
      returning *
    `,
    [
      context.organizationId,
      input.productId,
      input.warehouseId,
      batchId,
      input.movementType,
      direction,
      input.quantity,
      input.unit,
      input.sourceType,
      input.sourceId,
      input.occurredAt,
      input.notes ?? null,
      context.requestId,
      context.profileId,
    ],
  );
  return movement.rows[0]!;
}

export async function listInventoryProducts(
  context: RequestContext,
  query: InventoryListQuery,
) {
  requirePermission(context, "inventory_products.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(`(sku ilike $${values.length} or name ilike $${values.length})`);
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.inventory_products where ${where}`,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select * from public.inventory_products
        where ${where}
        order by name asc
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

export async function createInventoryProduct(
  context: RequestContext,
  input: CreateInventoryProductInput,
) {
  requirePermission(context, "inventory_products.manage");
  return withTenantTransaction(context, async (database, client) => {
    const result = await client.query<Row>(
      `
        insert into public.inventory_products (
          organization_id, sku, name, category, base_unit,
          track_batch, track_expiry, created_by, updated_by
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        returning *
      `,
      [
        context.organizationId,
        input.sku.toUpperCase(),
        input.name,
        input.category ?? null,
        input.base_unit,
        input.track_batch,
        input.track_expiry,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "inventory.product_created",
      after: record,
      entityId: record.id,
      entityType: "inventory_product",
    });
    return record;
  });
}

export async function listInventoryWarehouses(
  context: RequestContext,
  query: InventoryListQuery,
) {
  requirePermission(context, "inventory_warehouses.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(`(code ilike $${values.length} or name ilike $${values.length})`);
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.inventory_warehouses where ${where}`,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select * from public.inventory_warehouses
        where ${where}
        order by code asc
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

export async function createInventoryWarehouse(
  context: RequestContext,
  input: CreateInventoryWarehouseInput,
) {
  requirePermission(context, "inventory_warehouses.manage");
  return withTenantTransaction(context, async (database, client) => {
    const result = await client.query<Row>(
      `
        insert into public.inventory_warehouses (
          organization_id, code, name, type, address_notes,
          created_by, updated_by
        ) values ($1, $2, $3, $4, $5, $6, $6)
        returning *
      `,
      [
        context.organizationId,
        input.code.toUpperCase(),
        input.name,
        input.type,
        input.address_notes ?? null,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "inventory.warehouse_created",
      after: record,
      entityId: record.id,
      entityType: "inventory_warehouse",
    });
    return record;
  });
}

export async function listInventoryBalances(
  context: RequestContext,
  query: InventoryListQuery,
) {
  requirePermission(context, "inventory_balances.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["balance.organization_id = $1"];
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(product.sku ilike $${values.length} or product.name ilike $${values.length} or warehouse.name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `
        select count(*)::int as total
        from public.inventory_balances balance
        join public.inventory_products product
          on product.id = balance.product_id and product.organization_id = balance.organization_id
        join public.inventory_warehouses warehouse
          on warehouse.id = balance.warehouse_id and warehouse.organization_id = balance.organization_id
        where ${where}
      `,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select balance.*, product.sku, product.name as product_name,
          product.base_unit, warehouse.code as warehouse_code,
          warehouse.name as warehouse_name, batch.batch_number, batch.expires_at
        from public.inventory_balances balance
        join public.inventory_products product
          on product.id = balance.product_id and product.organization_id = balance.organization_id
        join public.inventory_warehouses warehouse
          on warehouse.id = balance.warehouse_id and warehouse.organization_id = balance.organization_id
        left join public.inventory_batches batch
          on batch.id = balance.batch_id and batch.organization_id = balance.organization_id
        where ${where}
        order by product.name asc, warehouse.code asc, batch.expires_at asc nulls last
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

export async function listInventoryMovements(
  context: RequestContext,
  query: InventoryListQuery,
) {
  requirePermission(context, "inventory_movements.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["movement.organization_id = $1"];
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(product.sku ilike $${values.length} or product.name ilike $${values.length} or movement.source_type ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `
        select count(*)::int as total
        from public.inventory_movements movement
        join public.inventory_products product
          on product.id = movement.product_id and product.organization_id = movement.organization_id
        where ${where}
      `,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select movement.*, product.sku, product.name as product_name,
          warehouse.code as warehouse_code, warehouse.name as warehouse_name,
          batch.batch_number
        from public.inventory_movements movement
        join public.inventory_products product
          on product.id = movement.product_id and product.organization_id = movement.organization_id
        join public.inventory_warehouses warehouse
          on warehouse.id = movement.warehouse_id and warehouse.organization_id = movement.organization_id
        left join public.inventory_batches batch
          on batch.id = movement.batch_id and batch.organization_id = movement.organization_id
        where ${where}
        order by movement.occurred_at desc, movement.created_at desc
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

export async function listInventoryAdjustments(
  context: RequestContext,
  query: InventoryListQuery,
) {
  requirePermission(context, "inventory_adjustments.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["adjustment.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`adjustment.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(adjustment.reference_number ilike $${values.length} or product.name ilike $${values.length} or warehouse.name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `
        select count(*)::int as total
        from public.inventory_adjustment_requests adjustment
        join public.inventory_products product
          on product.id = adjustment.product_id and product.organization_id = adjustment.organization_id
        join public.inventory_warehouses warehouse
          on warehouse.id = adjustment.warehouse_id and warehouse.organization_id = adjustment.organization_id
        where ${where}
      `,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select adjustment.*, product.sku, product.name as product_name,
          product.base_unit, warehouse.code as warehouse_code,
          warehouse.name as warehouse_name
        from public.inventory_adjustment_requests adjustment
        join public.inventory_products product
          on product.id = adjustment.product_id and product.organization_id = adjustment.organization_id
        join public.inventory_warehouses warehouse
          on warehouse.id = adjustment.warehouse_id and warehouse.organization_id = adjustment.organization_id
        where ${where}
        order by adjustment.updated_at desc
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

export async function getInventoryAdjustment(
  context: RequestContext,
  adjustmentId: string,
) {
  requirePermission(context, "inventory_adjustments.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `
        select adjustment.*, product.sku, product.name as product_name,
          product.base_unit, warehouse.code as warehouse_code,
          warehouse.name as warehouse_name,
          creator.display_name as creator_name,
          approver.display_name as approver_name,
          poster.display_name as poster_name
        from public.inventory_adjustment_requests adjustment
        join public.inventory_products product
          on product.id = adjustment.product_id and product.organization_id = adjustment.organization_id
        join public.inventory_warehouses warehouse
          on warehouse.id = adjustment.warehouse_id and warehouse.organization_id = adjustment.organization_id
        join public.profiles creator on creator.id = adjustment.created_by
        left join public.profiles approver on approver.id = adjustment.approved_by
        left join public.profiles poster on poster.id = adjustment.posted_by
        where adjustment.id = $1 and adjustment.organization_id = $2
      `,
      [adjustmentId, context.organizationId],
    );
    return result.rows[0] ?? notFound("Adjustment inventory tidak ditemukan.");
  });
}

export async function createInventoryAdjustment(
  context: RequestContext,
  input: CreateInventoryAdjustmentInput,
) {
  requirePermission(context, "inventory_adjustments.manage");
  assertNonZeroAdjustmentDelta(input.expected_delta);
  return withTenantTransaction(context, async (database, client) => {
    const product = await loadProduct(client, context, input.product_id);
    await assertWarehouse(client, context, input.warehouse_id);
    try {
      assertBatchRequirement({
        batchNumber: input.batch_number,
        expiresAt: input.expires_at,
        productTracksBatch: Boolean(product.track_batch),
        productTracksExpiry: Boolean(product.track_expiry),
      });
    } catch (error) {
      throw new DomainError(
        "VALIDATION_ERROR",
        error instanceof Error ? error.message : "Metadata batch tidak valid.",
        400,
      );
    }
    const result = await client.query<Row>(
      `
        insert into public.inventory_adjustment_requests (
          organization_id, reference_number, product_id, warehouse_id,
          batch_number, expires_at, adjustment_type, expected_delta,
          unit, notes, created_by, updated_by
        ) values ($1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10, $11, $11)
        returning *
      `,
      [
        context.organizationId,
        adjustmentReference(),
        input.product_id,
        input.warehouse_id,
        input.batch_number ?? null,
        input.expires_at ?? null,
        input.adjustment_type,
        input.expected_delta,
        product.base_unit,
        input.notes,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "inventory.adjustment_created",
      after: record,
      entityId: record.id,
      entityType: "inventory_adjustment",
    });
    return record;
  });
}

async function changeAdjustmentStatus(
  context: RequestContext,
  adjustmentId: string,
  target: InventoryAdjustmentStatus,
  permission: string,
  action: string,
  input?: InventoryDecisionInput,
) {
  requirePermission(context, permission);
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `
        select * from public.inventory_adjustment_requests
        where id = $1 and organization_id = $2
        for update
      `,
      [adjustmentId, context.organizationId],
    );
    const adjustment =
      current.rows[0] ?? notFound("Adjustment inventory tidak ditemukan.");
    transitionAdjustment(adjustment.status, target);
    if (target === "approved" && adjustment.created_by === context.profileId) {
      throw new DomainError(
        "FORBIDDEN",
        "Pembuat adjustment tidak boleh menyetujui sendiri.",
        403,
      );
    }
    const result = await client.query<Row>(
      `
        update public.inventory_adjustment_requests
        set status = $1,
            approved_by = case when $1 = 'approved' then $2 else approved_by end,
            approved_at = case when $1 = 'approved' then now() else approved_at end,
            decision_notes = coalesce($3, decision_notes),
            updated_by = $2,
            updated_at = now()
        where id = $4 and organization_id = $5
        returning *
      `,
      [
        target,
        context.profileId,
        input?.notes ?? null,
        adjustmentId,
        context.organizationId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action,
      after: record,
      before: adjustment,
      entityId: record.id,
      entityType: "inventory_adjustment",
    });
    return record;
  });
}

export async function submitInventoryAdjustment(
  context: RequestContext,
  adjustmentId: string,
  input: InventoryDecisionInput,
) {
  return changeAdjustmentStatus(
    context,
    adjustmentId,
    "submitted",
    "inventory_adjustments.submit",
    "inventory.adjustment_submitted",
    input,
  );
}

export async function approveInventoryAdjustment(
  context: RequestContext,
  adjustmentId: string,
  input: InventoryDecisionInput,
) {
  return changeAdjustmentStatus(
    context,
    adjustmentId,
    "approved",
    "inventory_adjustments.approve",
    "inventory.adjustment_approved",
    input,
  );
}

export async function cancelInventoryAdjustment(
  context: RequestContext,
  adjustmentId: string,
  input: InventoryDecisionInput,
) {
  return changeAdjustmentStatus(
    context,
    adjustmentId,
    "cancelled",
    "inventory_adjustments.cancel",
    "inventory.adjustment_cancelled",
    input,
  );
}

export async function postInventoryAdjustment(
  context: RequestContext,
  adjustmentId: string,
  key: string,
) {
  requirePermission(context, "inventory_adjustments.post");
  return runIdempotent(
    context,
    key,
    "inventory_adjustment_posted",
    { adjustmentId },
    async (database, client) => {
      const current = await client.query<Row>(
        `
          select * from public.inventory_adjustment_requests
          where id = $1 and organization_id = $2
          for update
        `,
        [adjustmentId, context.organizationId],
      );
      const adjustment =
        current.rows[0] ?? notFound("Adjustment inventory tidak ditemukan.");
      transitionAdjustment(adjustment.status, "posted");
      const movementType =
        Number(adjustment.expected_delta) > 0 ? "adjustment_in" : "adjustment_out";
      const quantity = String(Math.abs(Number(adjustment.expected_delta)));
      const movement = await applyMovement(client, context, {
        batchNumber: adjustment.batch_number as string | null,
        expiresAt: adjustment.expires_at as string | null,
        movementType,
        notes: adjustment.notes as string,
        occurredAt: new Date().toISOString(),
        productId: String(adjustment.product_id),
        quantity,
        sourceId: adjustmentId,
        sourceType: "inventory_adjustment",
        unit: String(adjustment.unit),
        warehouseId: String(adjustment.warehouse_id),
      });
      const result = await client.query<Row>(
        `
          update public.inventory_adjustment_requests
          set status = 'posted', posted_by = $1, posted_at = now(),
              updated_by = $1, updated_at = now()
          where id = $2 and organization_id = $3
          returning *
        `,
        [context.profileId, adjustmentId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertAuditEvent(database, context, {
        action: "inventory.adjustment_posted",
        after: { adjustment: record, movement },
        before: adjustment,
        entityId: record.id,
        entityType: "inventory_adjustment",
      });
      return record;
    },
  );
}

export async function postGoodsReceiptToInventory(
  context: RequestContext,
  goodsReceiptId: string,
  input: PostGoodsReceiptInventoryInput,
  key: string,
) {
  requirePermission(context, "inventory_movements.post");
  return runIdempotent(
    context,
    key,
    "goods_receipt_inventory_posted",
    { goodsReceiptId, input },
    async (database, client) => {
      const receipt = await client.query<Row>(
        `
          select receipt.*
          from public.goods_receipts receipt
          where receipt.id = $1 and receipt.organization_id = $2
          for update
        `,
        [goodsReceiptId, context.organizationId],
      );
      const goodsReceipt =
        receipt.rows[0] ?? notFound("Goods receipt tidak ditemukan.");
      const posted = await client.query(
        `
          select 1 from public.inventory_movements
          where organization_id = $1 and source_type = 'goods_receipt' and source_id = $2
          limit 1
        `,
        [context.organizationId, goodsReceiptId],
      );
      if (posted.rows[0]) {
        throw new DomainError(
          "CONFLICT",
          "Goods receipt ini sudah diposting ke inventory.",
          409,
        );
      }

      const movements: Row[] = [];
      for (const item of input.items) {
      const movement = await applyMovement(client, context, {
        batchNumber: item.batch_number ?? null,
        expiresAt: item.expires_at ?? null,
          movementType: "receipt_in",
          notes: input.notes ?? item.source_item_name ?? null,
          occurredAt: input.occurred_at,
          productId: item.product_id,
          quantity: item.quantity,
          sourceId: goodsReceiptId,
          sourceType: "goods_receipt",
          unit: item.unit,
          warehouseId: item.warehouse_id,
        });
        movements.push(movement);
      }
      await insertAuditEvent(database, context, {
        action: "inventory.goods_receipt_posted",
        after: { goodsReceipt, movements },
        entityId: goodsReceiptId,
        entityType: "goods_receipt",
      });
      return {
        id: goodsReceiptId,
        movement_count: movements.length,
        movements,
      };
    },
  );
}
