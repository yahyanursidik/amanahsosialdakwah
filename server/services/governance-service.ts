import { randomUUID } from "node:crypto";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import { DomainError } from "../domain/errors";
import {
  assertIndependentClosure,
  assertIndependentVerification,
  assertGovernanceTransition,
  calculateGovernanceSla,
  type GovernanceSeverity,
} from "../domain/governance-rules";
import type {
  CreateComplaintInput,
  CreateCorrectiveActionInput,
  CreateGovernanceIncidentInput,
  CreateRiskFlagInput,
  GovernanceListQuery,
  GovernanceTransitionInput,
} from "../routes/governance-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function reference(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function notFound(message: string): never {
  throw new DomainError("NOT_FOUND", message, 404);
}

async function event(
  client: { query: (sql: string, values?: unknown[]) => Promise<unknown> },
  context: RequestContext,
  entityType: string,
  entityId: string,
  eventType: string,
  eventData?: unknown,
) {
  await client.query(
    `insert into public.governance_events (
      organization_id, entity_type, entity_id, event_type,
      event_data, actor_profile_id, request_id
    ) values ($1,$2,$3,$4,$5,$6,$7)`,
    [context.organizationId, entityType, entityId, eventType, eventData ? JSON.stringify(eventData) : null, context.profileId, context.requestId],
  );
}

async function list(
  context: RequestContext,
  query: GovernanceListQuery,
  options: { permission: string; select: string; table: string },
) {
  requirePermission(context, options.permission);
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["record.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`record.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(`(record.reference_number ilike $${values.length} or record.title ilike $${values.length})`);
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.${options.table} record where ${where}`,
      values,
    );
    values.push(query.pageSize, (query.page - 1) * query.pageSize);
    const rows = await client.query<Row>(
      `select ${options.select} from public.${options.table} record
       where ${where} order by record.created_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    return { data: rows.rows, page: query.page, pageSize: query.pageSize, total: count.rows[0]?.total ?? 0 };
  });
}

export const listRiskFlags = (context: RequestContext, query: GovernanceListQuery) =>
  list(context, query, { permission: "risk_flags.read", select: "record.*", table: "risk_flags" });
export const listGovernanceIncidents = (context: RequestContext, query: GovernanceListQuery) =>
  list(context, query, { permission: "governance_incidents.read", select: "record.*", table: "governance_incidents" });
export const listComplaints = (context: RequestContext, query: GovernanceListQuery) =>
  list(context, query, {
    permission: "complaints.read",
    select: "record.id, record.reference_number, record.channel, record.category, record.classification, record.is_anonymous, record.title, record.received_at, record.status, record.response_due_at, record.resolution_due_at, record.assigned_to, record.created_at, record.updated_at",
    table: "complaints",
  });
export const listCorrectiveActions = (context: RequestContext, query: GovernanceListQuery) =>
  list(context, query, { permission: "corrective_actions.read", select: "record.*", table: "corrective_actions" });

export function listAuditEvents(context: RequestContext, query: GovernanceListQuery) {
  requirePermission(context, "audit.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["organization_id = $1"];
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(`(action ilike $${values.length} or entity_type ilike $${values.length})`);
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(`select count(*)::int as total from public.audit_events where ${where}`, values);
    values.push(query.pageSize, (query.page - 1) * query.pageSize);
    const rows = await client.query<Row>(
      `select id, request_id, actor_profile_id, action, entity_type, entity_id, occurred_at, created_at
       from public.audit_events where ${where} order by occurred_at desc
       limit $${values.length - 1} offset $${values.length}`,
      values,
    );
    return { data: rows.rows, page: query.page, pageSize: query.pageSize, total: count.rows[0]?.total ?? 0 };
  });
}

async function auditedCreate(
  context: RequestContext,
  entityType: string,
  operation: (database: TenantDatabase, client: Parameters<Parameters<typeof withTenantTransaction>[1]>[1]) => Promise<Row>,
) {
  return withTenantTransaction(context, async (database, client) => {
    const record = await operation(database, client);
    await event(client, context, entityType, record.id, "created", record);
    await insertAuditEvent(database, context, {
      action: `governance.${entityType}_created`,
      after: record,
      entityId: record.id,
      entityType,
    });
    return record;
  });
}

export async function createRiskFlag(context: RequestContext, input: CreateRiskFlagInput) {
  requirePermission(context, "risk_flags.manage");
  const sla = calculateGovernanceSla(input.severity, new Date().toISOString());
  return auditedCreate(context, "risk_flag", async (_database, client) => {
    const result = await client.query<Row>(
      `insert into public.risk_flags (
        organization_id, reference_number, subject_type, subject_id, risk_type,
        severity, source, title, description, owner_profile_id,
        response_due_at, resolution_due_at, created_by, updated_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) returning *`,
      [context.organizationId, reference("RSK"), input.subject_type, input.subject_id ?? null, input.risk_type, input.severity, input.source, input.title, input.description, input.owner_profile_id ?? context.profileId, sla.responseDueAt, sla.resolutionDueAt, context.profileId],
    );
    return result.rows[0]!;
  });
}

export async function createGovernanceIncident(context: RequestContext, input: CreateGovernanceIncidentInput) {
  requirePermission(context, "governance_incidents.report");
  const sla = calculateGovernanceSla(input.severity, input.occurred_at);
  return auditedCreate(context, "incident", async (_database, client) => {
    const result = await client.query<Row>(
      `insert into public.governance_incidents (
        organization_id, reference_number, category, severity, title, description,
        occurred_at, reported_by, owner_profile_id, response_due_at, resolution_due_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [context.organizationId, reference("INC"), input.category, input.severity, input.title, input.description, input.occurred_at, context.profileId, input.owner_profile_id ?? null, sla.responseDueAt, sla.resolutionDueAt],
    );
    return result.rows[0]!;
  });
}

export async function createComplaint(context: RequestContext, input: CreateComplaintInput) {
  requirePermission(context, "complaints.record");
  const severity: GovernanceSeverity = ["fraud", "safeguarding", "privacy"].includes(input.category) ? "high" : "medium";
  const sla = calculateGovernanceSla(severity, input.received_at);
  return auditedCreate(context, "complaint", async (_database, client) => {
    const result = await client.query<Row>(
      `insert into public.complaints (
        organization_id, reference_number, channel, category, classification,
        complainant_contact_id, is_anonymous, title, description, received_at,
        recorded_by, response_due_at, resolution_due_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [context.organizationId, reference("CMP"), input.channel, input.category, input.classification, input.complainant_contact_id ?? null, input.is_anonymous, input.title, input.description, input.received_at, context.profileId, sla.responseDueAt, sla.resolutionDueAt],
    );
    return result.rows[0]!;
  });
}

export async function createCorrectiveAction(context: RequestContext, input: CreateCorrectiveActionInput) {
  requirePermission(context, "corrective_actions.manage");
  const sourceTables = { audit_event: "audit_events", complaint: "complaints", incident: "governance_incidents", risk_flag: "risk_flags" } as const;
  return auditedCreate(context, "corrective_action", async (_database, client) => {
    const source = await client.query(
      `select 1 from public.${sourceTables[input.source_type]} where id = $1 and organization_id = $2`,
      [input.source_id, context.organizationId],
    );
    if (!source.rows[0]) notFound("Sumber corrective action tidak ditemukan.");
    const result = await client.query<Row>(
      `insert into public.corrective_actions (
        organization_id, reference_number, source_type, source_id, title,
        description, owner_profile_id, due_at, created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [context.organizationId, reference("CAP"), input.source_type, input.source_id, input.title, input.description, input.owner_profile_id ?? context.profileId, input.due_at, context.profileId],
    );
    return result.rows[0]!;
  });
}

const allowedTargets = {
  complaint: new Set(["triaged", "in_progress", "resolved", "closed", "rejected"]),
  corrective_action: new Set(["in_progress", "completed", "verified", "cancelled"]),
  incident: new Set(["investigating", "contained", "resolved", "closed"]),
  risk_flag: new Set(["monitoring", "mitigated", "accepted", "closed"]),
};

export async function transitionGovernanceRecord(
  context: RequestContext,
  entityType: keyof typeof allowedTargets,
  id: string,
  input: GovernanceTransitionInput,
) {
  if (!allowedTargets[entityType].has(input.status)) {
    throw new DomainError("VALIDATION_ERROR", "Status tujuan tidak valid.", 400);
  }
  const settings = {
    complaint: { permission: "complaints.manage", table: "complaints", creator: "recorded_by" },
    corrective_action: { permission: input.status === "verified" ? "corrective_actions.verify" : "corrective_actions.manage", table: "corrective_actions", creator: "created_by" },
    incident: { permission: "governance_incidents.manage", table: "governance_incidents", creator: "reported_by" },
    risk_flag: { permission: ["accepted", "closed"].includes(input.status) ? "risk_flags.resolve" : "risk_flags.manage", table: "risk_flags", creator: "created_by" },
  }[entityType];
  requirePermission(context, settings.permission);

  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.${settings.table} where id = $1 and organization_id = $2 for update`,
      [id, context.organizationId],
    );
    const record = current.rows[0] ?? notFound("Record tata kelola tidak ditemukan.");
    try {
      assertGovernanceTransition(entityType, String(record.status), input.status);
    } catch (error) {
      throw new DomainError("INVALID_STATE", (error as Error).message, 409);
    }

    if (entityType === "corrective_action" && input.status === "verified") {
      if (record.status !== "completed" || !record.completed_by) {
        throw new DomainError("INVALID_STATE", "Corrective action belum selesai.", 409);
      }
      try { assertIndependentVerification(String(record.completed_by), context.profileId); }
      catch (error) { throw new DomainError("FORBIDDEN", (error as Error).message, 403); }
    }
    if (["complaint", "incident"].includes(entityType) && ["resolved", "closed", "rejected"].includes(input.status)) {
      try { assertIndependentClosure(String(record[settings.creator]), context.profileId); }
      catch (error) { throw new DomainError("FORBIDDEN", (error as Error).message, 403); }
    }

    let update: string;
    if (entityType === "corrective_action" && input.status === "completed") {
      update = "status=$1, completion_notes=$2, completed_by=$3, completed_at=now()";
    } else if (entityType === "corrective_action" && input.status === "verified") {
      update = "status=$1, effectiveness_notes=$2, verified_by=$3, verified_at=now()";
    } else if (["closed", "resolved", "rejected"].includes(input.status)) {
      update = "status=$1, resolution_notes=$2, resolved_by=$3, resolved_at=now()";
    } else if (entityType === "incident" && input.status === "contained") {
      update = "status=$1, containment_notes=$2, owner_profile_id=coalesce(owner_profile_id,$3)";
    } else {
      update = "status=$1, updated_by=$3";
      if (entityType !== "risk_flag") update = "status=$1";
    }
    const values = entityType === "risk_flag" || update.includes("$3")
      ? [input.status, input.notes, context.profileId, id, context.organizationId]
      : [input.status, input.notes, id, context.organizationId];
    const idPosition = values.length - 1;
    const updated = await client.query<Row>(
      `update public.${settings.table} set ${update}
       where id = $${idPosition} and organization_id = $${idPosition + 1} returning *`,
      values,
    );
    const after = updated.rows[0]!;
    await event(client, context, entityType, id, `status_${input.status}`, { notes: input.notes });
    await insertAuditEvent(database, context, { action: `governance.${entityType}_${input.status}`, before: record, after, entityId: id, entityType });
    return after;
  });
}
