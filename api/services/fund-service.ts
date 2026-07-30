import { createHash } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import { DomainError } from "../domain/errors";
import { assertRestrictionCompatibility } from "../domain/fund-rules";
import type {
  CreateFundAllocationInput,
  CreateFundCommitmentInput,
  CreateFundReconciliationInput,
  CreateFundRestrictionInput,
  FundListQuery,
  PostFundDisbursementInput,
  PostFundReceiptInput,
  ReverseFundTransactionInput,
} from "../routes/fund-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function reference(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function notFound(message: string): never {
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
  operation: (
    database: TenantDatabase,
    client: PoolClient,
  ) => Promise<T>,
): Promise<T> {
  return withTenantTransaction(context, async (database, client) => {
    const requestHash = hashRequest(command, input);
    const inserted = await client.query<Row>(
      `
        insert into public.fund_idempotency_records (
          organization_id, idempotency_key, command_type,
          request_hash, status, created_by
        ) values ($1, $2, $3, $4, 'processing', $5)
        on conflict (organization_id, idempotency_key) do nothing
        returning *
      `,
      [
        context.organizationId,
        key,
        command,
        requestHash,
        context.profileId,
      ],
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
          from public.fund_idempotency_records
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
          "Idempotency-Key telah digunakan untuk permintaan berbeda.",
          409,
        );
      }
      if (record.status === "completed" && record.response_snapshot) {
        return record.response_snapshot;
      }
      throw new DomainError(
        "CONFLICT",
        "Permintaan dengan Idempotency-Key ini masih diproses.",
        409,
      );
    }

    const result = await operation(database, client);
    await client.query(
      `
        update public.fund_idempotency_records
        set status = 'completed', response_snapshot = $1, completed_at = now()
        where organization_id = $2 and idempotency_key = $3
      `,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

async function lockRestriction(
  client: PoolClient,
  context: RequestContext,
  restrictionId: string,
): Promise<Row> {
  const result = await client.query<Row>(
    `
      select * from public.fund_restrictions
      where id = $1 and organization_id = $2
      for update
    `,
    [restrictionId, context.organizationId],
  );
  const restriction =
    result.rows[0] ?? notFound("Pembatasan dana tidak ditemukan.");
  if (restriction.status !== "active") {
    throw new DomainError(
      "INVALID_STATE",
      "Pembatasan dana tidak aktif.",
      409,
    );
  }
  return restriction;
}

async function restrictionBalance(
  client: PoolClient,
  context: RequestContext,
  restrictionId: string,
) {
  const result = await client.query<{
    allocated: string;
    available: string;
    cash_balance: string;
    disbursed: string;
  }>(
    `
      select
        coalesce(sum(available_delta), 0)::numeric(20,2)::text as available,
        coalesce(sum(allocated_delta), 0)::numeric(20,2)::text as allocated,
        coalesce(sum(disbursed_delta), 0)::numeric(20,2)::text as disbursed,
        coalesce(sum(available_delta + allocated_delta), 0)::numeric(20,2)::text as cash_balance
      from public.fund_ledger_entries
      where organization_id = $1 and restriction_id = $2
    `,
    [context.organizationId, restrictionId],
  );
  return result.rows[0]!;
}

async function insertLedger(
  client: PoolClient,
  context: RequestContext,
  values: {
    allocatedDelta?: string;
    allocationId?: string | null;
    availableDelta?: string;
    currency: string;
    disbursedDelta?: string;
    entryType: string;
    programId?: string | null;
    restrictionId: string;
    sourceId: string;
    sourceType: string;
  },
) {
  await client.query(
    `
      insert into public.fund_ledger_entries (
        organization_id, entry_number, entry_type, restriction_id,
        program_id, allocation_id, source_type, source_id, currency,
        available_delta, allocated_delta, disbursed_delta,
        actor_profile_id, request_id
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10::numeric, $11::numeric, $12::numeric, $13, $14
      )
    `,
    [
      context.organizationId,
      reference("LED"),
      values.entryType,
      values.restrictionId,
      values.programId ?? null,
      values.allocationId ?? null,
      values.sourceType,
      values.sourceId,
      values.currency,
      values.availableDelta ?? "0",
      values.allocatedDelta ?? "0",
      values.disbursedDelta ?? "0",
      context.profileId,
      context.requestId,
    ],
  );
}

async function updateCommitmentStatus(
  client: PoolClient,
  context: RequestContext,
  commitmentId: string,
) {
  await client.query(
    `
      update public.fund_commitments commitment
      set status = case
        when received.total >= commitment.amount then 'fulfilled'
        when received.total > 0 then 'partially_received'
        else 'active'
      end,
      updated_at = now(),
      updated_by = $1
      from (
        select coalesce(sum(amount) filter (where status = 'posted'), 0) as total
        from public.fund_receipts
        where commitment_id = $2 and organization_id = $3
      ) received
      where commitment.id = $2 and commitment.organization_id = $3
    `,
    [context.profileId, commitmentId, context.organizationId],
  );
}

async function listTable(
  context: RequestContext,
  query: FundListQuery,
  options: {
    joins?: string;
    permission: string;
    searchColumns: string[];
    select: string;
    table: string;
  },
) {
  requirePermission(context, options.permission);
  return withTenantTransaction(context, async (_database, client) => {
    const alias = "record";
    const values: unknown[] = [context.organizationId];
    const filters = [`${alias}.organization_id = $1`];
    if (query.status) {
      values.push(query.status);
      filters.push(`${alias}.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(${options.searchColumns
          .map((column) => `${column} ilike $${values.length}`)
          .join(" or ")})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.${options.table} ${alias} ${options.joins ?? ""} where ${where}`,
      values,
    );
    values.push(query.pageSize, (query.page - 1) * query.pageSize);
    const rows = await client.query<Row>(
      `
        select ${options.select}
        from public.${options.table} ${alias}
        ${options.joins ?? ""}
        where ${where}
        order by record.created_at desc
        limit $${values.length - 1} offset $${values.length}
      `,
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

export async function getFundOverview(context: RequestContext) {
  requirePermission(context, "fund_ledger.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `
        select restriction.*,
          program.name as program_name,
          coalesce(sum(ledger.available_delta), 0)::numeric(20,2)::text as available_balance,
          coalesce(sum(ledger.allocated_delta), 0)::numeric(20,2)::text as allocated_balance,
          coalesce(sum(ledger.disbursed_delta), 0)::numeric(20,2)::text as disbursed_total,
          coalesce(sum(ledger.available_delta + ledger.allocated_delta), 0)::numeric(20,2)::text as cash_balance
        from public.fund_restrictions restriction
        left join public.programs program
          on program.id = restriction.program_id
         and program.organization_id = restriction.organization_id
        left join public.fund_ledger_entries ledger
          on ledger.restriction_id = restriction.id
         and ledger.organization_id = restriction.organization_id
        where restriction.organization_id = $1
        group by restriction.id, program.name
        order by restriction.name
      `,
      [context.organizationId],
    );
    return result.rows;
  });
}

export const listFundRestrictions = (
  context: RequestContext,
  query: FundListQuery,
) =>
  listTable(context, query, {
    permission: "fund_restrictions.read",
    searchColumns: ["record.code", "record.name"],
    select: "record.*, program.name as program_name",
    table: "fund_restrictions",
    joins:
      "left join public.programs program on program.id = record.program_id and program.organization_id = record.organization_id",
  });

export async function createFundRestriction(
  context: RequestContext,
  input: CreateFundRestrictionInput,
) {
  requirePermission(context, "fund_restrictions.manage");
  return withTenantTransaction(context, async (database, client) => {
    const result = await client.query<Row>(
      `
        insert into public.fund_restrictions (
          organization_id, code, name, restriction_type,
          program_id, currency, created_by, updated_by
        ) values ($1, upper($2), $3, $4, $5, $6, $7, $7)
        returning *
      `,
      [
        context.organizationId,
        input.code,
        input.name,
        input.restriction_type,
        input.program_id ?? null,
        input.currency,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "fund_restriction.created",
      after: record,
      entityId: record.id,
      entityType: "fund_restriction",
    });
    return record;
  });
}

export const listFundCommitments = (
  context: RequestContext,
  query: FundListQuery,
) =>
  listTable(context, query, {
    permission: "fund_commitments.read",
    searchColumns: ["record.reference_number", "donor.display_name"],
    select:
      "record.*, restriction.name as restriction_name, donor.display_name as donor_name",
    table: "fund_commitments",
    joins: `
      join public.fund_restrictions restriction
        on restriction.id = record.restriction_id and restriction.organization_id = record.organization_id
      left join public.crm_contacts donor
        on donor.id = record.donor_contact_id and donor.organization_id = record.organization_id
    `,
  });

export async function createFundCommitment(
  context: RequestContext,
  input: CreateFundCommitmentInput,
) {
  requirePermission(context, "fund_commitments.manage");
  return withTenantTransaction(context, async (database, client) => {
    const restriction = await lockRestriction(
      client,
      context,
      input.restriction_id,
    );
    if (restriction.currency !== input.currency) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Mata uang commitment berbeda dari pembatasan dana.",
        400,
      );
    }
    const result = await client.query<Row>(
      `
        insert into public.fund_commitments (
          organization_id, reference_number, donor_contact_id,
          restriction_id, amount, currency, committed_at,
          expected_at, notes, created_by, updated_by
        ) values ($1, $2, $3, $4, $5::numeric, $6, $7, $8, $9, $10, $10)
        returning *
      `,
      [
        context.organizationId,
        reference("COM"),
        input.donor_contact_id ?? null,
        input.restriction_id,
        input.amount,
        input.currency,
        input.committed_at,
        input.expected_at ?? null,
        input.notes ?? null,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "fund_commitment.created",
      after: record,
      entityId: record.id,
      entityType: "fund_commitment",
    });
    return record;
  });
}

export const listFundReceipts = (
  context: RequestContext,
  query: FundListQuery,
) =>
  listTable(context, query, {
    permission: "fund_receipts.read",
    searchColumns: ["record.reference_number", "record.external_reference"],
    select:
      "record.*, restriction.name as restriction_name, donor.display_name as donor_name",
    table: "fund_receipts",
    joins: `
      join public.fund_restrictions restriction
        on restriction.id = record.restriction_id and restriction.organization_id = record.organization_id
      left join public.crm_contacts donor
        on donor.id = record.donor_contact_id and donor.organization_id = record.organization_id
    `,
  });

export async function postFundReceipt(
  context: RequestContext,
  input: PostFundReceiptInput,
  idempotencyKey: string,
) {
  requirePermission(context, "fund_receipts.post");
  return runIdempotent(
    context,
    idempotencyKey,
    "fund_receipt.post",
    input,
    async (database, client) => {
      const restriction = await lockRestriction(
        client,
        context,
        input.restriction_id,
      );
      if (restriction.currency !== input.currency) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Mata uang receipt berbeda dari pembatasan dana.",
          400,
        );
      }
      if (input.commitment_id) {
        const commitmentResult = await client.query<Row>(
          `
            select commitment.*
            from public.fund_commitments commitment
            where commitment.id = $1 and commitment.organization_id = $2
            for update
          `,
          [input.commitment_id, context.organizationId],
        );
        const commitment =
          commitmentResult.rows[0] ?? notFound("Commitment tidak ditemukan.");
        if (
          commitment.restriction_id !== input.restriction_id ||
          commitment.currency !== input.currency
        ) {
          throw new DomainError(
            "VALIDATION_ERROR",
            "Receipt tidak sesuai dengan commitment.",
            400,
          );
        }
        const outstanding = await client.query<{ amount: string }>(
          `
            select (
              $1::numeric -
              coalesce(sum(amount) filter (where status = 'posted'), 0)
            )::numeric(20,2)::text as amount
            from public.fund_receipts
            where commitment_id = $2 and organization_id = $3
          `,
          [
            commitment.amount,
            input.commitment_id,
            context.organizationId,
          ],
        );
        const sufficient = await client.query<{ allowed: boolean }>(
          "select $1::numeric <= $2::numeric as allowed",
          [input.amount, outstanding.rows[0]?.amount ?? "0"],
        );
        if (!sufficient.rows[0]?.allowed) {
          throw new DomainError(
            "CONFLICT",
            "Receipt melebihi sisa commitment.",
            409,
          );
        }
      }
      const result = await client.query<Row>(
        `
          insert into public.fund_receipts (
            organization_id, reference_number, commitment_id,
            restriction_id, donor_contact_id, amount, currency,
            received_at, payment_method, external_reference, created_by
          ) values ($1, $2, $3, $4, $5, $6::numeric, $7, $8, $9, $10, $11)
          returning *
        `,
        [
          context.organizationId,
          reference("RCT"),
          input.commitment_id ?? null,
          input.restriction_id,
          input.donor_contact_id ?? null,
          input.amount,
          input.currency,
          input.received_at,
          input.payment_method,
          input.external_reference ?? null,
          context.profileId,
        ],
      );
      const record = result.rows[0]!;
      await insertLedger(client, context, {
        availableDelta: input.amount,
        currency: input.currency,
        entryType: "receipt_posted",
        restrictionId: input.restriction_id,
        sourceId: record.id,
        sourceType: "receipt",
      });
      if (input.commitment_id) {
        await updateCommitmentStatus(
          client,
          context,
          input.commitment_id,
        );
      }
      await insertAuditEvent(database, context, {
        action: "fund_receipt.posted",
        after: record,
        entityId: record.id,
        entityType: "fund_receipt",
      });
      return record;
    },
  );
}

export const listFundAllocations = (
  context: RequestContext,
  query: FundListQuery,
) =>
  listTable(context, query, {
    permission: "fund_allocations.read",
    searchColumns: ["record.reference_number", "record.purpose"],
    select:
      "record.*, restriction.name as restriction_name, program.name as program_name",
    table: "fund_allocations",
    joins: `
      join public.fund_restrictions restriction
        on restriction.id = record.restriction_id and restriction.organization_id = record.organization_id
      join public.programs program
        on program.id = record.program_id and program.organization_id = record.organization_id
    `,
  });

export async function getFundAllocation(
  context: RequestContext,
  allocationId: string,
) {
  requirePermission(context, "fund_allocations.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `
        select allocation.*, restriction.name as restriction_name,
          restriction.restriction_type, restriction.program_id as restriction_program_id,
          program.name as program_name,
          coalesce(sum(ledger.allocated_delta), 0)::numeric(20,2)::text as remaining_amount,
          (
            select request.id
            from public.approval_requests request
            where request.organization_id = allocation.organization_id
              and request.subject_type = 'fund_allocation'
              and request.subject_id = allocation.id
            order by request.created_at desc
            limit 1
          ) as approval_request_id,
          (
            select request.status
            from public.approval_requests request
            where request.organization_id = allocation.organization_id
              and request.subject_type = 'fund_allocation'
              and request.subject_id = allocation.id
            order by request.created_at desc
            limit 1
          ) as approval_status
        from public.fund_allocations allocation
        join public.fund_restrictions restriction
          on restriction.id = allocation.restriction_id
         and restriction.organization_id = allocation.organization_id
        join public.programs program
          on program.id = allocation.program_id
         and program.organization_id = allocation.organization_id
        left join public.fund_ledger_entries ledger
          on ledger.allocation_id = allocation.id
         and ledger.organization_id = allocation.organization_id
        where allocation.id = $1 and allocation.organization_id = $2
        group by allocation.id, restriction.id, program.name
      `,
      [allocationId, context.organizationId],
    );
    return result.rows[0] ?? notFound("Alokasi dana tidak ditemukan.");
  });
}

export async function createFundAllocation(
  context: RequestContext,
  input: CreateFundAllocationInput,
) {
  requirePermission(context, "fund_allocations.manage");
  return withTenantTransaction(context, async (database, client) => {
    const restriction = await lockRestriction(
      client,
      context,
      input.restriction_id,
    );
    if (restriction.currency !== input.currency) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Mata uang alokasi berbeda dari pembatasan dana.",
        400,
      );
    }
    try {
      assertRestrictionCompatibility({
        allocationProgramId: input.program_id,
        restrictionProgramId: restriction.program_id
          ? String(restriction.program_id)
          : null,
        restrictionType: String(
          restriction.restriction_type,
        ) as "program" | "unrestricted",
      });
    } catch (error) {
      throw new DomainError(
        "VALIDATION_ERROR",
        error instanceof Error
          ? error.message
          : "Pembatasan dana tidak kompatibel.",
        400,
      );
    }
    const result = await client.query<Row>(
      `
        insert into public.fund_allocations (
          organization_id, reference_number, restriction_id,
          program_id, amount, currency, purpose, created_by, updated_by
        ) values ($1, $2, $3, $4, $5::numeric, $6, $7, $8, $8)
        returning *
      `,
      [
        context.organizationId,
        reference("ALC"),
        input.restriction_id,
        input.program_id,
        input.amount,
        input.currency,
        input.purpose,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertAuditEvent(database, context, {
      action: "fund_allocation.created",
      after: record,
      entityId: record.id,
      entityType: "fund_allocation",
    });
    return record;
  });
}

export async function activateFundAllocation(
  context: RequestContext,
  allocationId: string,
  idempotencyKey: string,
) {
  requirePermission(context, "fund_allocations.activate");
  return runIdempotent(
    context,
    idempotencyKey,
    "fund_allocation.activate",
    { allocationId },
    async (database, client) => {
      const allocationResult = await client.query<Row>(
        `
          select * from public.fund_allocations
          where id = $1 and organization_id = $2
          for update
        `,
        [allocationId, context.organizationId],
      );
      const allocation =
        allocationResult.rows[0] ?? notFound("Alokasi dana tidak ditemukan.");
      if (allocation.status !== "draft") {
        throw new DomainError(
          "INVALID_STATE",
          "Hanya alokasi draft yang dapat diaktifkan.",
          409,
        );
      }
      await lockRestriction(
        client,
        context,
        String(allocation.restriction_id),
      );
      const approved = await client.query(
        `
          select 1
          from public.approval_requests
          where organization_id = $1
            and subject_type = 'fund_allocation'
            and subject_id = $2
            and status = 'approved'
          limit 1
        `,
        [context.organizationId, allocationId],
      );
      if (!approved.rowCount) {
        throw new DomainError(
          "INVALID_STATE",
          "Alokasi memerlukan approval yang sudah selesai.",
          409,
        );
      }
      const balance = await restrictionBalance(
        client,
        context,
        String(allocation.restriction_id),
      );
      const sufficient = await client.query<{ allowed: boolean }>(
        "select $1::numeric <= $2::numeric as allowed",
        [allocation.amount, balance.available],
      );
      if (!sufficient.rows[0]?.allowed) {
        throw new DomainError(
          "INSUFFICIENT_FUNDS",
          "Saldo tersedia tidak mencukupi untuk alokasi.",
          409,
        );
      }
      await insertLedger(client, context, {
        allocatedDelta: String(allocation.amount),
        allocationId,
        availableDelta: `-${String(allocation.amount)}`,
        currency: String(allocation.currency),
        entryType: "allocation_approved",
        programId: String(allocation.program_id),
        restrictionId: String(allocation.restriction_id),
        sourceId: allocationId,
        sourceType: "allocation",
      });
      const updated = await client.query<Row>(
        `
          update public.fund_allocations
          set status = 'approved', activated_at = now(), activated_by = $1,
            updated_at = now(), updated_by = $1
          where id = $2 and organization_id = $3
          returning *
        `,
        [context.profileId, allocationId, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "fund_allocation.activated",
        after: updated.rows[0],
        before: allocation,
        entityId: allocationId,
        entityType: "fund_allocation",
      });
      return updated.rows[0]!;
    },
  );
}

export const listFundDisbursements = (
  context: RequestContext,
  query: FundListQuery,
) =>
  listTable(context, query, {
    permission: "fund_disbursements.read",
    searchColumns: [
      "record.reference_number",
      "record.external_reference",
      "record.recipient_reference",
    ],
    select:
      "record.*, allocation.reference_number as allocation_reference, program.name as program_name",
    table: "fund_disbursements",
    joins: `
      join public.fund_allocations allocation
        on allocation.id = record.allocation_id and allocation.organization_id = record.organization_id
      join public.programs program
        on program.id = allocation.program_id and program.organization_id = record.organization_id
    `,
  });

export async function postFundDisbursement(
  context: RequestContext,
  input: PostFundDisbursementInput,
  idempotencyKey: string,
) {
  requirePermission(context, "fund_disbursements.post");
  return runIdempotent(
    context,
    idempotencyKey,
    "fund_disbursement.post",
    input,
    async (database, client) => {
      const allocationResult = await client.query<Row>(
        `
          select * from public.fund_allocations
          where id = $1 and organization_id = $2
          for update
        `,
        [input.allocation_id, context.organizationId],
      );
      const allocation =
        allocationResult.rows[0] ?? notFound("Alokasi dana tidak ditemukan.");
      if (allocation.status !== "approved") {
        throw new DomainError(
          "INVALID_STATE",
          "Disbursement memerlukan alokasi approved.",
          409,
        );
      }
      if (allocation.currency !== input.currency) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Mata uang disbursement berbeda dari alokasi.",
          400,
        );
      }
      await lockRestriction(
        client,
        context,
        String(allocation.restriction_id),
      );
      const remaining = await client.query<{ amount: string }>(
        `
          select coalesce(sum(allocated_delta), 0)::numeric(20,2)::text as amount
          from public.fund_ledger_entries
          where organization_id = $1 and allocation_id = $2
        `,
        [context.organizationId, input.allocation_id],
      );
      const sufficient = await client.query<{ allowed: boolean }>(
        "select $1::numeric <= $2::numeric as allowed",
        [input.amount, remaining.rows[0]?.amount ?? "0"],
      );
      if (!sufficient.rows[0]?.allowed) {
        throw new DomainError(
          "INSUFFICIENT_FUNDS",
          "Sisa alokasi tidak mencukupi untuk disbursement.",
          409,
        );
      }
      const result = await client.query<Row>(
        `
          insert into public.fund_disbursements (
            organization_id, reference_number, allocation_id, amount,
            currency, recipient_type, recipient_reference, payment_method,
            external_reference, disbursed_at, created_by
          ) values ($1, $2, $3, $4::numeric, $5, $6, $7, $8, $9, $10, $11)
          returning *
        `,
        [
          context.organizationId,
          reference("DSB"),
          input.allocation_id,
          input.amount,
          input.currency,
          input.recipient_type,
          input.recipient_reference,
          input.payment_method,
          input.external_reference ?? null,
          input.disbursed_at,
          context.profileId,
        ],
      );
      const record = result.rows[0]!;
      await insertLedger(client, context, {
        allocatedDelta: `-${input.amount}`,
        allocationId: input.allocation_id,
        currency: input.currency,
        disbursedDelta: input.amount,
        entryType: "disbursement_posted",
        programId: String(allocation.program_id),
        restrictionId: String(allocation.restriction_id),
        sourceId: record.id,
        sourceType: "disbursement",
      });
      await insertAuditEvent(database, context, {
        action: "fund_disbursement.posted",
        after: record,
        entityId: record.id,
        entityType: "fund_disbursement",
      });
      return record;
    },
  );
}

async function insertReversal(
  client: PoolClient,
  context: RequestContext,
  values: {
    amount: string;
    currency: string;
    reason: string;
    sourceId: string;
    sourceType: "allocation" | "disbursement" | "receipt";
  },
) {
  const result = await client.query<Row>(
    `
      insert into public.fund_reversals (
        organization_id, reference_number, source_type, source_id,
        amount, currency, reason, reversed_by
      ) values ($1, $2, $3, $4, $5::numeric, $6, $7, $8)
      returning *
    `,
    [
      context.organizationId,
      reference("REV"),
      values.sourceType,
      values.sourceId,
      values.amount,
      values.currency,
      values.reason,
      context.profileId,
    ],
  );
  return result.rows[0]!;
}

export async function reverseFundReceipt(
  context: RequestContext,
  receiptId: string,
  input: ReverseFundTransactionInput,
  idempotencyKey: string,
) {
  requirePermission(context, "fund_receipts.reverse");
  return runIdempotent(
    context,
    idempotencyKey,
    "fund_receipt.reverse",
    { input, receiptId },
    async (database, client) => {
      const receiptResult = await client.query<Row>(
        `
          select * from public.fund_receipts
          where id = $1 and organization_id = $2
          for update
        `,
        [receiptId, context.organizationId],
      );
      const receipt =
        receiptResult.rows[0] ?? notFound("Receipt tidak ditemukan.");
      if (receipt.status !== "posted") {
        throw new DomainError("INVALID_STATE", "Receipt sudah direversal.", 409);
      }
      await lockRestriction(
        client,
        context,
        String(receipt.restriction_id),
      );
      const balance = await restrictionBalance(
        client,
        context,
        String(receipt.restriction_id),
      );
      const sufficient = await client.query<{ allowed: boolean }>(
        "select $1::numeric <= $2::numeric as allowed",
        [receipt.amount, balance.available],
      );
      if (!sufficient.rows[0]?.allowed) {
        throw new DomainError(
          "INSUFFICIENT_FUNDS",
          "Receipt tidak dapat direversal karena dananya sudah dialokasikan.",
          409,
        );
      }
      const reversal = await insertReversal(client, context, {
        amount: String(receipt.amount),
        currency: String(receipt.currency),
        reason: input.reason,
        sourceId: receiptId,
        sourceType: "receipt",
      });
      await insertLedger(client, context, {
        availableDelta: `-${String(receipt.amount)}`,
        currency: String(receipt.currency),
        entryType: "receipt_reversed",
        restrictionId: String(receipt.restriction_id),
        sourceId: reversal.id,
        sourceType: "reversal",
      });
      await client.query(
        `
          update public.fund_receipts
          set status = 'reversed', reversed_at = now(), updated_at = now()
          where id = $1 and organization_id = $2
        `,
        [receiptId, context.organizationId],
      );
      if (receipt.commitment_id) {
        await updateCommitmentStatus(
          client,
          context,
          String(receipt.commitment_id),
        );
      }
      await insertAuditEvent(database, context, {
        action: "fund_receipt.reversed",
        after: reversal,
        before: receipt,
        entityId: receiptId,
        entityType: "fund_receipt",
      });
      return reversal;
    },
  );
}

export async function reverseFundAllocation(
  context: RequestContext,
  allocationId: string,
  input: ReverseFundTransactionInput,
  idempotencyKey: string,
) {
  requirePermission(context, "fund_allocations.reverse");
  return runIdempotent(
    context,
    idempotencyKey,
    "fund_allocation.reverse",
    { allocationId, input },
    async (database, client) => {
      const allocationResult = await client.query<Row>(
        `
          select * from public.fund_allocations
          where id = $1 and organization_id = $2
          for update
        `,
        [allocationId, context.organizationId],
      );
      const allocation =
        allocationResult.rows[0] ?? notFound("Alokasi tidak ditemukan.");
      if (allocation.status !== "approved") {
        throw new DomainError(
          "INVALID_STATE",
          "Hanya alokasi approved yang dapat direversal.",
          409,
        );
      }
      const activeDisbursement = await client.query(
        `
          select 1 from public.fund_disbursements
          where allocation_id = $1 and organization_id = $2 and status = 'posted'
          limit 1
        `,
        [allocationId, context.organizationId],
      );
      if (activeDisbursement.rowCount) {
        throw new DomainError(
          "INVALID_STATE",
          "Reverse seluruh disbursement sebelum mereversal alokasi.",
          409,
        );
      }
      await lockRestriction(
        client,
        context,
        String(allocation.restriction_id),
      );
      const reversal = await insertReversal(client, context, {
        amount: String(allocation.amount),
        currency: String(allocation.currency),
        reason: input.reason,
        sourceId: allocationId,
        sourceType: "allocation",
      });
      await insertLedger(client, context, {
        allocatedDelta: `-${String(allocation.amount)}`,
        allocationId,
        availableDelta: String(allocation.amount),
        currency: String(allocation.currency),
        entryType: "allocation_reversed",
        programId: String(allocation.program_id),
        restrictionId: String(allocation.restriction_id),
        sourceId: reversal.id,
        sourceType: "reversal",
      });
      const updated = await client.query<Row>(
        `
          update public.fund_allocations
          set status = 'reversed', reversed_at = now(),
            updated_at = now(), updated_by = $1
          where id = $2 and organization_id = $3
          returning *
        `,
        [context.profileId, allocationId, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "fund_allocation.reversed",
        after: updated.rows[0],
        before: allocation,
        entityId: allocationId,
        entityType: "fund_allocation",
      });
      return reversal;
    },
  );
}

export async function reverseFundDisbursement(
  context: RequestContext,
  disbursementId: string,
  input: ReverseFundTransactionInput,
  idempotencyKey: string,
) {
  requirePermission(context, "fund_disbursements.reverse");
  return runIdempotent(
    context,
    idempotencyKey,
    "fund_disbursement.reverse",
    { disbursementId, input },
    async (database, client) => {
      const result = await client.query<Row>(
        `
          select disbursement.*, allocation.restriction_id, allocation.program_id
          from public.fund_disbursements disbursement
          join public.fund_allocations allocation
            on allocation.id = disbursement.allocation_id
           and allocation.organization_id = disbursement.organization_id
          where disbursement.id = $1 and disbursement.organization_id = $2
          for update of disbursement, allocation
        `,
        [disbursementId, context.organizationId],
      );
      const disbursement =
        result.rows[0] ?? notFound("Disbursement tidak ditemukan.");
      if (disbursement.status !== "posted") {
        throw new DomainError(
          "INVALID_STATE",
          "Disbursement sudah direversal.",
          409,
        );
      }
      await lockRestriction(
        client,
        context,
        String(disbursement.restriction_id),
      );
      const reversal = await insertReversal(client, context, {
        amount: String(disbursement.amount),
        currency: String(disbursement.currency),
        reason: input.reason,
        sourceId: disbursementId,
        sourceType: "disbursement",
      });
      await insertLedger(client, context, {
        allocatedDelta: String(disbursement.amount),
        allocationId: String(disbursement.allocation_id),
        currency: String(disbursement.currency),
        disbursedDelta: `-${String(disbursement.amount)}`,
        entryType: "disbursement_reversed",
        programId: String(disbursement.program_id),
        restrictionId: String(disbursement.restriction_id),
        sourceId: reversal.id,
        sourceType: "reversal",
      });
      await client.query(
        `
          update public.fund_disbursements
          set status = 'reversed', reversed_at = now(), updated_at = now()
          where id = $1 and organization_id = $2
        `,
        [disbursementId, context.organizationId],
      );
      await insertAuditEvent(database, context, {
        action: "fund_disbursement.reversed",
        after: reversal,
        before: disbursement,
        entityId: disbursementId,
        entityType: "fund_disbursement",
      });
      return reversal;
    },
  );
}

export const listFundReconciliations = (
  context: RequestContext,
  query: FundListQuery,
) =>
  listTable(context, query, {
    permission: "fund_reconciliations.read",
    searchColumns: ["record.reference_number"],
    select: "record.*, restriction.name as restriction_name",
    table: "fund_reconciliations",
    joins: `
      join public.fund_restrictions restriction
        on restriction.id = record.restriction_id and restriction.organization_id = record.organization_id
    `,
  });

export async function createFundReconciliation(
  context: RequestContext,
  input: CreateFundReconciliationInput,
  idempotencyKey: string,
) {
  requirePermission(context, "fund_reconciliations.manage");
  return runIdempotent(
    context,
    idempotencyKey,
    "fund_reconciliation.create",
    input,
    async (database, client) => {
      const restriction = await lockRestriction(
        client,
        context,
        input.restriction_id,
      );
      if (restriction.currency !== input.currency) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Mata uang rekonsiliasi berbeda dari pembatasan dana.",
          400,
        );
      }
      const balance = await restrictionBalance(
        client,
        context,
        input.restriction_id,
      );
      const result = await client.query<Row>(
        `
          insert into public.fund_reconciliations (
            organization_id, reference_number, restriction_id, currency,
            period_ended_at, system_balance, statement_balance,
            difference_amount, status, notes, reconciled_by
          ) values (
            $1, $2, $3, $4, $5, $6::numeric, $7::numeric,
            ($7::numeric - $6::numeric),
            case when $7::numeric = $6::numeric then 'matched' else 'variance' end,
            $8, $9
          )
          returning *
        `,
        [
          context.organizationId,
          reference("REC"),
          input.restriction_id,
          input.currency,
          input.period_ended_at,
          balance.cash_balance,
          input.statement_balance,
          input.notes ?? null,
          context.profileId,
        ],
      );
      const record = result.rows[0]!;
      await insertAuditEvent(database, context, {
        action: "fund_reconciliation.created",
        after: record,
        entityId: record.id,
        entityType: "fund_reconciliation",
      });
      return record;
    },
  );
}
