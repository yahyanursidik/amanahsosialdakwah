import { sql } from "drizzle-orm";
import {
  bigint,
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
  organizations,
  profiles,
} from "../../drizzle/schema";
import { beneficiaryCases } from "./applications-schema";

const canReadTemplates = sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessment_templates.read')`;
const canManageTemplates = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
)`;
const canReadAssessments = sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.read')`;
const canWriteAssessments = sql`private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
)`;

export const assessmentTemplates = pgTable(
  "assessment_templates",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    status: text().default("draft").notNull(),
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
    index("idx_assessment_templates_org_status").on(
      table.organizationId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_templates_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "assessment_templates_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "assessment_templates_updated_by_fkey",
    }).onDelete("set null"),
    unique("assessment_templates_org_code_unique").on(
      table.organizationId,
      table.code,
    ),
    unique("assessment_templates_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("assessment_templates_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadTemplates,
    }),
    pgPolicy("assessment_templates_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_templates_update", {
      for: "update",
      to: ["app_runtime"],
      using: canManageTemplates,
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_templates_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "assessment_templates_status_check",
      sql`status = any (array['draft', 'active', 'retired']::text[])`,
    ),
  ],
).enableRLS();

export const assessmentTemplateVersions = pgTable(
  "assessment_template_versions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    templateId: uuid("template_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: text().default("draft").notNull(),
    passingScore: numeric("passing_score", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    maxScore: numeric("max_score", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }),
    publishedBy: uuid("published_by"),
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
    index("idx_assessment_template_versions_org_status").on(
      table.organizationId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_template_versions_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.templateId, table.organizationId],
      foreignColumns: [
        assessmentTemplates.id,
        assessmentTemplates.organizationId,
      ],
      name: "assessment_template_versions_template_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.publishedBy],
      foreignColumns: [profiles.id],
      name: "assessment_template_versions_published_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "assessment_template_versions_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "assessment_template_versions_updated_by_fkey",
    }).onDelete("set null"),
    unique("assessment_template_versions_number_unique").on(
      table.templateId,
      table.versionNumber,
    ),
    unique("assessment_template_versions_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("assessment_template_versions_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadTemplates,
    }),
    pgPolicy("assessment_template_versions_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_template_versions_update", {
      for: "update",
      to: ["app_runtime"],
      using: canManageTemplates,
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_template_versions_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "assessment_template_versions_status_check",
      sql`status = any (array['draft', 'published', 'retired']::text[])`,
    ),
    check(
      "assessment_template_versions_score_check",
      sql`passing_score >= 0 and max_score >= 0 and passing_score <= max_score`,
    ),
    check(
      "assessment_template_versions_version_check",
      sql`version_number > 0`,
    ),
  ],
).enableRLS();

export const assessmentSections = pgTable(
  "assessment_sections",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    templateVersionId: uuid("template_version_id").notNull(),
    title: text().notNull(),
    description: text(),
    position: integer().notNull(),
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
    index("idx_assessment_sections_version").on(
      table.organizationId,
      table.templateVersionId,
      table.position,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_sections_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.templateVersionId, table.organizationId],
      foreignColumns: [
        assessmentTemplateVersions.id,
        assessmentTemplateVersions.organizationId,
      ],
      name: "assessment_sections_template_version_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "assessment_sections_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "assessment_sections_updated_by_fkey",
    }).onDelete("set null"),
    unique("assessment_sections_position_unique").on(
      table.templateVersionId,
      table.position,
    ),
    unique("assessment_sections_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("assessment_sections_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadTemplates,
    }),
    pgPolicy("assessment_sections_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_sections_update", {
      for: "update",
      to: ["app_runtime"],
      using: canManageTemplates,
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_sections_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check("assessment_sections_position_check", sql`position > 0`),
  ],
).enableRLS();

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    code: text().notNull(),
    prompt: text().notNull(),
    helpText: text("help_text"),
    questionType: text("question_type").notNull(),
    required: boolean().default(false).notNull(),
    evidenceRequired: boolean("evidence_required").default(false).notNull(),
    options: jsonb().default([]).notNull(),
    scoringRules: jsonb("scoring_rules").default({}).notNull(),
    maxScore: numeric("max_score", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    position: integer().notNull(),
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
    index("idx_assessment_questions_section").on(
      table.organizationId,
      table.sectionId,
      table.position,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_questions_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.sectionId, table.organizationId],
      foreignColumns: [
        assessmentSections.id,
        assessmentSections.organizationId,
      ],
      name: "assessment_questions_section_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "assessment_questions_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "assessment_questions_updated_by_fkey",
    }).onDelete("set null"),
    unique("assessment_questions_section_code_unique").on(
      table.sectionId,
      table.code,
    ),
    unique("assessment_questions_position_unique").on(
      table.sectionId,
      table.position,
    ),
    unique("assessment_questions_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("assessment_questions_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadTemplates,
    }),
    pgPolicy("assessment_questions_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_questions_update", {
      for: "update",
      to: ["app_runtime"],
      using: canManageTemplates,
      withCheck: canManageTemplates,
    }),
    pgPolicy("assessment_questions_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "assessment_questions_type_check",
      sql`question_type = any (array['short_text', 'long_text', 'number', 'boolean', 'single_select', 'multi_select', 'date']::text[])`,
    ),
    check(
      "assessment_questions_score_check",
      sql`max_score >= 0`,
    ),
    check("assessment_questions_position_check", sql`position > 0`),
  ],
).enableRLS();

export const caseAssessments = pgTable(
  "case_assessments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    caseId: uuid("case_id").notNull(),
    templateVersionId: uuid("template_version_id").notNull(),
    status: text().default("draft").notNull(),
    assessorProfileId: uuid("assessor_profile_id").notNull(),
    reviewerProfileId: uuid("reviewer_profile_id"),
    totalScore: numeric("total_score", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    maxScore: numeric("max_score", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    scorePercentage: numeric("score_percentage", {
      precision: 7,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
    outcome: text().default("pending").notNull(),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "string",
    }),
    reviewedAt: timestamp("reviewed_at", {
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
    index("idx_case_assessments_org_status").on(
      table.organizationId,
      table.status,
    ),
    index("idx_case_assessments_org_case").on(
      table.organizationId,
      table.caseId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "case_assessments_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.caseId, table.organizationId],
      foreignColumns: [
        beneficiaryCases.id,
        beneficiaryCases.organizationId,
      ],
      name: "case_assessments_case_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.templateVersionId, table.organizationId],
      foreignColumns: [
        assessmentTemplateVersions.id,
        assessmentTemplateVersions.organizationId,
      ],
      name: "case_assessments_template_version_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assessorProfileId],
      foreignColumns: [profiles.id],
      name: "case_assessments_assessor_profile_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.reviewerProfileId],
      foreignColumns: [profiles.id],
      name: "case_assessments_reviewer_profile_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "case_assessments_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "case_assessments_updated_by_fkey",
    }).onDelete("set null"),
    unique("case_assessments_org_reference_unique").on(
      table.organizationId,
      table.referenceNumber,
    ),
    unique("case_assessments_case_version_unique").on(
      table.caseId,
      table.templateVersionId,
    ),
    unique("case_assessments_id_org_unique").on(
      table.id,
      table.organizationId,
    ),
    pgPolicy("case_assessments_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadAssessments,
    }),
    pgPolicy("case_assessments_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canWriteAssessments,
    }),
    pgPolicy("case_assessments_update", {
      for: "update",
      to: ["app_runtime"],
      using: canWriteAssessments,
      withCheck: canWriteAssessments,
    }),
    pgPolicy("case_assessments_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "case_assessments_status_check",
      sql`status = any (array['draft', 'submitted', 'revision_requested', 'approved']::text[])`,
    ),
    check(
      "case_assessments_outcome_check",
      sql`outcome = any (array['pending', 'eligible', 'not_eligible', 'manual_review']::text[])`,
    ),
    check(
      "case_assessments_score_check",
      sql`total_score >= 0 and max_score >= 0 and total_score <= max_score and score_percentage between 0 and 100`,
    ),
  ],
).enableRLS();

export const assessmentAnswers = pgTable(
  "assessment_answers",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
    questionId: uuid("question_id").notNull(),
    value: jsonb().notNull(),
    calculatedScore: numeric("calculated_score", {
      precision: 10,
      scale: 2,
      mode: "number",
    })
      .default(0)
      .notNull(),
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
    index("idx_assessment_answers_assessment").on(
      table.organizationId,
      table.assessmentId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_answers_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assessmentId, table.organizationId],
      foreignColumns: [
        caseAssessments.id,
        caseAssessments.organizationId,
      ],
      name: "assessment_answers_assessment_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.questionId, table.organizationId],
      foreignColumns: [
        assessmentQuestions.id,
        assessmentQuestions.organizationId,
      ],
      name: "assessment_answers_question_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "assessment_answers_created_by_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.updatedBy],
      foreignColumns: [profiles.id],
      name: "assessment_answers_updated_by_fkey",
    }).onDelete("set null"),
    unique("assessment_answers_question_unique").on(
      table.assessmentId,
      table.questionId,
    ),
    pgPolicy("assessment_answers_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadAssessments,
    }),
    pgPolicy("assessment_answers_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canWriteAssessments,
    }),
    pgPolicy("assessment_answers_update", {
      for: "update",
      to: ["app_runtime"],
      using: canWriteAssessments,
      withCheck: canWriteAssessments,
    }),
    pgPolicy("assessment_answers_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "assessment_answers_score_check",
      sql`calculated_score >= 0`,
    ),
  ],
).enableRLS();

export const assessmentEvidence = pgTable(
  "assessment_evidence",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
    questionId: uuid("question_id"),
    storageObjectKey: text("storage_object_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    classification: text().default("restricted").notNull(),
    versionNumber: integer("version_number").default(1).notNull(),
    storageStatus: text("storage_status").default("pending").notNull(),
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
    index("idx_assessment_evidence_assessment").on(
      table.organizationId,
      table.assessmentId,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_evidence_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assessmentId, table.organizationId],
      foreignColumns: [
        caseAssessments.id,
        caseAssessments.organizationId,
      ],
      name: "assessment_evidence_assessment_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.questionId, table.organizationId],
      foreignColumns: [
        assessmentQuestions.id,
        assessmentQuestions.organizationId,
      ],
      name: "assessment_evidence_question_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [profiles.id],
      name: "assessment_evidence_created_by_fkey",
    }).onDelete("set null"),
    unique("assessment_evidence_object_version_unique").on(
      table.storageObjectKey,
      table.versionNumber,
    ),
    pgPolicy("assessment_evidence_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadAssessments,
    }),
    pgPolicy("assessment_evidence_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canWriteAssessments,
    }),
    pgPolicy("assessment_evidence_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("assessment_evidence_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "assessment_evidence_classification_check",
      sql`classification = any (array['confidential', 'restricted']::text[])`,
    ),
    check(
      "assessment_evidence_storage_status_check",
      sql`storage_status = any (array['pending', 'confirmed', 'quarantined']::text[])`,
    ),
    check(
      "assessment_evidence_size_check",
      sql`size_bytes > 0 and version_number > 0`,
    ),
  ],
).enableRLS();

export const assessmentReviews = pgTable(
  "assessment_reviews",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
    decision: text().notNull(),
    comment: text().notNull(),
    reviewerProfileId: uuid("reviewer_profile_id").notNull(),
    scoreSnapshot: jsonb("score_snapshot").notNull(),
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
    index("idx_assessment_reviews_assessment").on(
      table.organizationId,
      table.assessmentId,
      table.createdAt,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_reviews_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assessmentId, table.organizationId],
      foreignColumns: [
        caseAssessments.id,
        caseAssessments.organizationId,
      ],
      name: "assessment_reviews_assessment_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.reviewerProfileId],
      foreignColumns: [profiles.id],
      name: "assessment_reviews_reviewer_profile_id_fkey",
    }).onDelete("restrict"),
    pgPolicy("assessment_reviews_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadAssessments,
    }),
    pgPolicy("assessment_reviews_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: sql`private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.review')`,
    }),
    pgPolicy("assessment_reviews_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("assessment_reviews_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
    check(
      "assessment_reviews_decision_check",
      sql`decision = any (array['approved', 'revision_requested']::text[])`,
    ),
  ],
).enableRLS();

export const assessmentEvents = pgTable(
  "assessment_events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    organizationId: uuid("organization_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
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
    index("idx_assessment_events_assessment").on(
      table.organizationId,
      table.assessmentId,
      table.occurredAt,
    ),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "assessment_events_organization_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.assessmentId, table.organizationId],
      foreignColumns: [
        caseAssessments.id,
        caseAssessments.organizationId,
      ],
      name: "assessment_events_assessment_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.actorProfileId],
      foreignColumns: [profiles.id],
      name: "assessment_events_actor_profile_id_fkey",
    }).onDelete("restrict"),
    pgPolicy("assessment_events_select", {
      for: "select",
      to: ["app_runtime"],
      using: canReadAssessments,
    }),
    pgPolicy("assessment_events_insert", {
      for: "insert",
      to: ["app_runtime"],
      withCheck: canWriteAssessments,
    }),
    pgPolicy("assessment_events_update", {
      for: "update",
      to: ["app_runtime"],
      using: sql`false`,
      withCheck: sql`false`,
    }),
    pgPolicy("assessment_events_delete", {
      for: "delete",
      to: ["app_runtime"],
      using: sql`false`,
    }),
  ],
).enableRLS();
