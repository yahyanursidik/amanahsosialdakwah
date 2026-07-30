import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  crmContacts,
  memberships,
  organizations,
  profiles,
  programs,
} from "../../drizzle/schema";
import { beneficiaryCases } from "./applications-schema";
import { fundAllocations, fundDisbursements } from "./funds-schema";

const readDistribution = sql`private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.read')`;
const manageDistribution = sql`private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.manage')`;
const updateDistribution = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
)`;
const writeDistributionStatus = sql`private.has_active_membership(organization_id) and (
  (status = 'draft' and private.has_permission(organization_id, 'distributions.manage'))
  or (status = 'ready' and private.has_permission(organization_id, 'distributions.ready'))
  or (status = 'assigned' and private.has_permission(organization_id, 'distributions.assign'))
  or (status = 'in_progress' and private.has_permission(organization_id, 'distributions.execute'))
  or (status = 'executed' and private.has_permission(organization_id, 'distributions.execute'))
  or (status = 'confirmed' and private.has_permission(organization_id, 'distributions.confirm'))
  or (status in ('verified', 'revision_required') and private.has_permission(organization_id, 'distributions.verify'))
  or (status = 'completed' and private.has_permission(organization_id, 'distributions.complete'))
  or (status = 'cancelled' and private.has_permission(organization_id, 'distributions.cancel'))
)`;
const writeEvents = sql`private.has_active_membership(organization_id) and actor_profile_id = private.current_profile_id() and (
  private.has_permission(organization_id, 'distributions.manage')
  or private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
)`;
const useIdempotency = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
)`;

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
};

export const distributionPlans = pgTable(
  "distribution_plans",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    disbursementId: uuid("disbursement_id").notNull(),
    allocationId: uuid("allocation_id").notNull(),
    programId: uuid("program_id").notNull(),
    caseId: uuid("case_id").notNull(),
    beneficiaryContactId: uuid("beneficiary_contact_id").notNull(),
    amount: numeric({ precision: 20, scale: 2 }).notNull(),
    currency: text().notNull(),
    distributionMethod: text("distribution_method").notNull(),
    purpose: text().notNull(),
    plannedAt: timestamp("planned_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    requiresConfirmation: boolean("requires_confirmation").default(true).notNull(),
    status: text().default("draft").notNull(),
    cycleNumber: integer("cycle_number").default(1).notNull(),
    cancelledReason: text("cancelled_reason"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: uuid("created_by").notNull(),
    updatedBy: uuid("updated_by"),
    ...timestamps,
  },
  (table) => [
    index("idx_distribution_plans_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_distribution_plans_disbursement").on(
      table.organizationId,
      table.disbursementId,
    ),
    index("idx_distribution_plans_case").on(
      table.organizationId,
      table.caseId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_plans_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.disbursementId, table.organizationId],
      foreignColumns: [
        fundDisbursements.id,
        fundDisbursements.organizationId,
      ],
      name: "distribution_plans_disbursement_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.allocationId, table.organizationId],
      foreignColumns: [fundAllocations.id, fundAllocations.organizationId],
      name: "distribution_plans_allocation_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.programId, table.organizationId],
      foreignColumns: [programs.id, programs.organizationId],
      name: "distribution_plans_program_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.caseId, table.organizationId],
      foreignColumns: [beneficiaryCases.id, beneficiaryCases.organizationId],
      name: "distribution_plans_case_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.beneficiaryContactId, table.organizationId],
      foreignColumns: [crmContacts.id, crmContacts.organizationId],
      name: "distribution_plans_beneficiary_contact_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "distribution_plans_created_by_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "distribution_plans_updated_by_fkey",
    }).onDelete("set null"),
    unique("distribution_plans_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("distribution_plans_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("distribution_plans_select", {
      for: "select",
      to: ["app_runtime"],
      using: readDistribution,
    }),
    pgPolicy("distribution_plans_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: manageDistribution,
    }),
    pgPolicy("distribution_plans_update", {
      for: "update",
      to: ["app_runtime"],
      using: updateDistribution,
      withCheck: writeDistributionStatus,
    }),
    pgPolicy("distribution_plans_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("distribution_plans_amount_check", sql`amount > 0`),
    check("distribution_plans_purpose_check", sql`length(trim(purpose)) >= 10`),
    check("distribution_plans_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check("distribution_plans_cycle_check", sql`cycle_number > 0`),
    check(
      "distribution_plans_method_check",
      sql`distribution_method in ('cash', 'bank_transfer', 'voucher', 'vendor_payment', 'reimbursement')`,
    ),
    check(
      "distribution_plans_status_check",
      sql`status in ('draft', 'ready', 'assigned', 'in_progress', 'executed', 'confirmed', 'revision_required', 'verified', 'completed', 'cancelled')`,
    ),
  ],
).enableRLS();

export const distributionAssignments = pgTable(
  "distribution_assignments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    distributionPlanId: uuid("distribution_plan_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    assigneeProfileId: uuid("assignee_profile_id").notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    status: text().default("active").notNull(),
    assignedBy: uuid("assigned_by").notNull(),
    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "string",
    }),
    notes: text(),
    ...timestamps,
  },
  (table) => [
    index("idx_distribution_assignments_plan").on(
      table.organizationId,
      table.distributionPlanId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_assignments_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.distributionPlanId, table.organizationId],
      foreignColumns: [distributionPlans.id, distributionPlans.organizationId],
      name: "distribution_assignments_plan_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.membershipId, table.organizationId],
      foreignColumns: [memberships.id, memberships.organizationId],
      name: "distribution_assignments_membership_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assigneeProfileId],
      foreignColumns: [profiles.id],
      name: "distribution_assignments_assignee_profile_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assignedBy],
      foreignColumns: [profiles.id],
      name: "distribution_assignments_assigned_by_fkey",
    }).onDelete("restrict"),
    unique("distribution_assignments_sequence_unique").on(
      table.distributionPlanId,
      table.sequenceNumber,
    ),
    pgPolicy("distribution_assignments_select", {
      for: "select",
      to: ["app_runtime"],
      using: readDistribution,
    }),
    pgPolicy("distribution_assignments_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.assign')`,
    }),
    pgPolicy("distribution_assignments_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.assign')`,
      withCheck: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.assign')`,
    }),
    pgPolicy("distribution_assignments_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "distribution_assignments_status_check",
      sql`status in ('active', 'revoked')`,
    ),
    check(
      "distribution_assignments_sequence_check",
      sql`sequence_number > 0`,
    ),
  ],
).enableRLS();

export const distributionExecutions = pgTable(
  "distribution_executions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    distributionPlanId: uuid("distribution_plan_id").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    executionNumber: integer("execution_number").notNull(),
    amount: numeric({ precision: 20, scale: 2 }).notNull(),
    currency: text().notNull(),
    outcome: text().notNull(),
    executedAt: timestamp("executed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    locationNotes: text("location_notes"),
    notes: text(),
    executedBy: uuid("executed_by").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_distribution_executions_plan").on(
      table.organizationId,
      table.distributionPlanId,
      table.cycleNumber,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_executions_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.distributionPlanId, table.organizationId],
      foreignColumns: [distributionPlans.id, distributionPlans.organizationId],
      name: "distribution_executions_plan_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.executedBy],
      foreignColumns: [profiles.id],
      name: "distribution_executions_executed_by_fkey",
    }).onDelete("restrict"),
    unique("distribution_executions_cycle_number_unique").on(
      table.distributionPlanId,
      table.cycleNumber,
      table.executionNumber,
    ),
    pgPolicy("distribution_executions_select", {
      for: "select",
      to: ["app_runtime"],
      using: readDistribution,
    }),
    pgPolicy("distribution_executions_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.execute')
        and executed_by = private.current_profile_id()`,
    }),
    pgPolicy("distribution_executions_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("distribution_executions_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("distribution_executions_amount_check", sql`amount > 0`),
    check("distribution_executions_currency_check", sql`currency ~ '^[A-Z]{3}$'`),
    check(
      "distribution_executions_values_check",
      sql`cycle_number > 0 and execution_number > 0 and outcome in ('delivered', 'failed')`,
    ),
  ],
).enableRLS();

export const distributionConfirmations = pgTable(
  "distribution_confirmations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    distributionPlanId: uuid("distribution_plan_id").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    confirmationMethod: text("confirmation_method").notNull(),
    confirmedByName: text("confirmed_by_name").notNull(),
    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    notes: text(),
    recordedBy: uuid("recorded_by").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_distribution_confirmations_plan").on(
      table.organizationId,
      table.distributionPlanId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_confirmations_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.distributionPlanId, table.organizationId],
      foreignColumns: [distributionPlans.id, distributionPlans.organizationId],
      name: "distribution_confirmations_plan_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [profiles.id],
      name: "distribution_confirmations_recorded_by_fkey",
    }).onDelete("restrict"),
    unique("distribution_confirmations_cycle_unique").on(
      table.distributionPlanId,
      table.cycleNumber,
    ),
    pgPolicy("distribution_confirmations_select", {
      for: "select",
      to: ["app_runtime"],
      using: readDistribution,
    }),
    pgPolicy("distribution_confirmations_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.confirm')
        and recorded_by = private.current_profile_id()`,
    }),
    pgPolicy("distribution_confirmations_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("distribution_confirmations_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("distribution_confirmations_cycle_check", sql`cycle_number > 0`),
    check(
      "distribution_confirmations_name_check",
      sql`length(trim(confirmed_by_name)) >= 2`,
    ),
    check(
      "distribution_confirmations_method_check",
      sql`confirmation_method in ('beneficiary_statement', 'witness', 'phone_call', 'otp')`,
    ),
  ],
).enableRLS();

export const distributionEvidence = pgTable(
  "distribution_evidence",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    distributionPlanId: uuid("distribution_plan_id").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    evidenceKind: text("evidence_kind").notNull(),
    description: text().notNull(),
    capturedAt: timestamp("captured_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    classification: text().default("private").notNull(),
    storageStatus: text("storage_status").default("not_applicable").notNull(),
    fileMetadata: jsonb("file_metadata"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_distribution_evidence_plan").on(
      table.organizationId,
      table.distributionPlanId,
      table.cycleNumber,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_evidence_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.distributionPlanId, table.organizationId],
      foreignColumns: [distributionPlans.id, distributionPlans.organizationId],
      name: "distribution_evidence_plan_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "distribution_evidence_created_by_fkey",
    }).onDelete("restrict"),
    unique("distribution_evidence_sequence_unique").on(
      table.distributionPlanId,
      table.cycleNumber,
      table.sequenceNumber,
    ),
    pgPolicy("distribution_evidence_select", {
      for: "select",
      to: ["app_runtime"],
      using: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distribution_evidence.read')`,
    }),
    pgPolicy("distribution_evidence_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distribution_evidence.manage')
        and created_by = private.current_profile_id()`,
    }),
    pgPolicy("distribution_evidence_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("distribution_evidence_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "distribution_evidence_values_check",
      sql`cycle_number > 0 and sequence_number > 0
        and evidence_kind in ('field_note', 'beneficiary_statement', 'receipt_reference')
        and length(trim(description)) >= 10
        and classification = 'private'
        and storage_status = 'not_applicable'`,
    ),
  ],
).enableRLS();

export const distributionVerifications = pgTable(
  "distribution_verifications",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    distributionPlanId: uuid("distribution_plan_id").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    decision: text().notNull(),
    notes: text().notNull(),
    verifiedBy: uuid("verified_by").notNull(),
    verifiedAt: timestamp("verified_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_distribution_verifications_plan").on(
      table.organizationId,
      table.distributionPlanId,
      table.cycleNumber,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_verifications_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.distributionPlanId, table.organizationId],
      foreignColumns: [distributionPlans.id, distributionPlans.organizationId],
      name: "distribution_verifications_plan_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.verifiedBy],
      foreignColumns: [profiles.id],
      name: "distribution_verifications_verified_by_fkey",
    }).onDelete("restrict"),
    unique("distribution_verifications_cycle_unique").on(
      table.distributionPlanId,
      table.cycleNumber,
    ),
    pgPolicy("distribution_verifications_select", {
      for: "select",
      to: ["app_runtime"],
      using: readDistribution,
    }),
    pgPolicy("distribution_verifications_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.verify')
        and verified_by = private.current_profile_id()`,
    }),
    pgPolicy("distribution_verifications_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("distribution_verifications_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("distribution_verifications_cycle_check", sql`cycle_number > 0`),
    check(
      "distribution_verifications_notes_check",
      sql`length(trim(notes)) >= 10`,
    ),
    check(
      "distribution_verifications_decision_check",
      sql`decision in ('verified', 'revision_required')`,
    ),
  ],
).enableRLS();

export const distributionEvents = pgTable(
  "distribution_events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    distributionPlanId: uuid("distribution_plan_id").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorProfileId: uuid("actor_profile_id").notNull(),
    notes: text(),
    requestId: uuid("request_id").notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_distribution_events_plan").on(
      table.organizationId,
      table.distributionPlanId,
      table.occurredAt,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_events_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.distributionPlanId, table.organizationId],
      foreignColumns: [distributionPlans.id, distributionPlans.organizationId],
      name: "distribution_events_plan_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.actorProfileId],
      foreignColumns: [profiles.id],
      name: "distribution_events_actor_profile_id_fkey",
    }).onDelete("restrict"),
    unique("distribution_events_request_unique").on(
      table.organizationId,
      table.requestId,
    ),
    pgPolicy("distribution_events_select", {
      for: "select",
      to: ["app_runtime"],
      using: readDistribution,
    }),
    pgPolicy("distribution_events_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: writeEvents,
    }),
    pgPolicy("distribution_events_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("distribution_events_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("distribution_events_cycle_check", sql`cycle_number > 0`),
  ],
).enableRLS();

export const distributionIdempotencyRecords = pgTable(
  "distribution_idempotency_records",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    commandType: text("command_type").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text().default("processing").notNull(),
    responseSnapshot: jsonb("response_snapshot"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("idx_distribution_idempotency_created").on(
      table.organizationId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "distribution_idempotency_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "distribution_idempotency_created_by_fkey",
    }).onDelete("restrict"),
    unique("distribution_idempotency_org_key_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    pgPolicy("distribution_idempotency_select", {
      for: "select",
      to: ["app_runtime"],
      using: useIdempotency,
    }),
    pgPolicy("distribution_idempotency_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: useIdempotency,
    }),
    pgPolicy("distribution_idempotency_update", {
      for: "update",
      to: ["app_runtime"],
      using: useIdempotency,
      withCheck: useIdempotency,
    }),
    pgPolicy("distribution_idempotency_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "distribution_idempotency_values_check",
      sql`status in ('processing', 'completed') and length(idempotency_key) between 16 and 200`,
    ),
  ],
).enableRLS();
