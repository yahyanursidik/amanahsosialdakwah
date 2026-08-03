import { createHash } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import { DomainError } from "../domain/errors";
import {
  assertIndependentActor,
  assertKafalahNeedTransition,
  buildInstallments,
} from "../domain/kafalah-rules";
import type {
  CreateKafalahContractInput,
  CreateKafalahMatchInput,
  CreateKafalahNeedInput,
  KafalahDistributionInput,
  KafalahListQuery,
  KafalahMonitoringDecisionInput,
  KafalahMonitoringInput,
  KafalahPaymentInput,
  KafalahRenewalDecisionInput,
  KafalahRenewalInput,
} from "../routes/kafalah-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };
const missing = (message: string): never => {
  throw new DomainError("NOT_FOUND", message, 404);
};
const reference = (prefix: string) =>
  `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const hashRequest = (command: string, input: unknown) =>
  createHash("sha256").update(JSON.stringify({ command, input })).digest("hex");
const page = (query: KafalahListQuery) => ({
  limit: query.pageSize,
  offset: (query.page - 1) * query.pageSize,
});

async function event(
  client: PoolClient,
  context: RequestContext,
  entityType: string,
  entityId: string,
  eventType: string,
  eventData?: unknown,
) {
  await client.query(
    `insert into public.kafalah_events (organization_id,entity_type,entity_id,event_type,event_data,created_by) values ($1,$2,$3,$4,$5,$6)`,
    [
      context.organizationId,
      entityType,
      entityId,
      eventType,
      eventData ? JSON.stringify(eventData) : null,
      context.profileId,
    ],
  );
}

async function idempotent<T extends Row>(
  context: RequestContext,
  key: string,
  command: string,
  input: unknown,
  operation: (database: TenantDatabase, client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTenantTransaction(context, async (database, client) => {
    const requestHash = hashRequest(command, input);
    const inserted = await client.query(
      `insert into public.kafalah_idempotency_records (organization_id,idempotency_key,command_type,request_hash,created_by) values ($1,$2,$3,$4,$5) on conflict (organization_id,idempotency_key) do nothing returning id`,
      [context.organizationId, key, command, requestHash, context.profileId],
    );
    if (!inserted.rows[0]) {
      const existing = await client.query(
        `select command_type,request_hash,status,response_snapshot from public.kafalah_idempotency_records where organization_id=$1 and idempotency_key=$2 for update`,
        [context.organizationId, key],
      );
      const record = existing.rows[0];
      if (
        !record ||
        record.command_type !== command ||
        record.request_hash !== requestHash
      )
        throw new DomainError(
          "CONFLICT",
          "Idempotency-Key telah digunakan untuk command berbeda.",
          409,
        );
      if (record.status === "completed" && record.response_snapshot)
        return record.response_snapshot as T;
      throw new DomainError(
        "CONFLICT",
        "Command dengan Idempotency-Key ini masih diproses.",
        409,
      );
    }
    const result = await operation(database, client);
    await client.query(
      `update public.kafalah_idempotency_records set status='completed',response_snapshot=$1,completed_at=now() where organization_id=$2 and idempotency_key=$3`,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

function translateRule(
  error: unknown,
  code: "FORBIDDEN" | "INVALID_STATE" = "INVALID_STATE",
): never {
  throw new DomainError(
    code,
    error instanceof Error ? error.message : "Operasi Kafalah ditolak.",
    code === "FORBIDDEN" ? 403 : 409,
  );
}

async function listRows(
  context: RequestContext,
  query: KafalahListQuery,
  alias: string,
  selectSql: string,
  searchSql: string,
) {
  requirePermission(context, "kafalah.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = [`${alias}.organization_id=$1`];
    if (query.status) {
      values.push(query.status);
      filters.push(`${alias}.status=$${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(searchSql.replaceAll("?", `$${values.length}`));
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int total from (${selectSql} where ${where}) scoped`,
      values,
    );
    const { limit, offset } = page(query);
    values.push(limit, offset);
    const rows = await client.query<Row>(
      `${selectSql} where ${where} order by ${alias}.created_at desc limit $${values.length - 1} offset $${values.length}`,
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

export async function listKafalahSponsors(
  context: RequestContext,
  query: KafalahListQuery,
) {
  requirePermission(context, "kafalah.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = [
      "c.organization_id=$1",
      "c.status='active'",
      "r.role_type='kafil'",
      "r.status='active'",
    ];
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(c.display_name ilike $${values.length} or c.primary_email ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(distinct c.id)::int total from public.crm_contacts c join public.crm_contact_roles r on r.contact_id=c.id and r.organization_id=c.organization_id where ${where}`,
      values,
    );
    const { limit, offset } = page(query);
    values.push(limit, offset);
    const rows = await client.query<Row>(
      `select distinct c.id,c.display_name,c.primary_email,c.primary_phone from public.crm_contacts c join public.crm_contact_roles r on r.contact_id=c.id and r.organization_id=c.organization_id where ${where} order by c.display_name limit $${values.length - 1} offset $${values.length}`,
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
export async function listKafalahBeneficiaries(
  context: RequestContext,
  query: KafalahListQuery,
) {
  requirePermission(context, "kafalah.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = [
      "c.organization_id=$1",
      "c.status='active'",
      "r.role_type='beneficiary'",
      "r.status='active'",
    ];
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(c.display_name ilike $${values.length} or c.primary_email ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(distinct c.id)::int total from public.crm_contacts c join public.crm_contact_roles r on r.contact_id=c.id and r.organization_id=c.organization_id where ${where}`,
      values,
    );
    const { limit, offset } = page(query);
    values.push(limit, offset);
    const rows = await client.query<Row>(
      `select distinct c.id,c.display_name,c.primary_email,c.primary_phone from public.crm_contacts c join public.crm_contact_roles r on r.contact_id=c.id and r.organization_id=c.organization_id where ${where} order by c.display_name limit $${values.length - 1} offset $${values.length}`,
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
export const listKafalahNeeds = (
  context: RequestContext,
  query: KafalahListQuery,
) =>
  listRows(
    context,
    query,
    "n",
    `select n.*,c.display_name beneficiary_name from public.kafalah_needs n join public.crm_contacts c on c.id=n.beneficiary_contact_id and c.organization_id=n.organization_id`,
    `(n.reference_number ilike ? or n.title ilike ?)`,
  );
export const listKafalahMatches = (
  context: RequestContext,
  query: KafalahListQuery,
) =>
  listRows(
    context,
    query,
    "m",
    `select m.*,n.reference_number need_reference,n.title need_title,s.display_name sponsor_name,b.display_name beneficiary_name from public.kafalah_matches m join public.kafalah_needs n on n.id=m.need_id and n.organization_id=m.organization_id join public.crm_contacts s on s.id=m.sponsor_contact_id and s.organization_id=m.organization_id join public.crm_contacts b on b.id=n.beneficiary_contact_id and b.organization_id=n.organization_id`,
    `(m.reference_number ilike ? or n.title ilike ?)`,
  );
export const listKafalahContracts = (
  context: RequestContext,
  query: KafalahListQuery,
) =>
  listRows(
    context,
    query,
    "c",
    `select c.*,m.reference_number match_reference,s.display_name sponsor_name,b.display_name beneficiary_name from public.kafalah_contracts c join public.kafalah_matches m on m.id=c.match_id and m.organization_id=c.organization_id join public.kafalah_needs n on n.id=m.need_id and n.organization_id=m.organization_id join public.crm_contacts s on s.id=m.sponsor_contact_id and s.organization_id=m.organization_id join public.crm_contacts b on b.id=n.beneficiary_contact_id and b.organization_id=n.organization_id`,
    `(c.reference_number ilike ? or s.display_name ilike ? or b.display_name ilike ?)`,
  );

export async function createKafalahNeed(
  context: RequestContext,
  input: CreateKafalahNeedInput,
) {
  requirePermission(context, "kafalah_needs.manage");
  return withTenantTransaction(context, async (database, client) => {
    const beneficiary = await client.query(
      `select 1 from public.crm_contacts c join public.crm_contact_roles r on r.contact_id=c.id and r.organization_id=c.organization_id where c.id=$1 and c.organization_id=$2 and c.status='active' and r.role_type='beneficiary' and r.status='active'`,
      [input.beneficiary_contact_id, context.organizationId],
    );
    if (!beneficiary.rows[0])
      missing("Penerima manfaat aktif tidak ditemukan.");
    const result = await client.query<Row>(
      `insert into public.kafalah_needs (organization_id,reference_number,beneficiary_contact_id,case_id,need_type,title,description,approved_amount,currency,period_months,created_by,updated_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) returning *`,
      [
        context.organizationId,
        reference("KFN"),
        input.beneficiary_contact_id,
        input.case_id ?? null,
        input.need_type,
        input.title,
        input.description,
        input.approved_amount,
        input.currency,
        input.period_months,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await event(client, context, "kafalah_need", record.id, "created", record);
    await insertAuditEvent(database, context, {
      action: "kafalah.need_created",
      after: record,
      entityId: record.id,
      entityType: "kafalah_need",
    });
    return record;
  });
}
export async function approveKafalahNeed(context: RequestContext, id: string) {
  requirePermission(context, "kafalah_needs.approve");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.kafalah_needs where id=$1 and organization_id=$2 for update`,
      [id, context.organizationId],
    );
    const need =
      current.rows[0] ?? missing("Kebutuhan Kafalah tidak ditemukan.");
    try {
      assertIndependentActor({
        actorId: context.profileId,
        makerId: String(need.created_by),
        operation: "Approval kebutuhan",
      });
    } catch (error) {
      translateRule(error, "FORBIDDEN");
    }
    try {
      assertKafalahNeedTransition(String(need.status), "approved");
    } catch (error) {
      translateRule(error, "INVALID_STATE");
    }
    const updated = await client.query<Row>(
      `update public.kafalah_needs set status='approved',approved_by=$1,approved_at=now(),updated_by=$1 where id=$2 and organization_id=$3 returning *`,
      [context.profileId, id, context.organizationId],
    );
    await event(client, context, "kafalah_need", id, "approved");
    await insertAuditEvent(database, context, {
      action: "kafalah.need_approved",
      before: need,
      after: updated.rows[0],
      entityId: id,
      entityType: "kafalah_need",
    });
    return updated.rows[0]!;
  });
}
export async function createKafalahMatch(
  context: RequestContext,
  input: CreateKafalahMatchInput,
) {
  requirePermission(context, "kafalah_matches.manage");
  return withTenantTransaction(context, async (database, client) => {
    const sponsor = await client.query(
      `select 1 from public.crm_contacts c join public.crm_contact_roles r on r.contact_id=c.id and r.organization_id=c.organization_id where c.id=$1 and c.organization_id=$2 and c.status='active' and r.role_type='kafil' and r.status='active'`,
      [input.sponsor_contact_id, context.organizationId],
    );
    if (!sponsor.rows[0]) missing("Kafil aktif tidak ditemukan.");
    const need = await client.query<Row>(
      `select * from public.kafalah_needs where id=$1 and organization_id=$2 for update`,
      [input.need_id, context.organizationId],
    );
    if (!need.rows[0]) missing("Kebutuhan approved tidak ditemukan.");
    const reserved = await client.query<Row>(
      `update public.kafalah_needs set matched_amount=matched_amount+$1,status=case when matched_amount+$1=approved_amount then 'matched' else status end,updated_by=$2 where id=$3 and organization_id=$4 and status in ('approved','matched') and approved_amount-matched_amount >= $1 returning *`,
      [
        input.matched_amount,
        context.profileId,
        input.need_id,
        context.organizationId,
      ],
    );
    if (!reserved.rows[0])
      throw new DomainError(
        "CONFLICT",
        "Matching melebihi kebutuhan yang telah disetujui.",
        409,
      );
    const result = await client.query<Row>(
      `insert into public.kafalah_matches (organization_id,reference_number,need_id,sponsor_contact_id,matched_amount,start_date,end_date,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [
        context.organizationId,
        reference("KFM"),
        input.need_id,
        input.sponsor_contact_id,
        input.matched_amount,
        input.start_date,
        input.end_date,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await event(
      client,
      context,
      "kafalah_match",
      record.id,
      "proposed",
      record,
    );
    await insertAuditEvent(database, context, {
      action: "kafalah.match_created",
      after: record,
      entityId: record.id,
      entityType: "kafalah_match",
    });
    return record;
  });
}
export async function createKafalahContract(
  context: RequestContext,
  input: CreateKafalahContractInput,
) {
  requirePermission(context, "kafalah_contracts.manage");
  return withTenantTransaction(context, async (database, client) => {
    const match = await client.query<Row>(
      `select * from public.kafalah_matches where id=$1 and organization_id=$2 and status='proposed'`,
      [input.match_id, context.organizationId],
    );
    const proposedMatch = match.rows[0];
    if (!proposedMatch) {
      throw new DomainError("NOT_FOUND", "Matching proposed tidak ditemukan.", 404);
    }
    try {
      buildInstallments({
        endDate: input.end_date,
        frequency: input.frequency,
        periodicAmount: input.periodic_amount,
        startDate: input.start_date,
        totalAmount: String(proposedMatch.matched_amount),
      });
    } catch (e) {
      translateRule(e);
    }
    const result = await client.query<Row>(
      `insert into public.kafalah_contracts (organization_id,reference_number,match_id,frequency,periodic_amount,start_date,end_date,terms,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [
        context.organizationId,
        reference("KFC"),
        input.match_id,
        input.frequency,
        input.periodic_amount,
        input.start_date,
        input.end_date,
        input.terms,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await event(
      client,
      context,
      "kafalah_contract",
      record.id,
      "created",
      record,
    );
    await insertAuditEvent(database, context, {
      action: "kafalah.contract_created",
      after: record,
      entityId: record.id,
      entityType: "kafalah_contract",
    });
    return record;
  });
}
export async function activateKafalahContract(
  context: RequestContext,
  id: string,
) {
  requirePermission(context, "kafalah_contracts.manage");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select c.*,m.matched_amount,m.status match_status,m.created_by match_created_by from public.kafalah_contracts c join public.kafalah_matches m on m.id=c.match_id and m.organization_id=c.organization_id where c.id=$1 and c.organization_id=$2 for update of c,m`,
      [id, context.organizationId],
    );
    const contract =
      current.rows[0] ?? missing("Kontrak Kafalah tidak ditemukan.");
    if (contract.status !== "draft" || contract.match_status !== "proposed")
      throw new DomainError(
        "INVALID_STATE",
        "Kontrak atau matching tidak siap diaktifkan.",
        409,
      );
    try {
      assertIndependentActor({
        actorId: context.profileId,
        makerId: String(contract.created_by),
        operation: "Aktivasi kontrak",
      });
    } catch (e) {
      translateRule(e, "FORBIDDEN");
    }
    const installments = buildInstallments({
      endDate: String(contract.end_date),
      frequency: contract.frequency as "monthly" | "quarterly" | "one_time",
      periodicAmount: String(contract.periodic_amount),
      startDate: String(contract.start_date),
      totalAmount: String(contract.matched_amount),
    });
    for (const item of installments)
      await client.query(
        `insert into public.kafalah_schedules (organization_id,contract_id,installment_number,due_date,amount) values ($1,$2,$3,$4,$5)`,
        [
          context.organizationId,
          id,
          item.installmentNumber,
          item.dueDate,
          item.amount,
        ],
      );
    await client.query(
      `update public.kafalah_matches set status='active',activated_by=$1,activated_at=now() where id=$2 and organization_id=$3`,
      [context.profileId, contract.match_id, context.organizationId],
    );
    const updated = await client.query<Row>(
      `update public.kafalah_contracts set status='active',activated_by=$1,activated_at=now() where id=$2 and organization_id=$3 returning *`,
      [context.profileId, id, context.organizationId],
    );
    await event(client, context, "kafalah_contract", id, "activated", {
      installments: installments.length,
    });
    await insertAuditEvent(database, context, {
      action: "kafalah.contract_activated",
      before: contract,
      after: updated.rows[0],
      entityId: id,
      entityType: "kafalah_contract",
    });
    return updated.rows[0]!;
  });
}

export async function getKafalahContract(context: RequestContext, id: string) {
  requirePermission(context, "kafalah.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `select c.*,m.reference_number match_reference,m.matched_amount,s.display_name sponsor_name,b.display_name beneficiary_name,n.title need_title from public.kafalah_contracts c join public.kafalah_matches m on m.id=c.match_id and m.organization_id=c.organization_id join public.kafalah_needs n on n.id=m.need_id and n.organization_id=m.organization_id join public.crm_contacts s on s.id=m.sponsor_contact_id and s.organization_id=m.organization_id join public.crm_contacts b on b.id=n.beneficiary_contact_id and b.organization_id=n.organization_id where c.id=$1 and c.organization_id=$2`,
      [id, context.organizationId],
    );
    const contract =
      result.rows[0] ?? missing("Kontrak Kafalah tidak ditemukan.");
    const [schedules, payments, distributions, monitoring, renewals, events] =
      await Promise.all([
        client.query<Row>(
          `select * from public.kafalah_schedules where contract_id=$1 and organization_id=$2 order by installment_number`,
          [id, context.organizationId],
        ),
        client.query<Row>(
          `select payment.* from public.kafalah_payments payment join public.kafalah_schedules schedule on schedule.id=payment.schedule_id and schedule.organization_id=payment.organization_id where schedule.contract_id=$1 and payment.organization_id=$2 order by payment.paid_at desc`,
          [id, context.organizationId],
        ),
        client.query<Row>(
          `select distribution.* from public.kafalah_distributions distribution join public.kafalah_schedules schedule on schedule.id=distribution.schedule_id and schedule.organization_id=distribution.organization_id where schedule.contract_id=$1 and distribution.organization_id=$2 order by distribution.distributed_at desc`,
          [id, context.organizationId],
        ),
        client.query<Row>(
          `select * from public.kafalah_monitoring_reports where contract_id=$1 and organization_id=$2 order by period_end desc`,
          [id, context.organizationId],
        ),
        client.query<Row>(
          `select * from public.kafalah_renewals where contract_id=$1 and organization_id=$2 order by requested_at desc`,
          [id, context.organizationId],
        ),
        client.query<Row>(
          `select * from public.kafalah_events where entity_id=$1 and organization_id=$2 order by created_at desc`,
          [id, context.organizationId],
        ),
      ]);
    return {
      ...contract,
      schedules: schedules.rows,
      payments: payments.rows,
      distributions: distributions.rows,
      monitoring_reports: monitoring.rows,
      renewals: renewals.rows,
      events: events.rows,
    };
  });
}

export async function postKafalahPayment(
  context: RequestContext,
  scheduleId: string,
  input: KafalahPaymentInput,
  key: string,
) {
  requirePermission(context, "kafalah_payments.post");
  return idempotent(
    context,
    key,
    "kafalah.payment",
    { scheduleId, input },
    async (database, client) => {
      const schedule = await client.query<Row>(
        `select s.*,c.status contract_status from public.kafalah_schedules s join public.kafalah_contracts c on c.id=s.contract_id and c.organization_id=s.organization_id where s.id=$1 and s.organization_id=$2 for update of s`,
        [scheduleId, context.organizationId],
      );
      const current =
        schedule.rows[0] ?? missing("Jadwal Kafalah tidak ditemukan.");
      if (current.contract_status !== "active")
        throw new DomainError(
          "INVALID_STATE",
          "Kontrak Kafalah tidak aktif.",
          409,
        );
      const updated = await client.query<Row>(
        `update public.kafalah_schedules set paid_amount=paid_amount+$1,status=case when paid_amount+$1=amount then 'paid' else status end where id=$2 and organization_id=$3 and amount-paid_amount >= $1 returning *`,
        [input.amount, scheduleId, context.organizationId],
      );
      if (!updated.rows[0])
        throw new DomainError(
          "CONFLICT",
          "Pembayaran melebihi nilai jadwal.",
          409,
        );
      const result = await client.query<Row>(
        `insert into public.kafalah_payments (organization_id,schedule_id,payment_reference,amount,paid_at,channel,created_by) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [
          context.organizationId,
          scheduleId,
          input.payment_reference,
          input.amount,
          input.paid_at,
          input.channel,
          context.profileId,
        ],
      );
      const record = result.rows[0]!;
      await event(
        client,
        context,
        "kafalah_contract",
        String(current.contract_id),
        "payment_received",
        record,
      );
      await insertAuditEvent(database, context, {
        action: "kafalah.payment_received",
        after: record,
        entityId: record.id,
        entityType: "kafalah_payment",
      });
      return record;
    },
  );
}
export async function recordKafalahDistribution(
  context: RequestContext,
  scheduleId: string,
  input: KafalahDistributionInput,
  key: string,
) {
  requirePermission(context, "kafalah_distributions.record");
  return idempotent(
    context,
    key,
    "kafalah.distribution",
    { scheduleId, input },
    async (database, client) => {
      const payment = await client.query<Row>(
        `select * from public.kafalah_payments where id=$1 and schedule_id=$2 and organization_id=$3 and status='received' for update`,
        [input.payment_id, scheduleId, context.organizationId],
      );
      const paid =
        payment.rows[0] ?? missing("Pembayaran sponsor tidak ditemukan.");
      try {
        assertIndependentActor({
          actorId: context.profileId,
          makerId: String(paid.created_by),
          operation: "Distribusi Kafalah",
        });
      } catch (e) {
        translateRule(e, "FORBIDDEN");
      }
      const hasPaymentCapacity = await client.query(
        `select 1
           from public.kafalah_payments payment
          where payment.id=$1
            and payment.organization_id=$2
            and payment.amount - (
              select coalesce(sum(distribution.amount),0)
                from public.kafalah_distributions distribution
               where distribution.payment_id=payment.id
                 and distribution.organization_id=payment.organization_id
                 and distribution.status='completed'
            ) >= $3::numeric`,
        [input.payment_id, context.organizationId, input.amount],
      );
      if (!hasPaymentCapacity.rows[0])
        throw new DomainError(
          "CONFLICT",
          "Distribusi melebihi pembayaran sponsor.",
          409,
        );
      const updated = await client.query<Row>(
        `update public.kafalah_schedules set distributed_amount=distributed_amount+$1,status=case when distributed_amount+$1=amount then 'distributed' else status end where id=$2 and organization_id=$3 and paid_amount-distributed_amount >= $1 returning *`,
        [input.amount, scheduleId, context.organizationId],
      );
      if (!updated.rows[0])
        throw new DomainError(
          "CONFLICT",
          "Distribusi melebihi saldo jadwal terbayar.",
          409,
        );
      const result = await client.query<Row>(
        `insert into public.kafalah_distributions (organization_id,schedule_id,payment_id,amount,distributed_at,method,confirmation_notes,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [
          context.organizationId,
          scheduleId,
          input.payment_id,
          input.amount,
          input.distributed_at,
          input.method,
          input.confirmation_notes,
          context.profileId,
        ],
      );
      const record = result.rows[0]!;
      await event(
        client,
        context,
        "kafalah_contract",
        String(updated.rows[0]!.contract_id),
        "distributed",
        record,
      );
      await insertAuditEvent(database, context, {
        action: "kafalah.distributed",
        after: record,
        entityId: record.id,
        entityType: "kafalah_distribution",
      });
      return record;
    },
  );
}

export async function submitKafalahMonitoring(
  context: RequestContext,
  contractId: string,
  input: KafalahMonitoringInput,
) {
  requirePermission(context, "kafalah_monitoring.manage");
  return withTenantTransaction(context, async (database, client) => {
    const contract = await client.query(
      `select 1 from public.kafalah_contracts where id=$1 and organization_id=$2 and status='active'`,
      [contractId, context.organizationId],
    );
    if (!contract.rows[0]) missing("Kontrak Kafalah aktif tidak ditemukan.");
    const result = await client.query<Row>(
      `insert into public.kafalah_monitoring_reports (organization_id,contract_id,period_start,period_end,outcome,summary,submitted_by) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [
        context.organizationId,
        contractId,
        input.period_start,
        input.period_end,
        input.outcome,
        input.summary,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await event(
      client,
      context,
      "kafalah_contract",
      contractId,
      "monitoring_submitted",
      { monitoringId: record.id },
    );
    await insertAuditEvent(database, context, {
      action: "kafalah.monitoring_submitted",
      after: record,
      entityId: record.id,
      entityType: "kafalah_monitoring",
    });
    return record;
  });
}
export async function decideKafalahMonitoring(
  context: RequestContext,
  id: string,
  input: KafalahMonitoringDecisionInput,
) {
  requirePermission(context, "kafalah_monitoring.verify");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.kafalah_monitoring_reports where id=$1 and organization_id=$2 for update`,
      [id, context.organizationId],
    );
    const report =
      current.rows[0] ?? missing("Monitoring Kafalah tidak ditemukan.");
    if (report.status !== "submitted")
      throw new DomainError(
        "INVALID_STATE",
        "Monitoring sudah diputuskan.",
        409,
      );
    try {
      assertIndependentActor({
        actorId: context.profileId,
        makerId: String(report.submitted_by),
        operation: "Verifikasi monitoring",
      });
    } catch (e) {
      translateRule(e, "FORBIDDEN");
    }
    const updated = await client.query<Row>(
      `update public.kafalah_monitoring_reports set status=$1,verified_by=$2,verified_at=now(),verification_notes=$3 where id=$4 and organization_id=$5 returning *`,
      [
        input.decision,
        context.profileId,
        input.notes,
        id,
        context.organizationId,
      ],
    );
    await event(
      client,
      context,
      "kafalah_contract",
      String(report.contract_id),
      `monitoring_${input.decision}`,
      { monitoringId: id },
    );
    await insertAuditEvent(database, context, {
      action: `kafalah.monitoring_${input.decision}`,
      before: report,
      after: updated.rows[0],
      entityId: id,
      entityType: "kafalah_monitoring",
    });
    return updated.rows[0]!;
  });
}
export async function requestKafalahRenewal(
  context: RequestContext,
  contractId: string,
  input: KafalahRenewalInput,
) {
  requirePermission(context, "kafalah_renewals.manage");
  return withTenantTransaction(context, async (database, client) => {
    const contract = await client.query(
      `select 1 from public.kafalah_contracts where id=$1 and organization_id=$2 and status in ('active','completed')`,
      [contractId, context.organizationId],
    );
    if (!contract.rows[0]) missing("Kontrak Kafalah tidak dapat diperpanjang.");
    const result = await client.query<Row>(
      `insert into public.kafalah_renewals (organization_id,contract_id,requested_start_date,requested_end_date,periodic_amount,reason,requested_by) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [
        context.organizationId,
        contractId,
        input.requested_start_date,
        input.requested_end_date,
        input.periodic_amount,
        input.reason,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await event(
      client,
      context,
      "kafalah_contract",
      contractId,
      "renewal_requested",
      { renewalId: record.id },
    );
    await insertAuditEvent(database, context, {
      action: "kafalah.renewal_requested",
      after: record,
      entityId: record.id,
      entityType: "kafalah_renewal",
    });
    return record;
  });
}
export async function decideKafalahRenewal(
  context: RequestContext,
  id: string,
  input: KafalahRenewalDecisionInput,
) {
  requirePermission(context, "kafalah_renewals.decide");
  return withTenantTransaction(context, async (database, client) => {
    const current = await client.query<Row>(
      `select * from public.kafalah_renewals where id=$1 and organization_id=$2 for update`,
      [id, context.organizationId],
    );
    const renewal =
      current.rows[0] ?? missing("Renewal Kafalah tidak ditemukan.");
    if (renewal.status !== "requested")
      throw new DomainError("INVALID_STATE", "Renewal sudah diputuskan.", 409);
    try {
      assertIndependentActor({
        actorId: context.profileId,
        makerId: String(renewal.requested_by),
        operation: "Keputusan renewal",
      });
    } catch (e) {
      translateRule(e, "FORBIDDEN");
    }
    const updated = await client.query<Row>(
      `update public.kafalah_renewals set status=$1,decided_by=$2,decided_at=now(),decision_notes=$3 where id=$4 and organization_id=$5 returning *`,
      [
        input.decision,
        context.profileId,
        input.notes,
        id,
        context.organizationId,
      ],
    );
    await event(
      client,
      context,
      "kafalah_contract",
      String(renewal.contract_id),
      `renewal_${input.decision}`,
      { renewalId: id },
    );
    await insertAuditEvent(database, context, {
      action: `kafalah.renewal_${input.decision}`,
      before: renewal,
      after: updated.rows[0],
      entityId: id,
      entityType: "kafalah_renewal",
    });
    return updated.rows[0]!;
  });
}
