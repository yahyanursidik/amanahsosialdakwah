import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations, profiles } from "../../drizzle/schema";

const canReadWorkflows = sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_workflows.read')`;
const canManageWorkflows = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
)`;
const canReadRequests = sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_requests.read')`;
const canCreateRequests = sql`private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'approval_requests.create')
  and requested_by = private.current_profile_id()`;
const canUpdateRequests = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
  or (
    requested_by = private.current_profile_id()
    and private.has_permission(organization_id, 'approval_requests.submit')
  )
)`;
const canWriteRequestStatus = sql`private.has_active_membership(organization_id) and (
  (status = 'draft' and requested_by = private.current_profile_id()
    and private.has_permission(organization_id, 'approval_requests.create'))
  or (status = 'in_progress' and (
    private.has_permission(organization_id, 'approval_requests.act')
    or (
      requested_by = private.current_profile_id()
      and private.has_permission(organization_id, 'approval_requests.submit')
    )
  ))
  or (status in ('approved', 'rejected', 'revision_requested')
    and private.has_permission(organization_id, 'approval_requests.act'))
  or (status = 'cancelled'
    and private.has_permission(organization_id, 'approval_requests.cancel'))
)`;
const canInsertRequestSteps = sql`private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'approval_requests.create')`;
const canUpdateRequestSteps = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, required_permission)
)`;
const canInsertActions = sql`private.has_active_membership(organization_id)
  and actor_profile_id = private.current_profile_id()
  and (
    (action = 'created' and private.has_permission(organization_id, 'approval_requests.create'))
    or (action in ('submitted', 'resubmitted') and private.has_permission(organization_id, 'approval_requests.submit'))
    or (
      action in ('approved', 'rejected', 'revision_requested')
      and approval_request_step_id is not null
      and private.has_permission(
        organization_id,
        (select step.required_permission from public.approval_request_steps step where step.id = approval_request_step_id)
      )
    )
    or (action = 'cancelled' and private.has_permission(organization_id, 'approval_requests.cancel'))
  )`;

export const approvalWorkflows = pgTable(
  "approval_workflows",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    resourceType: text("resource_type").notNull(),
    status: text().default("draft").notNull(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_approval_workflows_org_status").on(
      table.organizationId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "approval_workflows_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "approval_workflows_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "approval_workflows_updated_by_fkey",
    }).onDelete("set null"),
    unique("approval_workflows_org_code_unique").on(
      table.organizationId,
      table.code,
    ),
    unique("approval_workflows_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("approval_workflows_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadWorkflows,
    }),
    pgPolicy("approval_workflows_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageWorkflows,
    }),
    pgPolicy("approval_workflows_update", {
      for: "update",
      to: ["app_runtime"],
      using: canManageWorkflows,
      withCheck: canManageWorkflows,
    }),
    pgPolicy("approval_workflows_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "approval_workflows_status_check",
      sql`status = any (array['draft', 'active', 'retired']::text[])`,
    ),
    check(
      "approval_workflows_resource_type_check",
      sql`resource_type = any (array['assessment', 'case', 'fund_allocation']::text[])`,
    ),
  ],
).enableRLS();

export const approvalWorkflowVersions = pgTable(
  "approval_workflow_versions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    workflowId: uuid("workflow_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: text().default("draft").notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
    publishedBy: uuid("published_by"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_approval_workflow_versions_org_status").on(
      table.organizationId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "approval_workflow_versions_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workflowId, table.organizationId],
      foreignColumns: [approvalWorkflows.id, approvalWorkflows.organizationId],
      name: "approval_workflow_versions_workflow_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.publishedBy],
      foreignColumns: [profiles.id],
      name: "approval_workflow_versions_published_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "approval_workflow_versions_created_by_fkey",
    }).onDelete("set null"),
    unique("approval_workflow_versions_number_unique").on(
      table.workflowId,
      table.versionNumber,
    ),
    unique("approval_workflow_versions_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("approval_workflow_versions_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadWorkflows,
    }),
    pgPolicy("approval_workflow_versions_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageWorkflows,
    }),
    pgPolicy("approval_workflow_versions_update", {
      for: "update",
      to: ["app_runtime"],
      using: canManageWorkflows,
      withCheck: canManageWorkflows,
    }),
    pgPolicy("approval_workflow_versions_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "approval_workflow_versions_status_check",
      sql`status = any (array['draft', 'published', 'retired']::text[])`,
    ),
    check("approval_workflow_versions_number_check", sql`version_number > 0`),
  ],
).enableRLS();

export const approvalWorkflowSteps = pgTable(
  "approval_workflow_steps",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    workflowVersionId: uuid("workflow_version_id").notNull(),
    position: integer().notNull(),
    name: text().notNull(),
    requiredPermission: text("required_permission").notNull(),
    minimumApprovals: integer("minimum_approvals").default(1).notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_approval_workflow_steps_version").on(
      table.organizationId,
      table.workflowVersionId,
      table.position,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "approval_workflow_steps_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workflowVersionId, table.organizationId],
      foreignColumns: [
        approvalWorkflowVersions.id,
        approvalWorkflowVersions.organizationId,
      ],
      name: "approval_workflow_steps_version_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "approval_workflow_steps_created_by_fkey",
    }).onDelete("set null"),
    unique("approval_workflow_steps_position_unique").on(
      table.workflowVersionId,
      table.position,
    ),
    unique("approval_workflow_steps_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("approval_workflow_steps_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadWorkflows,
    }),
    pgPolicy("approval_workflow_steps_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageWorkflows,
    }),
    pgPolicy("approval_workflow_steps_update", {
      for: "update",
      to: ["app_runtime"],
      using: canManageWorkflows,
      withCheck: canManageWorkflows,
    }),
    pgPolicy("approval_workflow_steps_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "approval_workflow_steps_values_check",
      sql`position > 0 and minimum_approvals > 0`,
    ),
  ],
).enableRLS();

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    workflowVersionId: uuid("workflow_version_id").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    subjectSnapshot: jsonb("subject_snapshot").notNull(),
    title: text().notNull(),
    status: text().default("draft").notNull(),
    currentStepPosition: integer("current_step_position"),
    cycleNumber: integer("cycle_number").default(1).notNull(),
    requestedBy: uuid("requested_by").notNull(),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "string",
    }),
    decidedAt: timestamp("decided_at", {
      withTimezone: true,
      mode: "string",
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    index("idx_approval_requests_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_approval_requests_subject").on(
      table.organizationId,
      table.subjectType,
      table.subjectId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "approval_requests_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workflowVersionId, table.organizationId],
      foreignColumns: [
        approvalWorkflowVersions.id,
        approvalWorkflowVersions.organizationId,
      ],
      name: "approval_requests_workflow_version_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.requestedBy],
      foreignColumns: [profiles.id],
      name: "approval_requests_requested_by_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "approval_requests_updated_by_fkey",
    }).onDelete("set null"),
    unique("approval_requests_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("approval_requests_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("approval_requests_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadRequests,
    }),
    pgPolicy("approval_requests_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canCreateRequests,
    }),
    pgPolicy("approval_requests_update", {
      for: "update",
      to: ["app_runtime"],
      using: canUpdateRequests,
      withCheck: canWriteRequestStatus,
    }),
    pgPolicy("approval_requests_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "approval_requests_status_check",
      sql`status = any (array['draft', 'in_progress', 'approved', 'rejected', 'revision_requested', 'cancelled']::text[])`,
    ),
    check(
      "approval_requests_subject_type_check",
      sql`subject_type = any (array['assessment', 'case', 'fund_allocation']::text[])`,
    ),
    check("approval_requests_cycle_check", sql`cycle_number > 0`),
  ],
).enableRLS();

export const approvalRequestSteps = pgTable(
  "approval_request_steps",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    approvalRequestId: uuid("approval_request_id").notNull(),
    workflowStepId: uuid("workflow_step_id").notNull(),
    position: integer().notNull(),
    name: text().notNull(),
    requiredPermission: text("required_permission").notNull(),
    minimumApprovals: integer("minimum_approvals").notNull(),
    approvalCount: integer("approval_count").default(0).notNull(),
    status: text().default("pending").notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_approval_request_steps_request").on(
      table.organizationId,
      table.approvalRequestId,
      table.position,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "approval_request_steps_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.approvalRequestId, table.organizationId],
      foreignColumns: [approvalRequests.id, approvalRequests.organizationId],
      name: "approval_request_steps_request_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workflowStepId, table.organizationId],
      foreignColumns: [
        approvalWorkflowSteps.id,
        approvalWorkflowSteps.organizationId,
      ],
      name: "approval_request_steps_workflow_step_id_fkey",
    }).onDelete("restrict"),
    unique("approval_request_steps_position_unique").on(
      table.approvalRequestId,
      table.position,
    ),
    unique("approval_request_steps_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("approval_request_steps_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadRequests,
    }),
    pgPolicy("approval_request_steps_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canInsertRequestSteps,
    }),
    pgPolicy("approval_request_steps_update", {
      for: "update",
      to: ["app_runtime"],
      using: canUpdateRequestSteps,
      withCheck: canUpdateRequestSteps,
    }),
    pgPolicy("approval_request_steps_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "approval_request_steps_status_check",
      sql`status = any (array['pending', 'in_progress', 'approved', 'rejected', 'revision_requested']::text[])`,
    ),
    check(
      "approval_request_steps_values_check",
      sql`position > 0 and minimum_approvals > 0 and approval_count >= 0 and approval_count <= minimum_approvals`,
    ),
  ],
).enableRLS();

export const approvalActions = pgTable(
  "approval_actions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    approvalRequestId: uuid("approval_request_id").notNull(),
    approvalRequestStepId: uuid("approval_request_step_id"),
    cycleNumber: integer("cycle_number").notNull(),
    action: text().notNull(),
    actorProfileId: uuid("actor_profile_id").notNull(),
    comment: text(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    requestId: uuid("request_id").notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_approval_actions_request").on(
      table.organizationId,
      table.approvalRequestId,
      table.occurredAt,
    ),
    index("idx_approval_actions_actor").on(
      table.organizationId,
      table.actorProfileId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "approval_actions_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.approvalRequestId, table.organizationId],
      foreignColumns: [approvalRequests.id, approvalRequests.organizationId],
      name: "approval_actions_request_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.approvalRequestStepId, table.organizationId],
      foreignColumns: [
        approvalRequestSteps.id,
        approvalRequestSteps.organizationId,
      ],
      name: "approval_actions_request_step_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.actorProfileId],
      foreignColumns: [profiles.id],
      name: "approval_actions_actor_profile_id_fkey",
    }).onDelete("restrict"),
    unique("approval_actions_request_id_unique").on(table.requestId),
    pgPolicy("approval_actions_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadRequests,
    }),
    pgPolicy("approval_actions_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canInsertActions,
    }),
    pgPolicy("approval_actions_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("approval_actions_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "approval_actions_action_check",
      sql`action = any (array['created', 'submitted', 'approved', 'rejected', 'revision_requested', 'resubmitted', 'cancelled']::text[])`,
    ),
    check("approval_actions_cycle_check", sql`cycle_number > 0`),
  ],
).enableRLS();
