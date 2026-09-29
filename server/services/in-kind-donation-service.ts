import { createHash, randomUUID } from "node:crypto";

import { withTenantTransaction } from "../db/client";
import { DomainError } from "../domain/errors";
import type {
  InKindDonationListQuery,
  ReceiveInKindDonationInput,
} from "../routes/in-kind-donation-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { applyInventoryMovement } from "./inventory-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};

const reference = () =>
  `DNB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

const hashRequest = (input: unknown) =>
  createHash("sha256")
    .update(JSON.stringify({ command: "in_kind_donation.receive", input }))
    .digest("hex");

const donationSelect = `
  select donation.*,
         donor.display_name donor_contact_name,
         program.name program_name,
         program.code program_code,
         warehouse.name warehouse_name,
         asset.name waqf_asset_name,
         (select count(*)::int from public.in_kind_donation_items item
           where item.donation_id = donation.id and item.organization_id = donation.organization_id) item_count
  from public.in_kind_donations donation
  left join public.crm_contacts donor
    on donor.id = donation.donor_contact_id and donor.organization_id = donation.organization_id
  left join public.programs program
    on program.id = donation.program_id and program.organization_id = donation.organization_id
  left join public.inventory_warehouses warehouse
    on warehouse.id = donation.warehouse_id and warehouse.organization_id = donation.organization_id
  left join public.waqf_assets asset
    on asset.id = donation.waqf_asset_id and asset.organization_id = donation.organization_id
`;

export async function listInKindDonations(
  context: RequestContext,
  query: InKindDonationListQuery,
) {
  requirePermission(context, "in_kind_donations.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["donation.organization_id = $1"];
    if (query.giving_type) {
      values.push(query.giving_type);
      filters.push(`donation.giving_type = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(donation.reference_number ilike $${values.length} or donation.donor_name ilike $${values.length} or program.name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int total
       from public.in_kind_donations donation
       left join public.programs program
         on program.id = donation.program_id and program.organization_id = donation.organization_id
       where ${where}`,
      values,
    );
    values.push(query.pageSize, (query.page - 1) * query.pageSize);
    const rows = await client.query(
      `${donationSelect}
       where ${where}
       order by donation.received_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    return {
      data: rows.rows,
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    };
  });
}

export async function getInKindDonation(context: RequestContext, id: string) {
  requirePermission(context, "in_kind_donations.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `${donationSelect} where donation.id = $1 and donation.organization_id = $2`,
      [id, context.organizationId],
    );
    const donation =
      result.rows[0] ?? missing("Donasi barang tidak ditemukan.");
    const items = await client.query(
      `select item.*, product.name product_name, product.sku product_sku,
              round(item.quantity * item.unit_value, 2) total_value
       from public.in_kind_donation_items item
       join public.inventory_products product
         on product.id = item.product_id and product.organization_id = item.organization_id
       where item.donation_id = $1 and item.organization_id = $2
       order by item.created_at`,
      [id, context.organizationId],
    );
    return { ...donation, items: items.rows };
  });
}

/**
 * Menerima donasi barang: header, rincian, dan movement stok ditulis dalam
 * satu transaksi idempoten sehingga tanda terima selalu cocok dengan stok.
 */
export async function receiveInKindDonation(
  context: RequestContext,
  input: ReceiveInKindDonationInput,
  idempotencyKey: string,
) {
  requirePermission(context, "in_kind_donations.receive");
  requirePermission(context, "inventory_movements.post");

  return withTenantTransaction(context, async (database, client) => {
    const requestHash = hashRequest(input);
    const claimed = await client.query<Row>(
      `insert into public.inventory_idempotency_records (
         organization_id, idempotency_key, command_type, request_hash, status, created_by
       ) values ($1, $2, 'in_kind_donation.receive', $3, 'processing', $4)
       on conflict (organization_id, idempotency_key) do nothing
       returning id`,
      [context.organizationId, idempotencyKey, requestHash, context.profileId],
    );
    if (!claimed.rows[0]) {
      const existing = await client.query<{
        command_type: string;
        request_hash: string;
        response_snapshot: Row | null;
        status: string;
      }>(
        `select command_type, request_hash, response_snapshot, status
         from public.inventory_idempotency_records
         where organization_id = $1 and idempotency_key = $2 for update`,
        [context.organizationId, idempotencyKey],
      );
      const record = existing.rows[0];
      if (
        record?.command_type === "in_kind_donation.receive" &&
        record.request_hash === requestHash &&
        record.status === "completed" &&
        record.response_snapshot
      ) {
        return record.response_snapshot;
      }
      throw new DomainError(
        "CONFLICT",
        "Idempotency-Key sudah digunakan atau masih diproses.",
        409,
      );
    }

    let donorName = input.donor_type === "anonymous" ? "Hamba Allah" : "";
    if (input.donor_contact_id) {
      const donor = await client.query<{ display_name: string }>(
        `select display_name from public.crm_contacts
         where id = $1 and organization_id = $2 and status = 'active'`,
        [input.donor_contact_id, context.organizationId],
      );
      donorName =
        donor.rows[0]?.display_name ??
        missing("Kontak donatur tidak ditemukan atau tidak aktif.");
    }
    donorName = input.donor_name || donorName;

    if (input.program_id) {
      const program = await client.query(
        `select 1 from public.programs
         where id = $1 and organization_id = $2 and not is_archived`,
        [input.program_id, context.organizationId],
      );
      if (!program.rows[0]) missing("Program tujuan tidak ditemukan.");
    }
    if (input.waqf_asset_id) {
      const asset = await client.query(
        `select 1 from public.waqf_assets
         where id = $1 and organization_id = $2 and operational_status <> 'retired'`,
        [input.waqf_asset_id, context.organizationId],
      );
      if (!asset.rows[0]) missing("Aset wakaf tujuan tidak ditemukan.");
    }

    const products = await client.query<{
      base_unit: string;
      id: string;
      name: string;
    }>(
      `select id, base_unit, name from public.inventory_products
       where organization_id = $1 and id = any($2::uuid[]) and status = 'active'`,
      [context.organizationId, input.items.map((item) => item.product_id)],
    );
    const productById = new Map(products.rows.map((row) => [row.id, row]));
    for (const item of input.items) {
      if (!productById.has(item.product_id)) {
        missing("Salah satu produk tidak aktif atau tidak ditemukan.");
      }
    }

    const totals = await client.query<{ total: string }>(
      `select coalesce(sum(round(quantity * unit_value, 2)), 0)::text total
       from unnest($1::numeric[], $2::numeric[]) as line(quantity, unit_value)`,
      [
        input.items.map((item) => item.quantity),
        input.items.map((item) => item.unit_value),
      ],
    );

    const header = await client.query<Row>(
      `insert into public.in_kind_donations (
         organization_id, reference_number, donor_contact_id, donor_name,
         donor_type, giving_type, program_id, waqf_asset_id, warehouse_id,
         received_at, estimated_total_value, currency, notes, created_by
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning *`,
      [
        context.organizationId,
        reference(),
        input.donor_contact_id || null,
        donorName,
        input.donor_type,
        input.giving_type,
        input.program_id || null,
        input.waqf_asset_id || null,
        input.warehouse_id,
        input.received_at,
        totals.rows[0]?.total ?? "0",
        input.currency,
        input.notes || null,
        context.profileId,
      ],
    );
    const donation = header.rows[0] ?? missing("Donasi barang gagal dicatat.");

    const items: Row[] = [];
    for (const item of input.items) {
      const product = productById.get(item.product_id)!;
      const movement = await applyInventoryMovement(client, context, {
        batchNumber: item.batch_number ?? null,
        expiresAt: item.expires_at ?? null,
        movementType: "receipt_in",
        notes: `Donasi barang ${String(donation.reference_number)} dari ${donorName}`,
        occurredAt: input.received_at,
        productId: item.product_id,
        quantity: item.quantity,
        sourceId: donation.id,
        sourceType: "in_kind_donation",
        unit: product.base_unit,
        warehouseId: input.warehouse_id,
      });
      const inserted = await client.query<Row>(
        `insert into public.in_kind_donation_items (
           organization_id, donation_id, product_id, quantity, unit, unit_value,
           item_condition, batch_number, expires_at, movement_id, created_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         returning *`,
        [
          context.organizationId,
          donation.id,
          item.product_id,
          item.quantity,
          product.base_unit,
          item.unit_value,
          item.item_condition,
          item.batch_number ?? null,
          item.expires_at ?? null,
          movement.id,
          context.profileId,
        ],
      );
      items.push({ ...inserted.rows[0]!, product_name: product.name });
    }

    await insertAuditEvent(database, context, {
      action: "in_kind_donation.received",
      after: { donation, items },
      entityId: donation.id,
      entityType: "in_kind_donation",
    });

    const response = { ...donation, items };
    await client.query(
      `update public.inventory_idempotency_records
       set status = 'completed', response_snapshot = $1, completed_at = now()
       where organization_id = $2 and idempotency_key = $3`,
      [JSON.stringify(response), context.organizationId, idempotencyKey],
    );
    return response;
  });
}
