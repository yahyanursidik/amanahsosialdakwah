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

import {
  crmContacts,
  organizations,
  profiles,
  programs,
} from "../../drizzle/schema";

const canReadApplications = sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.read')`;
const canManageApplications = sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.manage')`;
const canWriteApplicationWorkflow = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
)`;
const canReadCases = sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'cases.read')`;
const canWriteCases = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
  or private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.review')
)`;
const canWriteApplicationCaseTimeline = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
  or private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
)`;
const canWriteAuditTrail = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
  or private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
  or private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
  or private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
  or private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
  or private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
  or private.has_permission(organization_id, 'fund_restrictions.manage')
  or private.has_permission(organization_id, 'fund_commitments.manage')
  or private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.manage')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
  or private.has_permission(organization_id, 'fund_reconciliations.manage')
  or private.has_permission(organization_id, 'distributions.manage')
  or private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
)`;

export const aidApplications = pgTable(
  "aid_applications",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    programId: uuid("program_id").notNull(),
    applicantContactId: uuid("applicant_contact_id").notNull(),
    channel: text().notNull(),
    requestedSupport: text("requested_support").notNull(),
    urgency: text().default("normal").notNull(),
    status: text().default("draft").notNull(),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "string",
    }),
    screeningCompletedAt: timestamp("screening_completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    notes: text(),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_aid_applications_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_aid_applications_org_program").on(
      table.organizationId,
      table.programId,
    ),
    index("idx_aid_applications_org_contact").on(
      table.organizationId,
      table.applicantContactId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "aid_applications_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.programId],
      foreignColumns: [programs.id],
      name: "aid_applications_program_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.applicantContactId],
      foreignColumns: [crmContacts.id],
      name: "aid_applications_applicant_contact_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "aid_applications_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "aid_applications_updated_by_fkey",
    }).onDelete("set null"),
    unique("aid_applications_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    pgPolicy("aid_applications_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadApplications,
    }),
    pgPolicy("aid_applications_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageApplications,
    }),
    pgPolicy("aid_applications_update", {
      for: "update",
      to: ["app_runtime"],
      using: canWriteApplicationWorkflow,
      withCheck: canWriteApplicationWorkflow,
    }),
    pgPolicy("aid_applications_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "aid_applications_channel_check",
      sql`channel = any (array['walk_in', 'referral', 'partner', 'online', 'field']::text[])`,
    ),
    check(
      "aid_applications_urgency_check",
      sql`urgency = any (array['normal', 'urgent', 'emergency']::text[])`,
    ),
    check(
      "aid_applications_status_check",
      sql`status = any (array['draft', 'submitted', 'in_screening', 'accepted', 'rejected', 'converted', 'cancelled']::text[])`,
    ),
  ],
).enableRLS();

export const applicationScreenings = pgTable(
  "application_screenings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    applicationId: uuid("application_id").notNull(),
    sequenceNumber: integer("sequence_number").notNull(),
    result: text().notNull(),
    notes: text().notNull(),
    riskFlags: jsonb("risk_flags").default([]).notNull(),
    screenedBy: uuid("screened_by").notNull(),
    screenedAt: timestamp("screened_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_application_screenings_org_application").on(
      table.organizationId,
      table.applicationId,
      table.sequenceNumber,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "application_screenings_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.applicationId],
      foreignColumns: [aidApplications.id],
      name: "application_screenings_application_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.screenedBy],
      foreignColumns: [profiles.id],
      name: "application_screenings_screened_by_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "application_screenings_created_by_fkey",
    }).onDelete("set null"),
    unique("application_screenings_sequence_unique").on(
      table.organizationId,
      table.applicationId,
      table.sequenceNumber,
    ),
    pgPolicy("application_screenings_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadApplications,
    }),
    pgPolicy("application_screenings_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.screen')`,
    }),
    pgPolicy("application_screenings_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("application_screenings_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "application_screenings_sequence_check",
      sql`sequence_number > 0`,
    ),
    check(
      "application_screenings_result_check",
      sql`result = any (array['pass', 'review', 'reject']::text[])`,
    ),
  ],
).enableRLS();

export const beneficiaryCases = pgTable(
  "beneficiary_cases",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    applicationId: uuid("application_id").notNull(),
    programId: uuid("program_id").notNull(),
    beneficiaryContactId: uuid("beneficiary_contact_id").notNull(),
    status: text().default("open").notNull(),
    assignedTo: uuid("assigned_to"),
    summary: text(),
    openedAt: timestamp("opened_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_beneficiary_cases_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_beneficiary_cases_org_assignee").on(
      table.organizationId,
      table.assignedTo,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "beneficiary_cases_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.applicationId],
      foreignColumns: [aidApplications.id],
      name: "beneficiary_cases_application_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.programId],
      foreignColumns: [programs.id],
      name: "beneficiary_cases_program_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.beneficiaryContactId],
      foreignColumns: [crmContacts.id],
      name: "beneficiary_cases_beneficiary_contact_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [profiles.id],
      name: "beneficiary_cases_assigned_to_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "beneficiary_cases_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "beneficiary_cases_updated_by_fkey",
    }).onDelete("set null"),
    unique("beneficiary_cases_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("beneficiary_cases_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("beneficiary_cases_application_unique").on(table.applicationId),
    pgPolicy("beneficiary_cases_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadCases,
    }),
    pgPolicy("beneficiary_cases_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.convert')`,
    }),
    pgPolicy("beneficiary_cases_update", {
      for: "update",
      to: ["app_runtime"],
      using: canWriteCases,
      withCheck: canWriteCases,
    }),
    pgPolicy("beneficiary_cases_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "beneficiary_cases_status_check",
      sql`status = any (array['open', 'assigned', 'assessment', 'verified', 'eligible', 'not_eligible', 'closed', 'cancelled']::text[])`,
    ),
  ],
).enableRLS();

export const applicationCaseEvents = pgTable(
  "application_case_events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    note: text(),
    metadata: jsonb().default({}).notNull(),
    actorProfileId: uuid("actor_profile_id").notNull(),
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
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_application_case_events_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId,
      table.occurredAt,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "application_case_events_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.actorProfileId],
      foreignColumns: [profiles.id],
      name: "application_case_events_actor_profile_id_fkey",
    }).onDelete("restrict"),
    pgPolicy("application_case_events_select", {
      for: "select",
      to: ["app_runtime"],
      using: sql`private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'applications.read')
        or private.has_permission(organization_id, 'cases.read')
      )`,
    }),
    pgPolicy("application_case_events_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canWriteApplicationCaseTimeline,
    }),
    pgPolicy("application_case_events_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("application_case_events_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "application_case_events_entity_type_check",
      sql`entity_type = any (array['application', 'case']::text[])`,
    ),
  ],
).enableRLS();

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    requestId: uuid("request_id").notNull(),
    actorProfileId: uuid("actor_profile_id").notNull(),
    action: text().notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
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
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_audit_events_org_entity").on(
      table.organizationId,
      table.entityType,
      table.entityId,
      table.occurredAt,
    ),
    index("idx_audit_events_request").on(table.requestId),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "audit_events_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.actorProfileId],
      foreignColumns: [profiles.id],
      name: "audit_events_actor_profile_id_fkey",
    }).onDelete("restrict"),
    pgPolicy("audit_events_select", {
      for: "select",
      to: ["app_runtime"],
      using: sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'audit.read')`,
    }),
    pgPolicy("audit_events_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canWriteAuditTrail,
    }),
    pgPolicy("audit_events_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("audit_events_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
  ],
).enableRLS();
