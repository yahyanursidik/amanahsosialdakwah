import { createHash, randomUUID } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import { withTenantTransaction, type TenantDatabase } from "../db/client";
import {
  assertDistributionCompletion,
  assertDistributionTransition,
  assertIndependentDistributionVerifier,
  type DistributionStatus,
} from "../domain/distribution-rules";
import { DomainError } from "../domain/errors";
import type {
  AddDistributionEvidenceInput,
  AssignDistributionInput,
  CancelDistributionInput,
  ConfirmDistributionInput,
  CreateDistributionPlanInput,
  DistributionListQuery,
  ExecuteDistributionInput,
  VerifyDistributionInput,
} from "../routes/distribution-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function reference(): string {
  return `DST-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function notFound(): never {
  throw new DomainError("NOT_FOUND", "Rencana distribusi tidak ditemukan.", 404);
}

function transition(current: unknown, target: DistributionStatus) {
  try {
    assertDistributionTransition(current as DistributionStatus, target);
  } catch (error) {
    throw new DomainError(
      "INVALID_STATE",
      error instanceof Error ? error.message : "Transisi distribusi tidak valid.",
      409,
    );
  }
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
        insert into public.distribution_idempotency_records (
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
          from public.distribution_idempotency_records
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
        update public.distribution_idempotency_records
        set status = 'completed', response_snapshot = $1, completed_at = now()
        where organization_id = $2 and idempotency_key = $3
      `,
      [JSON.stringify(result), context.organizationId, key],
    );
    return result;
  });
}

async function lockPlan(
  client: PoolClient,
  context: RequestContext,
  planId: string,
): Promise<Row> {
  const result = await client.query<Row>(
    `
      select * from public.distribution_plans
      where id = $1 and organization_id = $2
      for update
    `,
    [planId, context.organizationId],
  );
  return result.rows[0] ?? notFound();
}

async function activeAssignee(
  client: PoolClient,
  context: RequestContext,
  planId: string,
) {
  const result = await client.query<Row>(
    `
      select *
      from public.distribution_assignments
      where organization_id = $1 and distribution_plan_id = $2
        and status = 'active'
      order by sequence_number desc
      limit 1
    `,
    [context.organizationId, planId],
  );
  return result.rows[0] ?? null;
}

function assertAssignee(assignment: Row | null, context: RequestContext) {
  if (!assignment || assignment.assignee_profile_id !== context.profileId) {
    throw new DomainError(
      "FORBIDDEN",
      "Hanya petugas aktif yang ditugaskan dapat menjalankan distribusi.",
      403,
    );
  }
}

async function insertEvent(
  client: PoolClient,
  context: RequestContext,
  values: {
    cycleNumber: number;
    eventType: string;
    fromStatus?: string | null;
    notes?: string | null;
    planId: string;
    toStatus: string;
  },
) {
  await client.query(
    `
      insert into public.distribution_events (
        organization_id, distribution_plan_id, cycle_number,
        event_type, from_status, to_status, actor_profile_id,
        notes, request_id
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      context.organizationId,
      values.planId,
      values.cycleNumber,
      values.eventType,
      values.fromStatus ?? null,
      values.toStatus,
      context.profileId,
      values.notes ?? null,
      context.requestId,
    ],
  );
}

export async function listDistributionPlans(
  context: RequestContext,
  query: DistributionListQuery,
) {
  requirePermission(context, "distributions.read");
  return withTenantTransaction(context, async (_database, client) => {
    const values: unknown[] = [context.organizationId];
    const filters = ["plan.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`plan.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(plan.reference_number ilike $${values.length}
          or beneficiary.display_name ilike $${values.length}
          or program.name ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `
        select count(*)::int as total
        from public.distribution_plans plan
        join public.crm_contacts beneficiary
          on beneficiary.id = plan.beneficiary_contact_id
         and beneficiary.organization_id = plan.organization_id
        join public.programs program
          on program.id = plan.program_id
         and program.organization_id = plan.organization_id
        where ${where}
      `,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select plan.*, beneficiary.display_name as beneficiary_name,
          program.name as program_name,
          beneficiary_case.reference_number as case_reference,
          disbursement.reference_number as disbursement_reference,
          assignee.display_name as assignee_name
        from public.distribution_plans plan
        join public.crm_contacts beneficiary
          on beneficiary.id = plan.beneficiary_contact_id
         and beneficiary.organization_id = plan.organization_id
        join public.programs program
          on program.id = plan.program_id
         and program.organization_id = plan.organization_id
        join public.beneficiary_cases beneficiary_case
          on beneficiary_case.id = plan.case_id
         and beneficiary_case.organization_id = plan.organization_id
        join public.fund_disbursements disbursement
          on disbursement.id = plan.disbursement_id
         and disbursement.organization_id = plan.organization_id
        left join lateral (
          select profile.display_name
          from public.distribution_assignments assignment
          join public.profiles profile on profile.id = assignment.assignee_profile_id
          where assignment.distribution_plan_id = plan.id
            and assignment.organization_id = plan.organization_id
            and assignment.status = 'active'
          order by assignment.sequence_number desc
          limit 1
        ) assignee on true
        where ${where}
        order by plan.updated_at desc
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

export async function listDistributionAssignees(context: RequestContext) {
  requirePermission(context, "distributions.assign");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `
        select membership.id, membership.profile_id,
          profile.display_name, profile.email
        from public.memberships membership
        join public.profiles profile on profile.id = membership.profile_id
        where membership.organization_id = $1
          and membership.status = 'active'
        order by profile.display_name
      `,
      [context.organizationId],
    );
    return result.rows;
  });
}

export async function getDistributionPlan(
  context: RequestContext,
  planId: string,
) {
  requirePermission(context, "distributions.read");
  return withTenantTransaction(context, async (_database, client) => {
    const result = await client.query<Row>(
      `
        select plan.*, beneficiary.display_name as beneficiary_name,
          program.name as program_name,
          beneficiary_case.reference_number as case_reference,
          disbursement.reference_number as disbursement_reference,
          allocation.reference_number as allocation_reference,
          coalesce((
            select jsonb_agg(
              to_jsonb(event) || jsonb_build_object('actor_name', actor.display_name)
              order by event.occurred_at
            )
            from public.distribution_events event
            join public.profiles actor on actor.id = event.actor_profile_id
            where event.distribution_plan_id = plan.id
              and event.organization_id = plan.organization_id
          ), '[]'::jsonb) as events,
          coalesce((
            select jsonb_agg(
              to_jsonb(evidence) || jsonb_build_object('creator_name', creator.display_name)
              order by evidence.cycle_number, evidence.sequence_number
            )
            from public.distribution_evidence evidence
            join public.profiles creator on creator.id = evidence.created_by
            where evidence.distribution_plan_id = plan.id
              and evidence.organization_id = plan.organization_id
          ), '[]'::jsonb) as evidence,
          (
            select to_jsonb(assignment) || jsonb_build_object('assignee_name', assignee.display_name)
            from public.distribution_assignments assignment
            join public.profiles assignee on assignee.id = assignment.assignee_profile_id
            where assignment.distribution_plan_id = plan.id
              and assignment.organization_id = plan.organization_id
              and assignment.status = 'active'
            order by assignment.sequence_number desc limit 1
          ) as active_assignment,
          (
            select to_jsonb(execution) || jsonb_build_object('executor_name', executor.display_name)
            from public.distribution_executions execution
            join public.profiles executor on executor.id = execution.executed_by
            where execution.distribution_plan_id = plan.id
              and execution.organization_id = plan.organization_id
              and execution.cycle_number = plan.cycle_number
            order by execution.execution_number desc limit 1
          ) as current_execution,
          (
            select to_jsonb(confirmation)
            from public.distribution_confirmations confirmation
            where confirmation.distribution_plan_id = plan.id
              and confirmation.organization_id = plan.organization_id
              and confirmation.cycle_number = plan.cycle_number
          ) as current_confirmation,
          (
            select to_jsonb(verification) || jsonb_build_object('verifier_name', verifier.display_name)
            from public.distribution_verifications verification
            join public.profiles verifier on verifier.id = verification.verified_by
            where verification.distribution_plan_id = plan.id
              and verification.organization_id = plan.organization_id
              and verification.cycle_number = plan.cycle_number
          ) as current_verification
        from public.distribution_plans plan
        join public.crm_contacts beneficiary
          on beneficiary.id = plan.beneficiary_contact_id
         and beneficiary.organization_id = plan.organization_id
        join public.programs program
          on program.id = plan.program_id and program.organization_id = plan.organization_id
        join public.beneficiary_cases beneficiary_case
          on beneficiary_case.id = plan.case_id and beneficiary_case.organization_id = plan.organization_id
        join public.fund_disbursements disbursement
          on disbursement.id = plan.disbursement_id and disbursement.organization_id = plan.organization_id
        join public.fund_allocations allocation
          on allocation.id = plan.allocation_id and allocation.organization_id = plan.organization_id
        where plan.id = $1 and plan.organization_id = $2
      `,
      [planId, context.organizationId],
    );
    return result.rows[0] ?? notFound();
  });
}

export async function createDistributionPlan(
  context: RequestContext,
  input: CreateDistributionPlanInput,
) {
  requirePermission(context, "distributions.manage");
  return withTenantTransaction(context, async (database, client) => {
    const disbursementResult = await client.query<Row>(
      `
        select disbursement.*, allocation.program_id,
          allocation.status as allocation_status
        from public.fund_disbursements disbursement
        join public.fund_allocations allocation
          on allocation.id = disbursement.allocation_id
         and allocation.organization_id = disbursement.organization_id
        where disbursement.id = $1 and disbursement.organization_id = $2
        for update of disbursement
      `,
      [input.disbursement_id, context.organizationId],
    );
    const disbursement = disbursementResult.rows[0];
    if (!disbursement) {
      throw new DomainError("NOT_FOUND", "Disbursement tidak ditemukan.", 404);
    }
    if (
      disbursement.status !== "posted" ||
      disbursement.allocation_status !== "approved"
    ) {
      throw new DomainError(
        "INVALID_STATE",
        "Distribusi memerlukan disbursement posted dan alokasi approved.",
        409,
      );
    }
    if (disbursement.currency !== input.currency) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Mata uang plan berbeda dari disbursement.",
        400,
      );
    }
    const caseResult = await client.query<Row>(
      `
        select beneficiary_case.*, beneficiary.status as beneficiary_status
        from public.beneficiary_cases beneficiary_case
        join public.crm_contacts beneficiary
          on beneficiary.id = beneficiary_case.beneficiary_contact_id
         and beneficiary.organization_id = beneficiary_case.organization_id
        where beneficiary_case.id = $1 and beneficiary_case.organization_id = $2
      `,
      [input.case_id, context.organizationId],
    );
    const beneficiaryCase = caseResult.rows[0];
    if (!beneficiaryCase) {
      throw new DomainError("NOT_FOUND", "Kasus penerima tidak ditemukan.", 404);
    }
    if (
      beneficiaryCase.status !== "eligible" ||
      beneficiaryCase.beneficiary_status !== "active"
    ) {
      throw new DomainError(
        "INVALID_STATE",
        "Distribusi hanya dapat dibuat untuk penerima dengan kasus eligible dan kontak aktif.",
        409,
      );
    }
    if (beneficiaryCase.program_id !== disbursement.program_id) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Program kasus tidak sesuai dengan alokasi dana.",
        400,
      );
    }
    const capacity = await client.query<{ allowed: boolean }>(
      `
        select (
          coalesce(sum(plan.amount) filter (where plan.status <> 'cancelled'), 0)
          + $1::numeric
        ) <= $2::numeric as allowed
        from public.distribution_plans plan
        where plan.organization_id = $3 and plan.disbursement_id = $4
      `,
      [
        input.amount,
        disbursement.amount,
        context.organizationId,
        input.disbursement_id,
      ],
    );
    if (!capacity.rows[0]?.allowed) {
      throw new DomainError(
        "INSUFFICIENT_FUNDS",
        "Total rencana distribusi melebihi nilai disbursement.",
        409,
      );
    }
    const result = await client.query<Row>(
      `
        insert into public.distribution_plans (
          organization_id, reference_number, disbursement_id, allocation_id,
          program_id, case_id, beneficiary_contact_id, amount, currency,
          distribution_method, purpose, planned_at, requires_confirmation,
          created_by, updated_by
        ) values ($1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10, $11, $12, $13, $14, $14)
        returning *
      `,
      [
        context.organizationId,
        reference(),
        input.disbursement_id,
        disbursement.allocation_id,
        disbursement.program_id,
        input.case_id,
        beneficiaryCase.beneficiary_contact_id,
        input.amount,
        input.currency,
        input.distribution_method,
        input.purpose,
        input.planned_at,
        input.requires_confirmation,
        context.profileId,
      ],
    );
    const record = result.rows[0]!;
    await insertEvent(client, context, {
      cycleNumber: 1,
      eventType: "created",
      planId: record.id,
      toStatus: "draft",
    });
    await insertAuditEvent(database, context, {
      action: "distribution.created",
      after: record,
      entityId: record.id,
      entityType: "distribution_plan",
    });
    return record;
  });
}

async function changeStatus(
  context: RequestContext,
  planId: string,
  key: string,
  command: string,
  permission: string,
  target: DistributionStatus,
  notes?: string,
) {
  requirePermission(context, permission);
  return runIdempotent(
    context,
    key,
    command,
    { notes, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, target);
      if (target === "ready") {
        const prerequisite = await client.query<{ valid: boolean }>(
          `
            select (
              disbursement.status = 'posted'
              and allocation.status = 'approved'
              and beneficiary_case.status = 'eligible'
              and beneficiary.status = 'active'
            ) as valid
            from public.distribution_plans plan
            join public.fund_disbursements disbursement
              on disbursement.id = plan.disbursement_id
             and disbursement.organization_id = plan.organization_id
            join public.fund_allocations allocation
              on allocation.id = plan.allocation_id
             and allocation.organization_id = plan.organization_id
            join public.beneficiary_cases beneficiary_case
              on beneficiary_case.id = plan.case_id
             and beneficiary_case.organization_id = plan.organization_id
            join public.crm_contacts beneficiary
              on beneficiary.id = plan.beneficiary_contact_id
             and beneficiary.organization_id = plan.organization_id
            where plan.id = $1 and plan.organization_id = $2
          `,
          [planId, context.organizationId],
        );
        if (!prerequisite.rows[0]?.valid) {
          throw new DomainError(
            "INVALID_STATE",
            "Rencana belum siap: status dana, kasus, atau penerima sudah tidak valid.",
            409,
          );
        }
      }
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = $1, updated_by = $2, updated_at = now()
          where id = $3 and organization_id = $4
          returning *
        `,
        [target, context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: command,
        fromStatus: String(plan.status),
        notes: notes ?? null,
        planId,
        toStatus: target,
      });
      await insertAuditEvent(database, context, {
        action: `distribution.${command}`,
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}

export function markDistributionReady(
  context: RequestContext,
  planId: string,
  notes: string | undefined,
  key: string,
) {
  return changeStatus(
    context,
    planId,
    key,
    "ready",
    "distributions.ready",
    "ready",
    notes,
  );
}

export async function assignDistribution(
  context: RequestContext,
  planId: string,
  input: AssignDistributionInput,
  key: string,
) {
  requirePermission(context, "distributions.assign");
  return runIdempotent(
    context,
    key,
    "assign",
    { input, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, "assigned");
      const membership = await client.query<Row>(
        `
          select * from public.memberships
          where id = $1 and organization_id = $2 and status = 'active'
        `,
        [input.membership_id, context.organizationId],
      );
      const selected = membership.rows[0];
      if (!selected) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Petugas harus memiliki membership aktif di organisasi ini.",
          400,
        );
      }
      await client.query(
        `
          update public.distribution_assignments
          set status = 'revoked', revoked_at = now(), updated_at = now()
          where distribution_plan_id = $1 and organization_id = $2 and status = 'active'
        `,
        [planId, context.organizationId],
      );
      const sequence = await client.query<{ value: number }>(
        `
          select coalesce(max(sequence_number), 0)::int + 1 as value
          from public.distribution_assignments
          where distribution_plan_id = $1 and organization_id = $2
        `,
        [planId, context.organizationId],
      );
      await client.query(
        `
          insert into public.distribution_assignments (
            organization_id, distribution_plan_id, membership_id,
            assignee_profile_id, sequence_number, assigned_by, notes
          ) values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          context.organizationId,
          planId,
          input.membership_id,
          selected.profile_id,
          sequence.rows[0]?.value ?? 1,
          context.profileId,
          input.notes ?? null,
        ],
      );
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = 'assigned', updated_by = $1, updated_at = now()
          where id = $2 and organization_id = $3 returning *
        `,
        [context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: "assigned",
        fromStatus: String(plan.status),
        notes: input.notes ?? null,
        planId,
        toStatus: "assigned",
      });
      await insertAuditEvent(database, context, {
        action: "distribution.assigned",
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}

export async function startDistribution(
  context: RequestContext,
  planId: string,
  notes: string | undefined,
  key: string,
) {
  requirePermission(context, "distributions.execute");
  return runIdempotent(
    context,
    key,
    "started",
    { notes, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, "in_progress");
      assertAssignee(await activeAssignee(client, context, planId), context);
      const cycleNumber =
        plan.status === "revision_required"
          ? Number(plan.cycle_number) + 1
          : Number(plan.cycle_number);
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = 'in_progress', cycle_number = $1,
            updated_by = $2, updated_at = now()
          where id = $3 and organization_id = $4 returning *
        `,
        [cycleNumber, context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber,
        eventType: "started",
        fromStatus: String(plan.status),
        notes: notes ?? null,
        planId,
        toStatus: "in_progress",
      });
      await insertAuditEvent(database, context, {
        action: "distribution.started",
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}

export async function executeDistribution(
  context: RequestContext,
  planId: string,
  input: ExecuteDistributionInput,
  key: string,
) {
  requirePermission(context, "distributions.execute");
  return runIdempotent(
    context,
    key,
    "executed",
    { input, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, input.outcome === "delivered" ? "executed" : "revision_required");
      assertAssignee(await activeAssignee(client, context, planId), context);
      const exact = await client.query<{ value: boolean }>(
        "select $1::numeric = $2::numeric as value",
        [input.amount, plan.amount],
      );
      if (!exact.rows[0]?.value) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Nominal pelaksanaan harus sama dengan nominal plan.",
          400,
        );
      }
      const number = await client.query<{ value: number }>(
        `
          select coalesce(max(execution_number), 0)::int + 1 as value
          from public.distribution_executions
          where distribution_plan_id = $1 and organization_id = $2
            and cycle_number = $3
        `,
        [planId, context.organizationId, plan.cycle_number],
      );
      await client.query(
        `
          insert into public.distribution_executions (
            organization_id, distribution_plan_id, cycle_number,
            execution_number, amount, currency, outcome, executed_at,
            location_notes, notes, executed_by
          ) values ($1, $2, $3, $4, $5::numeric, $6, $7, $8, $9, $10, $11)
        `,
        [
          context.organizationId,
          planId,
          plan.cycle_number,
          number.rows[0]?.value ?? 1,
          input.amount,
          plan.currency,
          input.outcome,
          input.executed_at,
          input.location_notes ?? null,
          input.notes,
          context.profileId,
        ],
      );
      const target =
        input.outcome === "delivered" ? "executed" : "revision_required";
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = $1, updated_by = $2, updated_at = now()
          where id = $3 and organization_id = $4 returning *
        `,
        [target, context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: input.outcome === "delivered" ? "executed" : "execution_failed",
        fromStatus: String(plan.status),
        notes: input.notes ?? null,
        planId,
        toStatus: target,
      });
      await insertAuditEvent(database, context, {
        action: `distribution.${input.outcome === "delivered" ? "executed" : "execution_failed"}`,
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}

export async function addDistributionEvidence(
  context: RequestContext,
  planId: string,
  input: AddDistributionEvidenceInput,
  key: string,
) {
  requirePermission(context, "distribution_evidence.manage");
  return runIdempotent(
    context,
    key,
    "evidence_added",
    { input, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      if (
        !["in_progress", "executed", "confirmed", "revision_required"].includes(
          String(plan.status),
        )
      ) {
        throw new DomainError(
          "INVALID_STATE",
          "Bukti hanya dapat ditambah selama atau setelah pelaksanaan.",
          409,
        );
      }
      const sequence = await client.query<{ value: number }>(
        `
          select coalesce(max(sequence_number), 0)::int + 1 as value
          from public.distribution_evidence
          where distribution_plan_id = $1 and organization_id = $2
            and cycle_number = $3
        `,
        [planId, context.organizationId, plan.cycle_number],
      );
      const result = await client.query<Row>(
        `
          insert into public.distribution_evidence (
            organization_id, distribution_plan_id, cycle_number,
            sequence_number, evidence_kind, description, captured_at,
            classification, storage_status, created_by
          ) values ($1, $2, $3, $4, $5, $6, $7, 'private', 'not_applicable', $8)
          returning *
        `,
        [
          context.organizationId,
          planId,
          plan.cycle_number,
          sequence.rows[0]?.value ?? 1,
          input.evidence_kind,
          input.description,
          input.captured_at,
          context.profileId,
        ],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: "evidence_added",
        fromStatus: String(plan.status),
        notes: input.description,
        planId,
        toStatus: String(plan.status),
      });
      await insertAuditEvent(database, context, {
        action: "distribution.evidence_added",
        after: record,
        entityId: record.id,
        entityType: "distribution_evidence",
      });
      return record;
    },
  );
}

export async function confirmDistribution(
  context: RequestContext,
  planId: string,
  input: ConfirmDistributionInput,
  key: string,
) {
  requirePermission(context, "distributions.confirm");
  return runIdempotent(
    context,
    key,
    "confirmed",
    { input, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, "confirmed");
      await client.query(
        `
          insert into public.distribution_confirmations (
            organization_id, distribution_plan_id, cycle_number,
            confirmation_method, confirmed_by_name, confirmed_at,
            notes, recorded_by
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          context.organizationId,
          planId,
          plan.cycle_number,
          input.confirmation_method,
          input.confirmed_by_name,
          input.confirmed_at,
          input.notes ?? null,
          context.profileId,
        ],
      );
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = 'confirmed', updated_by = $1, updated_at = now()
          where id = $2 and organization_id = $3 returning *
        `,
        [context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: "confirmed",
        fromStatus: String(plan.status),
        notes: input.notes ?? null,
        planId,
        toStatus: "confirmed",
      });
      await insertAuditEvent(database, context, {
        action: "distribution.confirmed",
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}

export async function verifyDistribution(
  context: RequestContext,
  planId: string,
  input: VerifyDistributionInput,
  key: string,
) {
  requirePermission(context, "distributions.verify");
  return runIdempotent(
    context,
    key,
    "verified",
    { input, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, input.decision);
      const execution = await client.query<Row>(
        `
          select * from public.distribution_executions
          where distribution_plan_id = $1 and organization_id = $2
            and cycle_number = $3 and outcome = 'delivered'
          order by execution_number desc limit 1
        `,
        [planId, context.organizationId, plan.cycle_number],
      );
      const latestExecution = execution.rows[0];
      if (!latestExecution) {
        throw new DomainError(
          "INVALID_STATE",
          "Pelaksanaan berhasil belum tercatat.",
          409,
        );
      }
      try {
        assertIndependentDistributionVerifier(
          String(plan.created_by),
          String(latestExecution.executed_by),
          context.profileId,
        );
      } catch (error) {
        throw new DomainError(
          "FORBIDDEN",
          error instanceof Error ? error.message : "Verifikator tidak independen.",
          403,
        );
      }
      const evidence = await client.query<{ total: number }>(
        `
          select count(*)::int as total from public.distribution_evidence
          where distribution_plan_id = $1 and organization_id = $2
            and cycle_number = $3
        `,
        [planId, context.organizationId, plan.cycle_number],
      );
      if ((evidence.rows[0]?.total ?? 0) < 1) {
        throw new DomainError(
          "INVALID_STATE",
          "Verifikasi memerlukan minimal satu bukti pada siklus aktif.",
          409,
        );
      }
      if (plan.requires_confirmation && plan.status !== "confirmed") {
        throw new DomainError(
          "INVALID_STATE",
          "Konfirmasi penerima wajib tersedia sebelum verifikasi.",
          409,
        );
      }
      await client.query(
        `
          insert into public.distribution_verifications (
            organization_id, distribution_plan_id, cycle_number,
            decision, notes, verified_by
          ) values ($1, $2, $3, $4, $5, $6)
        `,
        [
          context.organizationId,
          planId,
          plan.cycle_number,
          input.decision,
          input.notes,
          context.profileId,
        ],
      );
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = $1, updated_by = $2, updated_at = now()
          where id = $3 and organization_id = $4 returning *
        `,
        [input.decision, context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: input.decision,
        fromStatus: String(plan.status),
        notes: input.notes ?? null,
        planId,
        toStatus: input.decision,
      });
      await insertAuditEvent(database, context, {
        action: `distribution.${input.decision}`,
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}

export async function completeDistribution(
  context: RequestContext,
  planId: string,
  notes: string | undefined,
  key: string,
) {
  requirePermission(context, "distributions.complete");
  return runIdempotent(
    context,
    key,
    "completed",
    { notes, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, "completed");
      const prerequisites = await client.query<{
        beneficiary_valid: boolean;
        evidence_count: number;
        executed: boolean;
        has_confirmation: boolean;
        verified: boolean;
      }>(
        `
          select
            (beneficiary_case.status = 'eligible' and beneficiary.status = 'active'
              and allocation.status = 'approved' and disbursement.status = 'posted') as beneficiary_valid,
            exists (
              select 1 from public.distribution_executions execution
              where execution.distribution_plan_id = plan.id
                and execution.organization_id = plan.organization_id
                and execution.cycle_number = plan.cycle_number
                and execution.outcome = 'delivered'
            ) as executed,
            (select count(*)::int from public.distribution_evidence evidence
              where evidence.distribution_plan_id = plan.id
                and evidence.organization_id = plan.organization_id
                and evidence.cycle_number = plan.cycle_number) as evidence_count,
            exists (
              select 1 from public.distribution_confirmations confirmation
              where confirmation.distribution_plan_id = plan.id
                and confirmation.organization_id = plan.organization_id
                and confirmation.cycle_number = plan.cycle_number
            ) as has_confirmation,
            exists (
              select 1 from public.distribution_verifications verification
              where verification.distribution_plan_id = plan.id
                and verification.organization_id = plan.organization_id
                and verification.cycle_number = plan.cycle_number
                and verification.decision = 'verified'
            ) as verified
          from public.distribution_plans plan
          join public.beneficiary_cases beneficiary_case
            on beneficiary_case.id = plan.case_id and beneficiary_case.organization_id = plan.organization_id
          join public.crm_contacts beneficiary
            on beneficiary.id = plan.beneficiary_contact_id and beneficiary.organization_id = plan.organization_id
          join public.fund_allocations allocation
            on allocation.id = plan.allocation_id and allocation.organization_id = plan.organization_id
          join public.fund_disbursements disbursement
            on disbursement.id = plan.disbursement_id and disbursement.organization_id = plan.organization_id
          where plan.id = $1 and plan.organization_id = $2
        `,
        [planId, context.organizationId],
      );
      const values = prerequisites.rows[0];
      try {
        assertDistributionCompletion({
          beneficiaryValid: values?.beneficiary_valid ?? false,
          evidenceCount: values?.evidence_count ?? 0,
          executed: values?.executed ?? false,
          hasConfirmation: values?.has_confirmation ?? false,
          requiresConfirmation: Boolean(plan.requires_confirmation),
          verified: values?.verified ?? false,
        });
      } catch (error) {
        throw new DomainError(
          "INVALID_STATE",
          error instanceof Error ? error.message : "Prasyarat completion belum lengkap.",
          409,
        );
      }
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = 'completed', completed_at = now(),
            updated_by = $1, updated_at = now()
          where id = $2 and organization_id = $3 returning *
        `,
        [context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: "completed",
        fromStatus: String(plan.status),
        notes: notes ?? null,
        planId,
        toStatus: "completed",
      });
      await insertAuditEvent(database, context, {
        action: "distribution.completed",
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}

export async function cancelDistribution(
  context: RequestContext,
  planId: string,
  input: CancelDistributionInput,
  key: string,
) {
  requirePermission(context, "distributions.cancel");
  return runIdempotent(
    context,
    key,
    "cancelled",
    { input, planId },
    async (database, client) => {
      const plan = await lockPlan(client, context, planId);
      transition(plan.status, "cancelled");
      const result = await client.query<Row>(
        `
          update public.distribution_plans
          set status = 'cancelled', cancelled_reason = $1,
            updated_by = $2, updated_at = now()
          where id = $3 and organization_id = $4 returning *
        `,
        [input.reason, context.profileId, planId, context.organizationId],
      );
      const record = result.rows[0]!;
      await insertEvent(client, context, {
        cycleNumber: Number(plan.cycle_number),
        eventType: "cancelled",
        fromStatus: String(plan.status),
        notes: input.reason,
        planId,
        toStatus: "cancelled",
      });
      await insertAuditEvent(database, context, {
        action: "distribution.cancelled",
        after: record,
        before: plan,
        entityId: planId,
        entityType: "distribution_plan",
      });
      return record;
    },
  );
}
