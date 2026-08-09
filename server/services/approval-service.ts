import { randomUUID } from "node:crypto";

import type { PoolClient } from "@neondatabase/serverless";

import {
  assertIndependentApprover,
  assertValidApprovalSteps,
  canActOnApprovalRequest,
  canCancelApprovalRequest,
  canSubmitApprovalRequest,
  resolveApprovalProgress,
  type ApprovalRequestStatus,
} from "../domain/approval-rules";
import { DomainError } from "../domain/errors";
import { withTenantTransaction } from "../db/client";
import type {
  ApprovalCommandInput,
  ApprovalDecisionInput,
  ApprovalListQuery,
  CreateApprovalRequestInput,
  CreateApprovalWorkflowInput,
  CreateApprovalWorkflowVersionInput,
} from "../routes/approval-schemas";
import type { RequestContext } from "../types";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type Row = Record<string, unknown> & { id: string };

function referenceNumber(): string {
  return `APR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function asStatus(value: unknown): ApprovalRequestStatus {
  return String(value) as ApprovalRequestStatus;
}

function notFound(message: string): never {
  throw new DomainError("NOT_FOUND", message, 404);
}

async function readWorkflow(
  client: PoolClient,
  organizationId: string,
  workflowId: string,
): Promise<Row> {
  const result = await client.query<Row>(
    `
      select workflow.*,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', version.id,
              'version_number', version.version_number,
              'status', version.status,
              'published_at', version.published_at,
              'published_by', version.published_by,
              'created_at', version.created_at,
              'steps', (
                select coalesce(jsonb_agg(to_jsonb(step) order by step.position), '[]'::jsonb)
                from public.approval_workflow_steps step
                where step.workflow_version_id = version.id
                  and step.organization_id = workflow.organization_id
              )
            )
            order by version.version_number desc
          ) filter (where version.id is not null),
          '[]'::jsonb
        ) as versions
      from public.approval_workflows workflow
      left join public.approval_workflow_versions version
        on version.workflow_id = workflow.id
       and version.organization_id = workflow.organization_id
      where workflow.id = $1 and workflow.organization_id = $2
      group by workflow.id
    `,
    [workflowId, organizationId],
  );
  return result.rows[0] ?? notFound("Workflow approval tidak ditemukan.");
}

async function readRequest(
  client: PoolClient,
  organizationId: string,
  requestId: string,
): Promise<Row> {
  const result = await client.query<Row>(
    `
      select request.*,
        workflow.name as workflow_name,
        version.version_number as workflow_version_number,
        requester.display_name as requester_name,
        (
          select coalesce(jsonb_agg(to_jsonb(step) order by step.position), '[]'::jsonb)
          from public.approval_request_steps step
          where step.approval_request_id = request.id
            and step.organization_id = request.organization_id
        ) as steps,
        (
          select coalesce(
            jsonb_agg(
              to_jsonb(action) || jsonb_build_object('actor_name', actor.display_name)
              order by action.occurred_at
            ),
            '[]'::jsonb
          )
          from public.approval_actions action
          join public.profiles actor on actor.id = action.actor_profile_id
          where action.approval_request_id = request.id
            and action.organization_id = request.organization_id
        ) as actions
      from public.approval_requests request
      join public.approval_workflow_versions version
        on version.id = request.workflow_version_id
       and version.organization_id = request.organization_id
      join public.approval_workflows workflow
        on workflow.id = version.workflow_id
       and workflow.organization_id = request.organization_id
      join public.profiles requester on requester.id = request.requested_by
      where request.id = $1 and request.organization_id = $2
    `,
    [requestId, organizationId],
  );
  return result.rows[0] ?? notFound("Permintaan approval tidak ditemukan.");
}

async function subjectSnapshot(
  client: PoolClient,
  context: RequestContext,
  subjectType: "assessment" | "case" | "fund_allocation",
  subjectId: string,
): Promise<Record<string, unknown>> {
  let result;
  if (subjectType === "assessment") {
    result = await client.query<Row>(
          `
            select assessment.id, assessment.reference_number, assessment.status,
              assessment.outcome, assessment.total_score, assessment.max_score,
              assessment.score_percentage, assessment.case_id,
              beneficiary.display_name as beneficiary_name
            from public.case_assessments assessment
            join public.beneficiary_cases beneficiary_case
              on beneficiary_case.id = assessment.case_id
             and beneficiary_case.organization_id = assessment.organization_id
            join public.crm_contacts beneficiary
              on beneficiary.id = beneficiary_case.beneficiary_contact_id
             and beneficiary.organization_id = assessment.organization_id
            where assessment.id = $1 and assessment.organization_id = $2
          `,
          [subjectId, context.organizationId],
        );
  } else if (subjectType === "case") {
    result = await client.query<Row>(
          `
            select beneficiary_case.id, beneficiary_case.reference_number,
              beneficiary_case.status, beneficiary_case.priority,
              beneficiary_case.application_id,
              beneficiary.display_name as beneficiary_name
            from public.beneficiary_cases beneficiary_case
            join public.crm_contacts beneficiary
              on beneficiary.id = beneficiary_case.beneficiary_contact_id
             and beneficiary.organization_id = beneficiary_case.organization_id
            where beneficiary_case.id = $1
              and beneficiary_case.organization_id = $2
          `,
          [subjectId, context.organizationId],
        );
  } else {
    result = await client.query<Row>(
      `
        select allocation.id, allocation.reference_number, allocation.status,
          allocation.amount::text as amount, allocation.currency,
          allocation.purpose, allocation.restriction_id, allocation.program_id,
          restriction.code as restriction_code,
          restriction.name as restriction_name,
          program.name as program_name
        from public.fund_allocations allocation
        join public.fund_restrictions restriction
          on restriction.id = allocation.restriction_id
         and restriction.organization_id = allocation.organization_id
        left join public.programs program
          on program.id = allocation.program_id
         and program.organization_id = allocation.organization_id
        where allocation.id = $1
          and allocation.organization_id = $2
          and allocation.status = 'draft'
      `,
      [subjectId, context.organizationId],
    );
  }

  return result.rows[0] ?? notFound("Subjek approval tidak ditemukan.");
}

export async function listApprovalWorkflows(
  context: RequestContext,
  query: ApprovalListQuery,
) {
  requirePermission(context, "approval_workflows.read");
  return withTenantTransaction(context, async (_database, client) => {
    const offset = (query.page - 1) * query.pageSize;
    const values: unknown[] = [context.organizationId];
    const filters = ["workflow.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`workflow.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(workflow.name ilike $${values.length} or workflow.code ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.approval_workflows workflow where ${where}`,
      values,
    );
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select workflow.*,
          published.id as published_version_id,
          published.version_number as published_version_number,
          (
            select count(*)::int
            from public.approval_workflow_steps step
            where step.workflow_version_id = published.id
          ) as step_count
        from public.approval_workflows workflow
        left join lateral (
          select version.id, version.version_number
          from public.approval_workflow_versions version
          where version.workflow_id = workflow.id
            and version.status = 'published'
          order by version.version_number desc
          limit 1
        ) published on true
        where ${where}
        order by workflow.updated_at desc
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

export async function createApprovalWorkflow(
  context: RequestContext,
  input: CreateApprovalWorkflowInput,
) {
  requirePermission(context, "approval_workflows.manage");
  assertValidApprovalSteps(
    input.steps.map((step, index) => ({
      minimumApprovals: step.minimum_approvals,
      position: index + 1,
      requiredPermission: step.required_permission,
    })),
  );

  return withTenantTransaction(context, async (database, client) => {
    const workflowResult = await client.query<Row>(
      `
        insert into public.approval_workflows (
          organization_id, code, name, description, resource_type, created_by, updated_by
        ) values ($1, upper($2), $3, $4, $5, $6, $6)
        returning *
      `,
      [
        context.organizationId,
        input.code,
        input.name,
        input.description ?? null,
        input.resource_type,
        context.profileId,
      ],
    );
    const workflow = workflowResult.rows[0];
    if (!workflow) {
      throw new DomainError("INTERNAL_ERROR", "Workflow gagal dibuat.", 500);
    }
    const version = await client.query<Row>(
      `
        insert into public.approval_workflow_versions (
          organization_id, workflow_id, version_number, created_by
        ) values ($1, $2, 1, $3)
        returning *
      `,
      [context.organizationId, workflow.id, context.profileId],
    );
    const createdVersion = version.rows[0];
    if (!createdVersion) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Versi workflow gagal dibuat.",
        500,
      );
    }
    for (const [index, step] of input.steps.entries()) {
      await client.query(
        `
          insert into public.approval_workflow_steps (
            organization_id, workflow_version_id, position, name,
            required_permission, minimum_approvals, created_by
          ) values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          context.organizationId,
          createdVersion.id,
          index + 1,
          step.name,
          step.required_permission,
          step.minimum_approvals,
          context.profileId,
        ],
      );
    }
    await insertAuditEvent(database, context, {
      action: "approval_workflow.created",
      after: workflow,
      entityId: workflow.id,
      entityType: "approval_workflow",
    });
    return readWorkflow(client, context.organizationId, workflow.id);
  });
}

export async function createApprovalWorkflowVersion(
  context: RequestContext,
  workflowId: string,
  input: CreateApprovalWorkflowVersionInput,
) {
  requirePermission(context, "approval_workflows.manage");
  assertValidApprovalSteps(
    input.steps.map((step, index) => ({
      minimumApprovals: step.minimum_approvals,
      position: index + 1,
      requiredPermission: step.required_permission,
    })),
  );
  return withTenantTransaction(context, async (database, client) => {
    const workflow = await readWorkflow(
      client,
      context.organizationId,
      workflowId,
    );
    if (workflow.status === "retired") {
      throw new DomainError(
        "INVALID_STATE",
        "Workflow retired tidak dapat diberi versi baru.",
        409,
      );
    }
    const version = await client.query<Row>(
      `
        insert into public.approval_workflow_versions (
          organization_id, workflow_id, version_number, created_by
        )
        select $1, $2, coalesce(max(version_number), 0) + 1, $3
        from public.approval_workflow_versions
        where workflow_id = $2 and organization_id = $1
        returning *
      `,
      [context.organizationId, workflowId, context.profileId],
    );
    const createdVersion = version.rows[0];
    if (!createdVersion) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Versi workflow gagal dibuat.",
        500,
      );
    }
    for (const [index, step] of input.steps.entries()) {
      await client.query(
        `
          insert into public.approval_workflow_steps (
            organization_id, workflow_version_id, position, name,
            required_permission, minimum_approvals, created_by
          ) values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          context.organizationId,
          createdVersion.id,
          index + 1,
          step.name,
          step.required_permission,
          step.minimum_approvals,
          context.profileId,
        ],
      );
    }
    await insertAuditEvent(database, context, {
      action: "approval_workflow.version_created",
      after: createdVersion,
      entityId: workflowId,
      entityType: "approval_workflow",
    });
    return readWorkflow(client, context.organizationId, workflowId);
  });
}

export async function getApprovalWorkflow(
  context: RequestContext,
  workflowId: string,
) {
  requirePermission(context, "approval_workflows.read");
  return withTenantTransaction(context, async (_database, client) =>
    readWorkflow(client, context.organizationId, workflowId),
  );
}

export async function publishApprovalWorkflowVersion(
  context: RequestContext,
  workflowId: string,
  versionId: string,
) {
  requirePermission(context, "approval_workflows.publish");
  return withTenantTransaction(context, async (database, client) => {
    const version = await client.query<Row>(
      `
        select version.*
        from public.approval_workflow_versions version
        where version.id = $1 and version.workflow_id = $2
          and version.organization_id = $3
        for update
      `,
      [versionId, workflowId, context.organizationId],
    );
    const current =
      version.rows[0] ?? notFound("Versi workflow tidak ditemukan.");
    if (current.status !== "draft") {
      throw new DomainError(
        "INVALID_STATE",
        "Hanya versi draft yang dapat dipublikasikan.",
        409,
      );
    }
    const stepCount = await client.query<{ count: number }>(
      `
        select count(*)::int as count
        from public.approval_workflow_steps
        where workflow_version_id = $1 and organization_id = $2
      `,
      [versionId, context.organizationId],
    );
    if ((stepCount.rows[0]?.count ?? 0) < 1) {
      throw new DomainError(
        "INVALID_STATE",
        "Workflow memerlukan minimal satu langkah.",
        409,
      );
    }
    const now = new Date().toISOString();
    await client.query(
      `
        update public.approval_workflow_versions
        set status = 'retired', updated_at = $1
        where workflow_id = $2 and organization_id = $3 and status = 'published'
      `,
      [now, workflowId, context.organizationId],
    );
    const updated = await client.query<Row>(
      `
        update public.approval_workflow_versions
        set status = 'published', published_at = $1, published_by = $2, updated_at = $1
        where id = $3 and organization_id = $4
        returning *
      `,
      [now, context.profileId, versionId, context.organizationId],
    );
    await client.query(
      `
        update public.approval_workflows
        set status = 'active', updated_at = $1, updated_by = $2
        where id = $3 and organization_id = $4
      `,
      [now, context.profileId, workflowId, context.organizationId],
    );
    await insertAuditEvent(database, context, {
      action: "approval_workflow.published",
      after: updated.rows[0],
      before: current,
      entityId: workflowId,
      entityType: "approval_workflow",
    });
    return readWorkflow(client, context.organizationId, workflowId);
  });
}

export async function listApprovalRequests(
  context: RequestContext,
  query: ApprovalListQuery,
) {
  requirePermission(context, "approval_requests.read");
  return withTenantTransaction(context, async (_database, client) => {
    const offset = (query.page - 1) * query.pageSize;
    const values: unknown[] = [context.organizationId];
    const filters = ["request.organization_id = $1"];
    if (query.status) {
      values.push(query.status);
      filters.push(`request.status = $${values.length}`);
    }
    if (query.q) {
      values.push(`%${query.q}%`);
      filters.push(
        `(request.reference_number ilike $${values.length} or request.title ilike $${values.length})`,
      );
    }
    const where = filters.join(" and ");
    const count = await client.query<{ total: number }>(
      `select count(*)::int as total from public.approval_requests request where ${where}`,
      values,
    );
    values.push(query.pageSize, offset);
    const result = await client.query<Row>(
      `
        select request.*, workflow.name as workflow_name,
          version.version_number as workflow_version_number,
          requester.display_name as requester_name
        from public.approval_requests request
        join public.approval_workflow_versions version
          on version.id = request.workflow_version_id
         and version.organization_id = request.organization_id
        join public.approval_workflows workflow
          on workflow.id = version.workflow_id
         and workflow.organization_id = request.organization_id
        join public.profiles requester on requester.id = request.requested_by
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

export async function createApprovalRequest(
  context: RequestContext,
  input: CreateApprovalRequestInput,
) {
  requirePermission(context, "approval_requests.create");
  return withTenantTransaction(context, async (database, client) => {
    const version = await client.query<Row>(
      `
        select version.*, workflow.resource_type, workflow.status as workflow_status
        from public.approval_workflow_versions version
        join public.approval_workflows workflow
          on workflow.id = version.workflow_id
         and workflow.organization_id = version.organization_id
        where version.id = $1 and version.organization_id = $2
      `,
      [input.workflow_version_id, context.organizationId],
    );
    const selected =
      version.rows[0] ?? notFound("Versi workflow approval tidak ditemukan.");
    if (
      selected.status !== "published" ||
      selected.workflow_status !== "active"
    ) {
      throw new DomainError(
        "INVALID_STATE",
        "Gunakan versi workflow yang sedang aktif.",
        409,
      );
    }
    if (selected.resource_type !== input.subject_type) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Tipe subjek tidak sesuai dengan workflow.",
        400,
      );
    }
    const snapshot = await subjectSnapshot(
      client,
      context,
      input.subject_type,
      input.subject_id,
    );
    const request = await client.query<Row>(
      `
        insert into public.approval_requests (
          organization_id, reference_number, workflow_version_id,
          subject_type, subject_id, subject_snapshot, title,
          requested_by, updated_by
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        returning *
      `,
      [
        context.organizationId,
        referenceNumber(),
        input.workflow_version_id,
        input.subject_type,
        input.subject_id,
        JSON.stringify(snapshot),
        input.title,
        context.profileId,
      ],
    );
    const createdRequest = request.rows[0];
    if (!createdRequest) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Permintaan approval gagal dibuat.",
        500,
      );
    }
    await client.query(
      `
        insert into public.approval_request_steps (
          organization_id, approval_request_id, workflow_step_id, position,
          name, required_permission, minimum_approvals
        )
        select organization_id, $1, id, position, name,
          required_permission, minimum_approvals
        from public.approval_workflow_steps
        where workflow_version_id = $2 and organization_id = $3
        order by position
      `,
      [createdRequest.id, input.workflow_version_id, context.organizationId],
    );
    await client.query(
      `
        insert into public.approval_actions (
          organization_id, approval_request_id, cycle_number, action,
          actor_profile_id, from_status, to_status, request_id
        ) values ($1, $2, 1, 'created', $3, null, 'draft', $4)
      `,
      [
        context.organizationId,
        createdRequest.id,
        context.profileId,
        context.requestId,
      ],
    );
    await insertAuditEvent(database, context, {
      action: "approval_request.created",
      after: createdRequest,
      entityId: createdRequest.id,
      entityType: "approval_request",
    });
    return readRequest(client, context.organizationId, createdRequest.id);
  });
}

export async function getApprovalRequest(
  context: RequestContext,
  requestId: string,
) {
  requirePermission(context, "approval_requests.read");
  return withTenantTransaction(context, async (_database, client) =>
    readRequest(client, context.organizationId, requestId),
  );
}

export async function submitApprovalRequest(
  context: RequestContext,
  requestId: string,
  input: ApprovalCommandInput,
) {
  requirePermission(context, "approval_requests.submit");
  return withTenantTransaction(context, async (database, client) => {
    const locked = await client.query<Row>(
      `
        select * from public.approval_requests
        where id = $1 and organization_id = $2
        for update
      `,
      [requestId, context.organizationId],
    );
    const request =
      locked.rows[0] ?? notFound("Permintaan approval tidak ditemukan.");
    const status = asStatus(request.status);
    if (!canSubmitApprovalRequest(status)) {
      throw new DomainError(
        "INVALID_STATE",
        "Permintaan tidak dapat dikirim dari status saat ini.",
        409,
      );
    }
    if (request.requested_by !== context.profileId) {
      throw new DomainError(
        "FORBIDDEN",
        "Hanya pembuat permintaan yang dapat mengirimnya.",
        403,
      );
    }
    const cycle =
      status === "revision_requested" ? Number(request.cycle_number) + 1 : 1;
    const now = new Date().toISOString();
    await client.query(
      `
        update public.approval_request_steps
        set
          status = case when position = 1 then 'in_progress' else 'pending' end,
          approval_count = 0,
          completed_at = null,
          updated_at = $1
        where approval_request_id = $2 and organization_id = $3
      `,
      [now, requestId, context.organizationId],
    );
    const updated = await client.query<Row>(
      `
        update public.approval_requests
        set status = 'in_progress', current_step_position = 1,
          cycle_number = $1, submitted_at = $2, decided_at = null,
          updated_at = $2, updated_by = $3
        where id = $4 and organization_id = $5
        returning *
      `,
      [cycle, now, context.profileId, requestId, context.organizationId],
    );
    await client.query(
      `
        insert into public.approval_actions (
          organization_id, approval_request_id, cycle_number, action,
          actor_profile_id, comment, from_status, to_status, request_id
        ) values ($1, $2, $3, $4, $5, $6, $7, 'in_progress', $8)
      `,
      [
        context.organizationId,
        requestId,
        cycle,
        status === "revision_requested" ? "resubmitted" : "submitted",
        context.profileId,
        input.comment ?? null,
        status,
        context.requestId,
      ],
    );
    await insertAuditEvent(database, context, {
      action:
        status === "revision_requested"
          ? "approval_request.resubmitted"
          : "approval_request.submitted",
      after: updated.rows[0],
      before: request,
      entityId: requestId,
      entityType: "approval_request",
    });
    return readRequest(client, context.organizationId, requestId);
  });
}

export async function decideApprovalRequest(
  context: RequestContext,
  requestId: string,
  input: ApprovalDecisionInput,
) {
  requirePermission(context, "approval_requests.act");
  return withTenantTransaction(context, async (database, client) => {
    const locked = await client.query<Row>(
      `
        select * from public.approval_requests
        where id = $1 and organization_id = $2
        for update
      `,
      [requestId, context.organizationId],
    );
    const request =
      locked.rows[0] ?? notFound("Permintaan approval tidak ditemukan.");
    if (!canActOnApprovalRequest(asStatus(request.status))) {
      throw new DomainError(
        "INVALID_STATE",
        "Permintaan tidak sedang menunggu keputusan.",
        409,
      );
    }
    try {
      assertIndependentApprover(
        String(request.requested_by),
        context.profileId,
      );
    } catch (error) {
      throw new DomainError(
        "FORBIDDEN",
        error instanceof Error ? error.message : "Maker-checker tidak valid.",
        403,
      );
    }
    const stepResult = await client.query<Row>(
      `
        select * from public.approval_request_steps
        where approval_request_id = $1 and organization_id = $2
          and position = $3
        for update
      `,
      [
        requestId,
        context.organizationId,
        Number(request.current_step_position),
      ],
    );
    const step =
      stepResult.rows[0] ?? notFound("Langkah approval aktif tidak ditemukan.");
    if (!context.permissions.has(String(step.required_permission))) {
      throw new DomainError(
        "FORBIDDEN",
        "Anda tidak memiliki permission untuk langkah approval ini.",
        403,
      );
    }
    const duplicate = await client.query(
      `
        select 1 from public.approval_actions
        where approval_request_step_id = $1 and actor_profile_id = $2
          and cycle_number = $3 and action = 'approved'
        limit 1
      `,
      [step.id, context.profileId, request.cycle_number],
    );
    if (duplicate.rowCount) {
      throw new DomainError(
        "CONFLICT",
        "Anda sudah memberi persetujuan pada langkah ini.",
        409,
      );
    }
    const next = await client.query<Row>(
      `
        select * from public.approval_request_steps
        where approval_request_id = $1 and organization_id = $2
          and position > $3
        order by position
        limit 1
      `,
      [requestId, context.organizationId, step.position],
    );
    const approvalCount =
      Number(step.approval_count) + (input.decision === "approved" ? 1 : 0);
    const progress = resolveApprovalProgress({
      approvalCount,
      decision: input.decision,
      hasNextStep: Boolean(next.rows[0]),
      minimumApprovals: Number(step.minimum_approvals),
    });
    const now = new Date().toISOString();
    const stepStatus =
      input.decision === "approved"
        ? progress.stepCompleted
          ? "approved"
          : "in_progress"
        : input.decision;
    await client.query(
      `
        update public.approval_request_steps
        set status = $1, approval_count = $2,
          completed_at = case when $3 then $4::timestamptz else null end,
          updated_at = $4
        where id = $5 and organization_id = $6
      `,
      [
        stepStatus,
        approvalCount,
        progress.stepCompleted,
        now,
        step.id,
        context.organizationId,
      ],
    );
    if (
      input.decision === "approved" &&
      progress.stepCompleted &&
      next.rows[0]
    ) {
      await client.query(
        `
          update public.approval_request_steps
          set status = 'in_progress', updated_at = $1
          where id = $2 and organization_id = $3
        `,
        [now, next.rows[0].id, context.organizationId],
      );
    }
    const currentStepPosition =
      input.decision === "approved" && progress.stepCompleted && next.rows[0]
        ? Number(next.rows[0].position)
        : input.decision === "approved" && !progress.stepCompleted
          ? Number(step.position)
          : null;
    const updated = await client.query<Row>(
      `
        update public.approval_requests
        set status = $1, current_step_position = $2,
          decided_at = case when $1 in ('approved', 'rejected') then $3::timestamptz else null end,
          updated_at = $3, updated_by = $4
        where id = $5 and organization_id = $6
        returning *
      `,
      [
        progress.requestStatus,
        currentStepPosition,
        now,
        context.profileId,
        requestId,
        context.organizationId,
      ],
    );
    await client.query(
      `
        insert into public.approval_actions (
          organization_id, approval_request_id, approval_request_step_id,
          cycle_number, action, actor_profile_id, comment,
          from_status, to_status, request_id
        ) values ($1, $2, $3, $4, $5, $6, $7, 'in_progress', $8, $9)
      `,
      [
        context.organizationId,
        requestId,
        step.id,
        request.cycle_number,
        input.decision,
        context.profileId,
        input.comment,
        progress.requestStatus,
        context.requestId,
      ],
    );
    await insertAuditEvent(database, context, {
      action: `approval_request.${input.decision}`,
      after: updated.rows[0],
      before: request,
      entityId: requestId,
      entityType: "approval_request",
    });
    return readRequest(client, context.organizationId, requestId);
  });
}

export async function cancelApprovalRequest(
  context: RequestContext,
  requestId: string,
  input: ApprovalCommandInput,
) {
  requirePermission(context, "approval_requests.cancel");
  return withTenantTransaction(context, async (database, client) => {
    const locked = await client.query<Row>(
      `
        select * from public.approval_requests
        where id = $1 and organization_id = $2
        for update
      `,
      [requestId, context.organizationId],
    );
    const request =
      locked.rows[0] ?? notFound("Permintaan approval tidak ditemukan.");
    if (!canCancelApprovalRequest(asStatus(request.status))) {
      throw new DomainError(
        "INVALID_STATE",
        "Permintaan final tidak dapat dibatalkan.",
        409,
      );
    }
    const now = new Date().toISOString();
    const updated = await client.query<Row>(
      `
        update public.approval_requests
        set status = 'cancelled', current_step_position = null,
          cancelled_at = $1, updated_at = $1, updated_by = $2
        where id = $3 and organization_id = $4
        returning *
      `,
      [now, context.profileId, requestId, context.organizationId],
    );
    await client.query(
      `
        insert into public.approval_actions (
          organization_id, approval_request_id, cycle_number, action,
          actor_profile_id, comment, from_status, to_status, request_id
        ) values ($1, $2, $3, 'cancelled', $4, $5, $6, 'cancelled', $7)
      `,
      [
        context.organizationId,
        requestId,
        request.cycle_number,
        context.profileId,
        input.comment ?? null,
        request.status,
        context.requestId,
      ],
    );
    await insertAuditEvent(database, context, {
      action: "approval_request.cancelled",
      after: updated.rows[0],
      before: request,
      entityId: requestId,
      entityType: "approval_request",
    });
    return readRequest(client, context.organizationId, requestId);
  });
}
