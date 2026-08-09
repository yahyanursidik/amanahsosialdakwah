import { createHash, randomUUID } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import {
  assertAidPackagePackingTransition,
  assertPositivePackageCount,
  assertSubstitutionAllowed,
  type AidPackagePackingStatus,
} from "../domain/aid-package-rules";
import { DomainError } from "../domain/errors";
import type {
  AidPackageListQuery,
  AidPackageReasonInput,
  CreateAidPackagePackingInput,
  CreateAidPackageTemplateInput,
  PackAidPackageInput,
} from "../routes/aid-package-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function notFound(message: string): never {
  throw new DomainError("NOT_FOUND", message, 404);
}

function referenceNumber(): string {
  return `PKG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
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
      `insert into public.aid_package_idempotency_records (
        organization_id, idempotency_key, command_type, request_hash, status, created_by
      ) values ($1, $2, $3, $4, 'processing', $5)
      on conflict (organization_id, idempotency_key) do nothing returning *`,
      [context.organizationId, key, command, requestHash, context.profileId],
    );

    if (!inserted.rows[0]) {
      const existing = await client.query<{
        command_type: string;
        request_hash: string;
        response_snapshot: T | null;
        status: string;
      }>(
        `select command_type, request_hash, response_snapshot, status
         from public.aid_package_idempotency_records
         where organization_id = $1 and idempotency_key = $2 for update`,
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
      if (record.status === "completed" && record.response_snapshot)
        return record.response_snapshot;
      throw new DomainError(
        "CONFLICT",
        "Command dengan Idempotency-Key ini masih diproses.",
        409,
      );
    }

    const result = await operation(database, client);
    await client.query(
      `update public.aid_package_idempotency_records
       set status = 'completed', response_snapshot = $1, completed_at = now()
       where organization_id = $2 and idempotency_key = $3`,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

function transitionPacking(current: unknown, target: AidPackagePackingStatus) {
  try {
    assertAidPackagePackingTransition(
      current as AidPackagePackingStatus,
      target,
    );
  } catch (error) {
    throw new DomainError(
      "INVALID_STATE",
      error instanceof Error ? error.message : "Transisi packing tidak valid.",
      409,
    );
  }
}

function listFilter(query: AidPackageListQuery, alias: string) {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (query.status) {
    values.push(query.status);
    filters.push(`${alias}.status = $${values.length + 1}`);
  }
  if (query.q) {
    values.push(`%${query.q}%`);
    filters.push(
      `(${alias}.reference_number ilike $${values.length + 1} or ${alias}.recipient_label ilike $${values.length + 1})`,
    );
  }
  return { filters, values };
}

export async function listAidPackageTemplates(
  context: RequestContext,
  query: AidPackageListQuery,
) {
  requirePermission(context, "aid_package_templates.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["template.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`template.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(template.code ilike $${values.length} or template.name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.aid_package_templates template where ${where}`,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `select template.*, count(item.id)::int as item_count
       from public.aid_package_templates template
       left join public.aid_package_template_items item
         on item.template_id = template.id and item.organization_id = template.organization_id
       where ${where}
       group by template.id
       order by template.updated_at desc
       limit $${values.length - 1} offset $${values.length}`,
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

export async function getAidPackageTemplate(
  context: RequestContext,
  id: string,
) {
  requirePermission(context, "aid_package_templates.read");
  return withTenantTransaction(context, async (_database, client) => {
    const template = await client.query<Row>(
      `select * from public.aid_package_templates where id = $1 and organization_id = $2`,
      [id, context.organizationId],
    );
    const record =
      template.rows[0] ?? notFound("Template paket bantuan tidak ditemukan.");
    const items = await client.query<Row>(
      `select item.*, product.sku, product.name as product_name, product.base_unit
       from public.aid_package_template_items item
       join public.inventory_products product
         on product.id = item.product_id and product.organization_id = item.organization_id
       where item.template_id = $1 and item.organization_id = $2
       order by item.sort_order, product.name`,
      [id, context.organizationId],
    );
    return { ...record, items: items.rows };
  });
}

export async function createAidPackageTemplate(
  context: RequestContext,
  input: CreateAidPackageTemplateInput,
) {
  requirePermission(context, "aid_package_templates.manage");
  return withTenantTransaction(context, async (database, client) => {
    for (const item of input.items) {
      const product = await client.query<{ base_unit: string }>(
        `select base_unit from public.inventory_products
         where id = $1 and organization_id = $2 and status = 'active'`,
        [item.product_id, context.organizationId],
      );
      if (!product.rows[0])
        notFound("Produk aktif untuk komponen paket tidak ditemukan.");
      if (product.rows[0].base_unit !== item.unit) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Satuan komponen harus sama dengan satuan dasar produk.",
          400,
        );
      }
    }

    const created = await client.query<Row>(
      `insert into public.aid_package_templates (
        organization_id, code, name, description, created_by, updated_by
      ) values ($1, $2, $3, $4, $5, $5) returning *`,
      [
        context.organizationId,
        input.code.toUpperCase(),
        input.name,
        input.description ?? null,
        context.profileId,
      ],
    );
    const template = created.rows[0]!;
    for (const [index, item] of input.items.entries()) {
      await client.query(
        `insert into public.aid_package_template_items (
          organization_id, template_id, product_id, quantity, unit,
          allow_substitution, substitution_notes, sort_order, created_by
        ) values ($1, $2, $3, $4::numeric, $5, $6, $7, $8, $9)`,
        [
          context.organizationId,
          template.id,
          item.product_id,
          item.quantity,
          item.unit,
          item.allow_substitution,
          item.substitution_notes ?? null,
          index,
          context.profileId,
        ],
      );
    }
    await insertAuditEvent(database, context, {
      action: "aid_package.template_created",
      after: { ...template, item_count: input.items.length },
      entityId: template.id,
      entityType: "aid_package_template",
    });
    return { ...template, item_count: input.items.length };
  });
}

export async function publishAidPackageTemplate(
  context: RequestContext,
  id: string,
) {
  requirePermission(context, "aid_package_templates.publish");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.aid_package_templates where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const template =
      current.rows[0] ?? notFound("Template paket bantuan tidak ditemukan.");
    if (template.status !== "draft")
      throw new DomainError(
        "INVALID_STATE",
        "Hanya template draft yang dapat diterbitkan.",
        409,
      );
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.aid_package_template_items where template_id = $1 and organization_id = $2`,
      [id, context.organizationId],
    );
    if (!count.rows[0]?.total)
      throw new DomainError(
        "VALIDATION_ERROR",
        "Template wajib memiliki komponen.",
        400,
      );
    const updated = await client.query<Row>(
      `update public.aid_package_templates
       set status = 'active', published_by = $1, published_at = now(), updated_by = $1
       where id = $2 and organization_id = $3 returning *`,
      [context.profileId, id, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "aid_package.template_published",
      before: template,
      after: updated.rows[0],
      entityId: id,
      entityType: "aid_package_template",
    });
    return updated.rows[0]!;
  });
}

export async function listAidPackagePackings(
  context: RequestContext,
  query: AidPackageListQuery,
) {
  requirePermission(context, "aid_package_packings.read");
  return withTenantTransaction(context, async (_database, client) => {
    const dynamic = listFilter(query, "packing");
    const values: unknown[] = [context.organizationId, ...dynamic.values];
    const where = ["packing.organization_id = $1", ...dynamic.filters].join(
      " and ",
    );
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.aid_package_packings packing where ${where}`,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `select packing.*, template.code as template_code, template.name as template_name,
         warehouse.code as warehouse_code, warehouse.name as warehouse_name
       from public.aid_package_packings packing
       join public.aid_package_templates template on template.id = packing.template_id and template.organization_id = packing.organization_id
       join public.inventory_warehouses warehouse on warehouse.id = packing.warehouse_id and warehouse.organization_id = packing.organization_id
       where ${where} order by packing.created_at desc
       limit $${values.length - 1} offset $${values.length}`,
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

export async function getAidPackagePacking(
  context: RequestContext,
  id: string,
) {
  requirePermission(context, "aid_package_packings.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `select packing.*, template.code as template_code, template.name as template_name,
         warehouse.code as warehouse_code, warehouse.name as warehouse_name
       from public.aid_package_packings packing
       join public.aid_package_templates template on template.id = packing.template_id and template.organization_id = packing.organization_id
       join public.inventory_warehouses warehouse on warehouse.id = packing.warehouse_id and warehouse.organization_id = packing.organization_id
       where packing.id = $1 and packing.organization_id = $2`,
      [id, context.organizationId],
    );
    const record =
      result.rows[0] ?? notFound("Packing paket bantuan tidak ditemukan.");
    const items = await client.query<Row>(
      `select item.*, requested.sku as requested_sku, requested.name as requested_product_name,
         actual.sku as actual_sku, actual.name as actual_product_name,
         batch.batch_number, batch.expires_at
       from public.aid_package_packing_items item
       join public.inventory_products requested on requested.id = item.requested_product_id and requested.organization_id = item.organization_id
       join public.inventory_products actual on actual.id = item.actual_product_id and actual.organization_id = item.organization_id
       left join public.inventory_batches batch on batch.id = item.batch_id and batch.organization_id = item.organization_id
       where item.packing_id = $1 and item.organization_id = $2
       order by requested.name, batch.expires_at nulls last`,
      [id, context.organizationId],
    );
    const plannedItems = await client.query<Row>(
      `select item.*, product.sku, product.name as product_name, product.base_unit
       from public.aid_package_template_items item
       join public.inventory_products product
         on product.id = item.product_id and product.organization_id = item.organization_id
       where item.template_id = $1 and item.organization_id = $2
       order by item.sort_order, product.name`,
      [record.template_id, context.organizationId],
    );
    return { ...record, items: items.rows, planned_items: plannedItems.rows };
  });
}

export async function createAidPackagePacking(
  context: RequestContext,
  input: CreateAidPackagePackingInput,
) {
  requirePermission(context, "aid_package_packings.manage");
  try {
    assertPositivePackageCount(input.package_count);
  } catch (error) {
    throw new DomainError(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "Jumlah paket tidak valid.",
      400,
    );
  }
  return withTenantTransaction(context, async (database, client) => {
    const template = await client.query(
      `select 1 from public.aid_package_templates where id = $1 and organization_id = $2 and status = 'active'`,
      [input.template_id, context.organizationId],
    );
    if (!template.rows[0]) notFound("Template paket aktif tidak ditemukan.");
    const warehouse = await client.query(
      `select 1 from public.inventory_warehouses where id = $1 and organization_id = $2 and status = 'active'`,
      [input.warehouse_id, context.organizationId],
    );
    if (!warehouse.rows[0]) notFound("Gudang aktif tidak ditemukan.");
    const result = await client.query<Row>(
      `insert into public.aid_package_packings (
        organization_id, reference_number, template_id, warehouse_id,
        package_count, recipient_label, notes, created_by, updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $8) returning *`,
      [
        context.organizationId,
        referenceNumber(),
        input.template_id,
        input.warehouse_id,
        input.package_count,
        input.recipient_label ?? null,
        input.notes ?? null,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "aid_package.packing_created",
      after: record,
      entityId: record.id,
      entityType: "aid_package_packing",
    });
    return record;
  });
}

type TemplateItemRow = Row & {
  allow_substitution: boolean;
  base_unit: string;
  product_id: string;
  quantity: string;
  unit: string;
};

async function allocateFefo(
  client: PoolClient,
  context: RequestContext,
  input: {
    actualProductId: string;
    packingId: string;
    reason?: string;
    requestedProductId: string;
    templateItemId: string;
    totalQuantity: string;
    unit: string;
    warehouseId: string;
  },
) {
  const balances = await client.query<{
    batch_id: string | null;
    quantity_on_hand: string;
  }>(
    `select balance.batch_id, balance.quantity_on_hand::text
     from public.inventory_balances balance
     join public.inventory_products product
       on product.id = balance.product_id and product.organization_id = balance.organization_id
     left join public.inventory_batches batch on batch.id = balance.batch_id and batch.organization_id = balance.organization_id
     where balance.organization_id = $1 and balance.product_id = $2 and balance.warehouse_id = $3
       and balance.quantity_on_hand > 0
       and (product.track_batch = false or batch.id is not null)
       and (batch.id is null or batch.status = 'active')
       and (product.track_expiry = false or batch.expires_at >= current_date)
     order by batch.expires_at asc nulls last, batch.batch_number asc nulls last
     for update of balance`,
    [context.organizationId, input.actualProductId, input.warehouseId],
  );
  let remaining = input.totalQuantity;
  for (const balance of balances.rows) {
    const calculation = await client.query<{ remaining: string; take: string }>(
      `select least($1::numeric, $2::numeric)::text as take,
         ($1::numeric - least($1::numeric, $2::numeric))::text as remaining`,
      [remaining, balance.quantity_on_hand],
    );
    const take = calculation.rows[0]?.take ?? "0";
    if (take === "0") continue;
    await client.query(
      `update public.inventory_balances set quantity_on_hand = quantity_on_hand - $1::numeric, updated_at = now()
       where organization_id = $2 and product_id = $3 and warehouse_id = $4 and batch_id is not distinct from $5::uuid`,
      [
        take,
        context.organizationId,
        input.actualProductId,
        input.warehouseId,
        balance.batch_id,
      ],
    );
    const movement = await client.query<Row>(
      `insert into public.inventory_movements (
        organization_id, product_id, warehouse_id, batch_id, movement_type,
        direction, quantity, unit, source_type, source_id, occurred_at,
        notes, request_id, created_by
      ) values ($1, $2, $3, $4, 'packing_out', 'out', $5::numeric, $6,
        'aid_package_packing', $7, now(), $8, $9, $10) returning *`,
      [
        context.organizationId,
        input.actualProductId,
        input.warehouseId,
        balance.batch_id,
        take,
        input.unit,
        input.packingId,
        input.reason ?? null,
        context.requestId,
        context.profileId,
      ],
    );
    await client.query(
      `insert into public.aid_package_packing_items (
        organization_id, packing_id, template_item_id, requested_product_id,
        actual_product_id, batch_id, quantity, unit, is_substitution,
        substitution_reason, movement_id, created_by
      ) values ($1, $2, $3, $4, $5, $6, $7::numeric, $8, $9, $10, $11, $12)`,
      [
        context.organizationId,
        input.packingId,
        input.templateItemId,
        input.requestedProductId,
        input.actualProductId,
        balance.batch_id,
        take,
        input.unit,
        input.requestedProductId !== input.actualProductId,
        input.reason ?? null,
        movement.rows[0]!.id,
        context.profileId,
      ],
    );
    remaining = calculation.rows[0]?.remaining ?? remaining;
    if (remaining === "0") break;
  }
  if (remaining !== "0") {
    throw new DomainError(
      "INSUFFICIENT_STOCK",
      "Stok FEFO yang layak tidak mencukupi untuk seluruh paket.",
      409,
    );
  }
}

export async function packAidPackage(
  context: RequestContext,
  id: string,
  input: PackAidPackageInput,
  key: string,
) {
  requirePermission(context, "aid_package_packings.pack");
  return runIdempotent(
    context,
    key,
    "aid_package.pack",
    { id, input },
    async (database, client) => {
      const current = await client.query<Row>(
        `select * from public.aid_package_packings where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      );
      const packing =
        current.rows[0] ?? notFound("Packing paket bantuan tidak ditemukan.");
      transitionPacking(packing.status, "packed");
      const items = await client.query<TemplateItemRow>(
        `select item.*, product.base_unit
       from public.aid_package_template_items item
       join public.inventory_products product on product.id = item.product_id and product.organization_id = item.organization_id
       join public.aid_package_templates template on template.id = item.template_id and template.organization_id = item.organization_id
       where item.template_id = $1 and item.organization_id = $2 and template.status = 'active'
       order by item.sort_order`,
        [packing.template_id, context.organizationId],
      );
      const substitutions = new Map(
        input.substitutions.map((item) => [item.template_item_id, item]),
      );
      if (items.rows.length === 0) {
        throw new DomainError(
          "INVALID_STATE",
          "Template packing tidak aktif atau tidak memiliki komponen.",
          409,
        );
      }
      const knownItemIds = new Set(items.rows.map((item) => item.id));
      if (
        input.substitutions.some(
          (item) => !knownItemIds.has(item.template_item_id),
        )
      ) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Substitusi tidak sesuai dengan komponen template.",
          400,
        );
      }
      for (const item of items.rows) {
        const substitution = substitutions.get(item.id);
        const actualProductId = substitution?.product_id ?? item.product_id;
        try {
          assertSubstitutionAllowed({
            allowSubstitution: item.allow_substitution,
            actualProductId,
            requestedProductId: item.product_id,
            ...(substitution ? { reason: substitution.reason } : {}),
          });
        } catch (error) {
          throw new DomainError(
            "VALIDATION_ERROR",
            error instanceof Error ? error.message : "Substitusi tidak valid.",
            400,
          );
        }
        if (substitution) {
          const actual = await client.query<{ base_unit: string }>(
            `select base_unit from public.inventory_products where id = $1 and organization_id = $2 and status = 'active'`,
            [actualProductId, context.organizationId],
          );
          if (!actual.rows[0])
            notFound("Produk substitusi aktif tidak ditemukan.");
          if (actual.rows[0].base_unit !== item.unit)
            throw new DomainError(
              "VALIDATION_ERROR",
              "Produk substitusi harus memakai satuan dasar yang sama.",
              400,
            );
        }
        const total = await client.query<{ value: string }>(
          `select ($1::numeric * $2::integer)::text as value`,
          [item.quantity, packing.package_count],
        );
        await allocateFefo(client, context, {
          actualProductId,
          packingId: id,
          ...(substitution ? { reason: substitution.reason } : {}),
          requestedProductId: item.product_id,
          templateItemId: item.id,
          totalQuantity: total.rows[0]?.value ?? "0",
          unit: item.unit,
          warehouseId: String(packing.warehouse_id),
        });
      }
      const updated = await client.query<Row>(
        `update public.aid_package_packings set status = 'packed', packed_by = $1, packed_at = now(), updated_by = $1 where id = $2 and organization_id = $3 returning *`,
        [context.profileId, id, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "aid_package.packed",
        before: packing,
        after: updated.rows[0],
        entityId: id,
        entityType: "aid_package_packing",
      });
      return updated.rows[0]!;
    },
  );
}

export async function cancelAidPackagePacking(
  context: RequestContext,
  id: string,
  input: AidPackageReasonInput,
) {
  requirePermission(context, "aid_package_packings.cancel");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.aid_package_packings where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const packing =
      current.rows[0] ?? notFound("Packing paket bantuan tidak ditemukan.");
    transitionPacking(packing.status, "cancelled");
    const updated = await client.query<Row>(
      `update public.aid_package_packings set status = 'cancelled', reversal_reason = $1, updated_by = $2 where id = $3 and organization_id = $4 returning *`,
      [input.reason, context.profileId, id, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "aid_package.packing_cancelled",
      before: packing,
      after: updated.rows[0],
      entityId: id,
      entityType: "aid_package_packing",
    });
    return updated.rows[0]!;
  });
}

export async function unpackAidPackage(
  context: RequestContext,
  id: string,
  input: AidPackageReasonInput,
  key: string,
) {
  requirePermission(context, "aid_package_packings.unpack");
  return runIdempotent(
    context,
    key,
    "aid_package.unpack",
    { id, input },
    async (database, client) => {
      const current = await client.query<Row>(
        `select * from public.aid_package_packings where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      );
      const packing =
        current.rows[0] ?? notFound("Packing paket bantuan tidak ditemukan.");
      transitionPacking(packing.status, "reversed");
      const items = await client.query<
        Row & {
          actual_product_id: string;
          batch_id: string | null;
          quantity: string;
          unit: string;
        }
      >(
        `select * from public.aid_package_packing_items where packing_id = $1 and organization_id = $2 order by created_at for update`,
        [id, context.organizationId],
      );
      for (const item of items.rows) {
        await client.query(
          `update public.inventory_balances set quantity_on_hand = quantity_on_hand + $1::numeric, updated_at = now()
         where organization_id = $2 and product_id = $3 and warehouse_id = $4 and batch_id is not distinct from $5::uuid`,
          [
            item.quantity,
            context.organizationId,
            item.actual_product_id,
            packing.warehouse_id,
            item.batch_id,
          ],
        );
        const movement = await client.query<Row>(
          `insert into public.inventory_movements (
          organization_id, product_id, warehouse_id, batch_id, movement_type,
          direction, quantity, unit, source_type, source_id, occurred_at,
          notes, request_id, created_by
        ) values ($1, $2, $3, $4, 'unpack_in', 'in', $5::numeric, $6,
          'aid_package_packing', $7, now(), $8, $9, $10) returning *`,
          [
            context.organizationId,
            item.actual_product_id,
            packing.warehouse_id,
            item.batch_id,
            item.quantity,
            item.unit,
            id,
            input.reason,
            context.requestId,
            context.profileId,
          ],
        );
        await client.query(
          `insert into public.aid_package_unpack_items (organization_id, packing_id, packing_item_id, movement_id, created_by)
         values ($1, $2, $3, $4, $5)`,
          [
            context.organizationId,
            id,
            item.id,
            movement.rows[0]!.id,
            context.profileId,
          ],
        );
      }
      const updated = await client.query<Row>(
        `update public.aid_package_packings set status = 'reversed', reversed_by = $1, reversed_at = now(), reversal_reason = $2, updated_by = $1 where id = $3 and organization_id = $4 returning *`,
        [context.profileId, input.reason, id, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "aid_package.unpack_reversed",
        before: packing,
        after: updated.rows[0],
        entityId: id,
        entityType: "aid_package_packing",
      });
      return updated.rows[0]!;
    },
  );
}
