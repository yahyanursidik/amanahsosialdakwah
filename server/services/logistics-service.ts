import { createHash } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import {
  assertIndependentIncidentResolution,
  assertLogisticsShipmentTransition,
  nextStatusForTrackingEvent,
  type LogisticsShipmentStatus,
} from "../domain/logistics-rules";
import { DomainError } from "../domain/errors";
import type {
  CreateLogisticsCourierInput,
  CreateLogisticsShipmentInput,
  LogisticsDeliveryInput,
  LogisticsDispatchInput,
  LogisticsIncidentInput,
  LogisticsIncidentResolutionInput,
  LogisticsListQuery,
  LogisticsReturnReceiveInput,
  LogisticsReturnRequestInput,
  LogisticsTrackingInput,
} from "../routes/logistics-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function notFound(message: string): never {
  throw new DomainError("NOT_FOUND", message, 404);
}

function shipmentReference(): string {
  return `SHP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
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
      `insert into public.logistics_idempotency_records (
        organization_id, idempotency_key, command_type, request_hash, created_by
      ) values ($1, $2, $3, $4, $5)
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
         from public.logistics_idempotency_records
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
      `update public.logistics_idempotency_records
       set status = 'completed', response_snapshot = $1, completed_at = now()
       where organization_id = $2 and idempotency_key = $3`,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

function transition(current: unknown, target: LogisticsShipmentStatus): void {
  try {
    assertLogisticsShipmentTransition(
      current as LogisticsShipmentStatus,
      target,
    );
  } catch (error) {
    throw new DomainError(
      "INVALID_STATE",
      error instanceof Error ? error.message : "Transisi shipment tidak valid.",
      409,
    );
  }
}

function pagination(query: LogisticsListQuery) {
  return { limit: query.pageSize, offset: (query.page - 1) * query.pageSize };
}

export async function listLogisticsCouriers(
  context: RequestContext,
  query: LogisticsListQuery,
) {
  requirePermission(context, "logistics_couriers.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(code ilike $${values.length} or name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.logistics_couriers where ${where}`,
      values,
    );
    const { limit, offset } = pagination(query);
    values.push(limit, offset);
    const result = await client.query<Row>(
      `select * from public.logistics_couriers where ${where} order by name limit $${values.length - 1} offset $${values.length}`,
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

export async function createLogisticsCourier(
  context: RequestContext,
  input: CreateLogisticsCourierInput,
) {
  requirePermission(context, "logistics_couriers.manage");
  return withTenantTransaction(context, async (database, client) => {
    const result = await client.query<Row>(
      `insert into public.logistics_couriers (
        organization_id, code, name, courier_type, contact_name, contact_phone,
        service_notes, created_by, updated_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$8) returning *`,
      [
        context.organizationId,
        input.code,
        input.name,
        input.courier_type,
        input.contact_name ?? null,
        input.contact_phone ?? null,
        input.service_notes ?? null,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "logistics.courier_created",
      after: record,
      entityId: record.id,
      entityType: "logistics_courier",
    });
    return record;
  });
}

export async function listLogisticsShipments(
  context: RequestContext,
  query: LogisticsListQuery,
) {
  requirePermission(context, "logistics_shipments.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["shipment.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`shipment.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(shipment.reference_number ilike $${values.length} or shipment.tracking_number ilike $${values.length} or shipment.destination_name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.logistics_shipments shipment where ${where}`,
      values,
    );
    const { limit, offset } = pagination(query);
    values.push(limit, offset);
    const result = await client.query<Row>(
      `select shipment.id, shipment.reference_number, shipment.packing_id,
        shipment.courier_id, shipment.tracking_number, shipment.service_level,
        shipment.destination_name, shipment.planned_dispatch_at,
        shipment.dispatched_at, shipment.delivered_at, shipment.returned_at,
        shipment.status, shipment.created_at, courier.code as courier_code,
        courier.name as courier_name, packing.reference_number as packing_reference,
        packing.package_count
       from public.logistics_shipments shipment
       join public.logistics_couriers courier on courier.id = shipment.courier_id and courier.organization_id = shipment.organization_id
       join public.aid_package_packings packing on packing.id = shipment.packing_id and packing.organization_id = shipment.organization_id
       where ${where} order by shipment.created_at desc
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

export async function getLogisticsShipment(
  context: RequestContext,
  id: string,
) {
  requirePermission(context, "logistics_shipments.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `select shipment.*, courier.code as courier_code, courier.name as courier_name,
        packing.reference_number as packing_reference, packing.package_count,
        template.name as package_name
       from public.logistics_shipments shipment
       join public.logistics_couriers courier on courier.id = shipment.courier_id and courier.organization_id = shipment.organization_id
       join public.aid_package_packings packing on packing.id = shipment.packing_id and packing.organization_id = shipment.organization_id
       join public.aid_package_templates template on template.id = packing.template_id and template.organization_id = packing.organization_id
       where shipment.id = $1 and shipment.organization_id = $2`,
      [id, context.organizationId],
    );
    const shipment = result.rows[0] ?? notFound("Shipment tidak ditemukan.");
    const [tracking, deliveries, returns, incidents] = await Promise.all([
      client.query<Row>(
        `select * from public.logistics_tracking_events where shipment_id = $1 and organization_id = $2 order by event_at desc, created_at desc`,
        [id, context.organizationId],
      ),
      client.query<Row>(
        `select * from public.logistics_deliveries where shipment_id = $1 and organization_id = $2 order by received_at desc`,
        [id, context.organizationId],
      ),
      client.query<Row>(
        `select * from public.logistics_returns where shipment_id = $1 and organization_id = $2 order by requested_at desc`,
        [id, context.organizationId],
      ),
      client.query<Row>(
        `select * from public.logistics_incidents where shipment_id = $1 and organization_id = $2 order by occurred_at desc`,
        [id, context.organizationId],
      ),
    ]);
    return {
      ...shipment,
      tracking_events: tracking.rows,
      deliveries: deliveries.rows,
      returns: returns.rows,
      incidents: incidents.rows,
    };
  });
}

export async function createLogisticsShipment(
  context: RequestContext,
  input: CreateLogisticsShipmentInput,
) {
  requirePermission(context, "logistics_shipments.manage");
  return withTenantTransaction(context, async (database, client) => {
    const packing = await client.query(
      `select 1 from public.aid_package_packings where id = $1 and organization_id = $2 and status = 'packed'`,
      [input.packing_id, context.organizationId],
    );
    if (!packing.rows[0]) notFound("Packing berstatus packed tidak ditemukan.");
    const courier = await client.query(
      `select 1 from public.logistics_couriers where id = $1 and organization_id = $2 and status = 'active'`,
      [input.courier_id, context.organizationId],
    );
    if (!courier.rows[0]) notFound("Kurir aktif tidak ditemukan.");
    const result = await client.query<Row>(
      `insert into public.logistics_shipments (
        organization_id, reference_number, packing_id, courier_id,
        tracking_number, service_level, destination_name, destination_phone,
        destination_address, planned_dispatch_at, notes, created_by, updated_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) returning *`,
      [
        context.organizationId,
        shipmentReference(),
        input.packing_id,
        input.courier_id,
        input.tracking_number ?? null,
        input.service_level ?? null,
        input.destination_name,
        input.destination_phone ?? null,
        input.destination_address,
        input.planned_dispatch_at ?? null,
        input.notes ?? null,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "logistics.shipment_created",
      after: record,
      entityId: record.id,
      entityType: "logistics_shipment",
    });
    return record;
  });
}

export async function dispatchLogisticsShipment(
  context: RequestContext,
  id: string,
  input: LogisticsDispatchInput,
  key: string,
) {
  requirePermission(context, "logistics_shipments.dispatch");
  return runIdempotent(
    context,
    key,
    "logistics.dispatch",
    { id, input },
    async (database, client) => {
      const current = await client.query<Row>(
        `select * from public.logistics_shipments where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      );
      const shipment = current.rows[0] ?? notFound("Shipment tidak ditemukan.");
      transition(shipment.status, "dispatched");
      const updated = await client.query<Row>(
        `update public.logistics_shipments set status = 'dispatched', dispatched_at = $1, tracking_number = coalesce($2, tracking_number), notes = coalesce($3, notes), updated_by = $4 where id = $5 and organization_id = $6 returning *`,
        [
          input.dispatched_at,
          input.tracking_number ?? null,
          input.notes ?? null,
          context.profileId,
          id,
          context.organizationId,
        ],
      );
      await client.query(
        `insert into public.logistics_tracking_events (organization_id, shipment_id, event_type, event_at, notes, created_by) values ($1,$2,'dispatched',$3,$4,$5)`,
        [
          context.organizationId,
          id,
          input.dispatched_at,
          input.notes ?? null,
          context.profileId,
        ],
      );
      await insertAuditEvent(database, context, {
        action: "logistics.shipment_dispatched",
        before: shipment,
        after: updated.rows[0],
        entityId: id,
        entityType: "logistics_shipment",
      });
      return updated.rows[0]!;
    },
  );
}

export async function addLogisticsTracking(
  context: RequestContext,
  id: string,
  input: LogisticsTrackingInput,
  key: string,
) {
  requirePermission(context, "logistics_shipments.track");
  return runIdempotent(
    context,
    key,
    "logistics.track",
    { id, input },
    async (database, client) => {
      const current = await client.query<Row>(
        `select * from public.logistics_shipments where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      );
      const shipment = current.rows[0] ?? notFound("Shipment tidak ditemukan.");
      let nextStatus: LogisticsShipmentStatus;
      try {
        nextStatus = nextStatusForTrackingEvent(
          shipment.status as LogisticsShipmentStatus,
          input.event_type,
        );
      } catch (error) {
        throw new DomainError(
          "INVALID_STATE",
          error instanceof Error ? error.message : "Tracking tidak valid.",
          409,
        );
      }
      const event = await client.query<Row>(
        `insert into public.logistics_tracking_events (organization_id, shipment_id, event_type, event_at, location, notes, external_event_id, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [
          context.organizationId,
          id,
          input.event_type,
          input.event_at,
          input.location ?? null,
          input.notes ?? null,
          input.external_event_id ?? null,
          context.profileId,
        ],
      );
      if (nextStatus !== shipment.status)
        await client.query(
          `update public.logistics_shipments set status = $1, updated_by = $2 where id = $3 and organization_id = $4`,
          [nextStatus, context.profileId, id, context.organizationId],
        );
      await insertAuditEvent(database, context, {
        action: "logistics.tracking_added",
        after: event.rows[0],
        entityId: id,
        entityType: "logistics_shipment",
      });
      return event.rows[0]!;
    },
  );
}

export async function confirmLogisticsDelivery(
  context: RequestContext,
  id: string,
  input: LogisticsDeliveryInput,
  key: string,
) {
  requirePermission(context, "logistics_shipments.deliver");
  return runIdempotent(
    context,
    key,
    "logistics.deliver",
    { id, input },
    async (database, client) => {
      const current = await client.query<Row>(
        `select * from public.logistics_shipments where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      );
      const shipment = current.rows[0] ?? notFound("Shipment tidak ditemukan.");
      transition(shipment.status, "delivered");
      await client.query(
        `insert into public.logistics_deliveries (organization_id, shipment_id, recipient_name, relationship_to_recipient, received_at, confirmation_method, notes, confirmed_by) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          context.organizationId,
          id,
          input.recipient_name,
          input.relationship_to_recipient ?? null,
          input.received_at,
          input.confirmation_method,
          input.notes ?? null,
          context.profileId,
        ],
      );
      await client.query(
        `insert into public.logistics_tracking_events (organization_id, shipment_id, event_type, event_at, notes, created_by) values ($1,$2,'delivered',$3,$4,$5)`,
        [
          context.organizationId,
          id,
          input.received_at,
          input.notes ?? null,
          context.profileId,
        ],
      );
      const updated = await client.query<Row>(
        `update public.logistics_shipments set status = 'delivered', delivered_at = $1, updated_by = $2 where id = $3 and organization_id = $4 returning *`,
        [input.received_at, context.profileId, id, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "logistics.shipment_delivered",
        before: shipment,
        after: updated.rows[0],
        entityId: id,
        entityType: "logistics_shipment",
      });
      return updated.rows[0]!;
    },
  );
}

export async function requestLogisticsReturn(
  context: RequestContext,
  id: string,
  input: LogisticsReturnRequestInput,
  key: string,
) {
  requirePermission(context, "logistics_shipments.return");
  return runIdempotent(
    context,
    key,
    "logistics.return_request",
    { id, input },
    async (database, client) => {
      const current = await client.query<Row>(
        `select * from public.logistics_shipments where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      );
      const shipment = current.rows[0] ?? notFound("Shipment tidak ditemukan.");
      transition(shipment.status, "return_requested");
      await client.query(
        `insert into public.logistics_returns (organization_id, shipment_id, reason_code, reason_notes, requested_by) values ($1,$2,$3,$4,$5)`,
        [
          context.organizationId,
          id,
          input.reason_code,
          input.reason_notes,
          context.profileId,
        ],
      );
      await client.query(
        `insert into public.logistics_tracking_events (organization_id, shipment_id, event_type, event_at, notes, created_by) values ($1,$2,'return_requested',now(),$3,$4)`,
        [context.organizationId, id, input.reason_notes, context.profileId],
      );
      const updated = await client.query<Row>(
        `update public.logistics_shipments set status = 'return_requested', updated_by = $1 where id = $2 and organization_id = $3 returning *`,
        [context.profileId, id, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "logistics.return_requested",
        before: shipment,
        after: updated.rows[0],
        entityId: id,
        entityType: "logistics_shipment",
      });
      return updated.rows[0]!;
    },
  );
}

export async function receiveLogisticsReturn(
  context: RequestContext,
  id: string,
  input: LogisticsReturnReceiveInput,
  key: string,
) {
  requirePermission(context, "logistics_shipments.return");
  return runIdempotent(
    context,
    key,
    "logistics.return_receive",
    { id, input },
    async (database, client) => {
      const current = await client.query<Row>(
        `select * from public.logistics_shipments where id = $1 and organization_id = $2 for update`,
        [id, context.organizationId],
      );
      const shipment = current.rows[0] ?? notFound("Shipment tidak ditemukan.");
      transition(shipment.status, "returned");
      const returned = await client.query<Row>(
        `update public.logistics_returns set status = 'received', received_at = $1, received_by = $2, condition_on_return = $3 where shipment_id = $4 and organization_id = $5 and status in ('requested','in_transit') returning *`,
        [
          input.received_at,
          context.profileId,
          input.condition_on_return,
          id,
          context.organizationId,
        ],
      );
      if (!returned.rows[0])
        throw new DomainError(
          "INVALID_STATE",
          "Permintaan return aktif tidak ditemukan.",
          409,
        );
      await client.query(
        `insert into public.logistics_tracking_events (organization_id, shipment_id, event_type, event_at, notes, created_by) values ($1,$2,'returned',$3,$4,$5)`,
        [
          context.organizationId,
          id,
          input.received_at,
          input.condition_on_return,
          context.profileId,
        ],
      );
      const updated = await client.query<Row>(
        `update public.logistics_shipments set status = 'returned', returned_at = $1, updated_by = $2 where id = $3 and organization_id = $4 returning *`,
        [input.received_at, context.profileId, id, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "logistics.return_received",
        before: shipment,
        after: updated.rows[0],
        entityId: id,
        entityType: "logistics_shipment",
      });
      return updated.rows[0]!;
    },
  );
}

export async function reportLogisticsIncident(
  context: RequestContext,
  shipmentId: string,
  input: LogisticsIncidentInput,
) {
  requirePermission(context, "logistics_incidents.manage");
  return withTenantTransaction(context, async (database, client) => {
    const shipment = await client.query(
      `select status from public.logistics_shipments where id = $1 and organization_id = $2`,
      [shipmentId, context.organizationId],
    );
    if (!shipment.rows[0]) notFound("Shipment tidak ditemukan.");
    if (
      ["draft", "cancelled", "returned"].includes(
        String(shipment.rows[0].status),
      )
    )
      throw new DomainError(
        "INVALID_STATE",
        "Insiden tidak dapat dilaporkan pada status shipment ini.",
        409,
      );
    const result = await client.query<Row>(
      `insert into public.logistics_incidents (organization_id, shipment_id, incident_type, severity, occurred_at, location, description, reported_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [
        context.organizationId,
        shipmentId,
        input.incident_type,
        input.severity,
        input.occurred_at,
        input.location ?? null,
        input.description,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "logistics.incident_reported",
      after: record,
      entityId: record.id,
      entityType: "logistics_incident",
    });
    return record;
  });
}

export async function resolveLogisticsIncident(
  context: RequestContext,
  id: string,
  input: LogisticsIncidentResolutionInput,
) {
  requirePermission(context, "logistics_incidents.resolve");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.logistics_incidents where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const incident =
      current.rows[0] ?? notFound("Insiden logistik tidak ditemukan.");
    if (incident.status !== "open")
      throw new DomainError(
        "INVALID_STATE",
        "Insiden sudah diselesaikan.",
        409,
      );
    try {
      assertIndependentIncidentResolution({
        reportedBy: String(incident.reported_by),
        resolvedBy: context.profileId,
      });
    } catch (error) {
      throw new DomainError(
        "FORBIDDEN",
        error instanceof Error
          ? error.message
          : "Penyelesaian insiden ditolak.",
        403,
      );
    }
    const updated = await client.query<Row>(
      `update public.logistics_incidents set status = 'resolved', resolution_notes = $1, resolved_by = $2, resolved_at = now() where id = $3 and organization_id = $4 returning *`,
      [input.resolution_notes, context.profileId, id, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "logistics.incident_resolved",
      before: incident,
      after: updated.rows[0],
      entityId: id,
      entityType: "logistics_incident",
    });
    return updated.rows[0]!;
  });
}
