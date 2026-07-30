import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from "drizzle-orm";

import {
  assessmentAnswers,
  assessmentEvents,
  assessmentEvidence,
  assessmentQuestions,
  assessmentReviews,
  assessmentSections,
  assessmentTemplates,
  assessmentTemplateVersions,
  caseAssessments,
} from "../db/assessments-schema";
import {
  beneficiaryCases,
} from "../db/applications-schema";
import {
  crmContacts,
  memberships,
  profiles,
} from "../../drizzle/schema";
import {
  assertIndependentReviewer,
  calculateAssessmentScore,
  canEditAssessment,
  canReviewAssessment,
  canSubmitAssessment,
  isAnswerValueValid,
  scoreAnswer,
  type AssessmentStatus,
  type QuestionOption,
  type QuestionType,
  type ScorableQuestion,
  type ScoringRules,
} from "../domain/assessment-rules";
import { DomainError } from "../domain/errors";
import type {
  AssessmentListQuery,
  CreateAssessmentInput,
  CreateAssessmentTemplateInput,
  CreateTemplateVersionInput,
  PublishTemplateVersionInput,
  ReviewAssessmentInput,
  SaveAssessmentAnswersInput,
  SubmitAssessmentInput,
} from "../routes/assessment-schemas";
import type { RequestContext } from "../types";
import { withTenantTransaction, type TenantDatabase } from "../db/client";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type TemplateRow = typeof assessmentTemplates.$inferSelect;
type VersionRow = typeof assessmentTemplateVersions.$inferSelect;
type SectionRow = typeof assessmentSections.$inferSelect;
type QuestionRow = typeof assessmentQuestions.$inferSelect;
type AssessmentRow = typeof caseAssessments.$inferSelect;

function createReference(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `ASM-${date}-${suffix}`;
}

function asAssessmentStatus(status: string): AssessmentStatus {
  if (
    status === "approved" ||
    status === "draft" ||
    status === "revision_requested" ||
    status === "submitted"
  ) {
    return status;
  }

  throw new DomainError(
    "INVALID_STATE",
    "Status asesmen tidak dikenal.",
    409,
  );
}

function normalizeOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      "label" in candidate &&
      "value" in candidate &&
      typeof candidate.label === "string" &&
      typeof candidate.value === "string"
    ) {
      return [{ label: candidate.label, value: candidate.value }];
    }
    return [];
  });
}

function normalizeScoringRules(value: unknown): ScoringRules {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return { type: "none" };
  }

  if (value.type === "exact" && "values" in value) {
    const scores = value.values;
    if (typeof scores === "object" && scores !== null) {
      return {
        type: "exact",
        values: Object.fromEntries(
          Object.entries(scores).flatMap(([key, score]) =>
            typeof score === "number" && Number.isFinite(score)
              ? [[key, score]]
              : [],
          ),
        ),
      };
    }
  }

  if (value.type === "range" && "ranges" in value && Array.isArray(value.ranges)) {
    const ranges = value.ranges.flatMap((candidate) => {
      if (
        typeof candidate !== "object" ||
        candidate === null ||
        !("score" in candidate) ||
        typeof candidate.score !== "number"
      ) {
        return [];
      }

      const min =
        "min" in candidate && typeof candidate.min === "number"
          ? candidate.min
          : undefined;
      const max =
        "max" in candidate && typeof candidate.max === "number"
          ? candidate.max
          : undefined;

      return [{
        ...(min === undefined ? {} : { min }),
        ...(max === undefined ? {} : { max }),
        score: candidate.score,
      }];
    });
    return { ranges, type: "range" };
  }

  return { type: "none" };
}

function questionDefinition(row: QuestionRow): ScorableQuestion {
  return {
    id: row.id,
    maxScore: row.maxScore,
    options: normalizeOptions(row.options),
    questionType: row.questionType as QuestionType,
    required: row.required,
    scoringRules: normalizeScoringRules(row.scoringRules),
  };
}

function questionDto(row: QuestionRow) {
  return {
    id: row.id,
    code: row.code,
    prompt: row.prompt,
    help_text: row.helpText,
    question_type: row.questionType,
    required: row.required,
    evidence_required: row.evidenceRequired,
    options: normalizeOptions(row.options),
    scoring_rules: normalizeScoringRules(row.scoringRules),
    max_score: row.maxScore,
    position: row.position,
  };
}

function versionDto(
  row: VersionRow,
  sections: Array<SectionRow & { questions: QuestionRow[] }> = [],
) {
  return {
    id: row.id,
    version_number: row.versionNumber,
    status: row.status,
    passing_score: row.passingScore,
    max_score: row.maxScore,
    published_at: row.publishedAt,
    published_by: row.publishedBy,
    created_at: row.createdAt,
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      position: section.position,
      questions: section.questions.map(questionDto),
    })),
  };
}

function templateDto(
  row: TemplateRow,
  versions: VersionRow[] = [],
) {
  const publishedVersion = versions.find(
    (version) => version.status === "published",
  );

  return {
    id: row.id,
    organization_id: row.organizationId,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    published_version_id: publishedVersion?.id ?? null,
    published_version_number: publishedVersion?.versionNumber ?? null,
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function assessmentDto(
  row: AssessmentRow,
  related?: {
    assessorName?: string | null;
    beneficiaryName?: string | null;
    caseReference?: string | null;
    reviewerName?: string | null;
    templateName?: string | null;
    versionNumber?: number | null;
  },
) {
  return {
    id: row.id,
    organization_id: row.organizationId,
    reference_number: row.referenceNumber,
    case_id: row.caseId,
    case_reference: related?.caseReference ?? null,
    beneficiary_name: related?.beneficiaryName ?? null,
    template_version_id: row.templateVersionId,
    template_name: related?.templateName ?? null,
    template_version_number: related?.versionNumber ?? null,
    status: row.status,
    assessor_profile_id: row.assessorProfileId,
    assessor_name: related?.assessorName ?? null,
    reviewer_profile_id: row.reviewerProfileId,
    reviewer_name: related?.reviewerName ?? null,
    total_score: row.totalScore,
    max_score: row.maxScore,
    score_percentage: row.scorePercentage,
    outcome: row.outcome,
    submitted_at: row.submittedAt,
    reviewed_at: row.reviewedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

async function insertAssessmentEvent(
  database: TenantDatabase,
  context: RequestContext,
  values: {
    assessmentId: string;
    eventType: string;
    fromStatus?: string | null;
    metadata?: Record<string, unknown>;
    note?: string | null;
    toStatus?: string | null;
  },
): Promise<void> {
  await database.insert(assessmentEvents).values({
    actorProfileId: context.profileId,
    assessmentId: values.assessmentId,
    eventType: values.eventType,
    fromStatus: values.fromStatus ?? null,
    metadata: values.metadata ?? {},
    note: values.note ?? null,
    organizationId: context.organizationId,
    requestId: context.requestId,
    toStatus: values.toStatus ?? null,
  });
}

function validateStructure(
  input: CreateAssessmentTemplateInput | CreateTemplateVersionInput,
): number {
  const codes = input.sections.flatMap((section) =>
    section.questions.map((question) => question.code.toUpperCase()),
  );
  if (new Set(codes).size !== codes.length) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Kode pertanyaan harus unik dalam satu versi template.",
      400,
    );
  }

  const maxScore = input.sections.reduce(
    (sectionTotal, section) =>
      sectionTotal +
      section.questions.reduce(
        (questionTotal, question) => questionTotal + question.max_score,
        0,
      ),
    0,
  );
  if (input.passing_score > maxScore) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Nilai ambang tidak boleh melebihi skor maksimum.",
      400,
    );
  }

  for (const section of input.sections) {
    for (const question of section.questions) {
      if (
        question.max_score > 0 &&
        question.scoring_rules.type === "none"
      ) {
        throw new DomainError(
          "VALIDATION_ERROR",
          `Pertanyaan ${question.code} memiliki skor tanpa aturan scoring.`,
          400,
        );
      }
      if (
        question.max_score === 0 &&
        question.scoring_rules.type !== "none"
      ) {
        throw new DomainError(
          "VALIDATION_ERROR",
          `Pertanyaan ${question.code} memiliki aturan scoring tanpa skor maksimum.`,
          400,
        );
      }
      const definition: ScorableQuestion = {
        id: question.code,
        maxScore: question.max_score,
        options: question.options,
        questionType: question.question_type,
        required: question.required,
        scoringRules:
          question.scoring_rules.type === "range"
            ? {
                ranges: question.scoring_rules.ranges.map((range) => ({
                  ...(range.min === undefined ? {} : { min: range.min }),
                  ...(range.max === undefined ? {} : { max: range.max }),
                  score: range.score,
                })),
                type: "range",
              }
            : question.scoring_rules,
      };

      if (question.scoring_rules.type === "exact") {
        for (const score of Object.values(question.scoring_rules.values)) {
          if (score > question.max_score) {
            throw new DomainError(
              "VALIDATION_ERROR",
              `Skor pada pertanyaan ${question.code} melebihi skor maksimum.`,
              400,
            );
          }
        }
      }

      if (question.scoring_rules.type === "range") {
        for (const range of question.scoring_rules.ranges) {
          if (range.score > definition.maxScore) {
            throw new DomainError(
              "VALIDATION_ERROR",
              `Skor rentang pada pertanyaan ${question.code} melebihi skor maksimum.`,
              400,
            );
          }
        }
      }
    }
  }

  return maxScore;
}

async function insertVersionStructure(
  database: TenantDatabase,
  context: RequestContext,
  templateId: string,
  versionNumber: number,
  input: CreateAssessmentTemplateInput | CreateTemplateVersionInput,
) {
  const maxScore = validateStructure(input);
  const [version] = await database
    .insert(assessmentTemplateVersions)
    .values({
      createdBy: context.profileId,
      maxScore,
      organizationId: context.organizationId,
      passingScore: input.passing_score,
      templateId,
      updatedBy: context.profileId,
      versionNumber,
    })
    .returning();

  if (!version) {
    throw new DomainError(
      "INTERNAL_ERROR",
      "Versi template gagal dibuat.",
      500,
    );
  }

  for (const [sectionIndex, sectionInput] of input.sections.entries()) {
    const [section] = await database
      .insert(assessmentSections)
      .values({
        createdBy: context.profileId,
        description: sectionInput.description ?? null,
        organizationId: context.organizationId,
        position: sectionIndex + 1,
        templateVersionId: version.id,
        title: sectionInput.title,
        updatedBy: context.profileId,
      })
      .returning();

    if (!section) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Bagian template gagal dibuat.",
        500,
      );
    }

    await database.insert(assessmentQuestions).values(
      sectionInput.questions.map((question, questionIndex) => ({
        code: question.code.toUpperCase(),
        createdBy: context.profileId,
        evidenceRequired: question.evidence_required,
        helpText: question.help_text ?? null,
        maxScore: question.max_score,
        options: question.options,
        organizationId: context.organizationId,
        position: questionIndex + 1,
        prompt: question.prompt,
        questionType: question.question_type,
        required: question.required,
        scoringRules: question.scoring_rules,
        sectionId: section.id,
        updatedBy: context.profileId,
      })),
    );
  }

  return version;
}

export async function listAssessmentTemplates(
  context: RequestContext,
  query: AssessmentListQuery,
) {
  requirePermission(context, "assessment_templates.read");

  return withTenantTransaction(context, async (database) => {
    const clauses: SQL[] = [
      eq(assessmentTemplates.organizationId, context.organizationId),
    ];
    if (query.status) {
      clauses.push(eq(assessmentTemplates.status, query.status));
    }
    if (query.q) {
      const search = or(
        ilike(assessmentTemplates.code, `%${query.q}%`),
        ilike(assessmentTemplates.name, `%${query.q}%`),
      );
      if (search) clauses.push(search);
    }
    const where = and(...clauses);
    const offset = (query.page - 1) * query.pageSize;
    const rows = await database
      .select()
      .from(assessmentTemplates)
      .where(where)
      .orderBy(desc(assessmentTemplates.updatedAt))
      .limit(query.pageSize)
      .offset(offset);
    const [{ total = 0 } = {}] = await database
      .select({ total: count() })
      .from(assessmentTemplates)
      .where(where);
    const versions =
      rows.length === 0
        ? []
        : await database
            .select()
            .from(assessmentTemplateVersions)
            .where(
              and(
                eq(
                  assessmentTemplateVersions.organizationId,
                  context.organizationId,
                ),
                inArray(
                  assessmentTemplateVersions.templateId,
                  rows.map((row) => row.id),
                ),
                eq(assessmentTemplateVersions.status, "published"),
              ),
            );

    return {
      data: rows.map((row) =>
        templateDto(
          row,
          versions.filter((version) => version.templateId === row.id),
        ),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  });
}

export async function getAssessmentTemplate(
  context: RequestContext,
  templateId: string,
) {
  requirePermission(context, "assessment_templates.read");

  return withTenantTransaction(context, async (database) => {
    const [template] = await database
      .select()
      .from(assessmentTemplates)
      .where(
        and(
          eq(assessmentTemplates.id, templateId),
          eq(assessmentTemplates.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!template) {
      throw new DomainError("NOT_FOUND", "Template tidak ditemukan.", 404);
    }

    const versions = await database
      .select()
      .from(assessmentTemplateVersions)
      .where(
        and(
          eq(assessmentTemplateVersions.templateId, template.id),
          eq(
            assessmentTemplateVersions.organizationId,
            context.organizationId,
          ),
        ),
      )
      .orderBy(desc(assessmentTemplateVersions.versionNumber));
    const versionIds = versions.map((version) => version.id);
    const sections =
      versionIds.length === 0
        ? []
        : await database
            .select()
            .from(assessmentSections)
            .where(
              and(
                eq(assessmentSections.organizationId, context.organizationId),
                inArray(assessmentSections.templateVersionId, versionIds),
              ),
            )
            .orderBy(assessmentSections.position);
    const sectionIds = sections.map((section) => section.id);
    const questions =
      sectionIds.length === 0
        ? []
        : await database
            .select()
            .from(assessmentQuestions)
            .where(
              and(
                eq(assessmentQuestions.organizationId, context.organizationId),
                inArray(assessmentQuestions.sectionId, sectionIds),
              ),
            )
            .orderBy(assessmentQuestions.position);

    return {
      ...templateDto(template, versions),
      versions: versions.map((version) =>
        versionDto(
          version,
          sections
            .filter((section) => section.templateVersionId === version.id)
            .map((section) => ({
              ...section,
              questions: questions.filter(
                (question) => question.sectionId === section.id,
              ),
            })),
        ),
      ),
    };
  });
}

export async function createAssessmentTemplate(
  context: RequestContext,
  input: CreateAssessmentTemplateInput,
) {
  requirePermission(context, "assessment_templates.manage");

  return withTenantTransaction(context, async (database) => {
    const [template] = await database
      .insert(assessmentTemplates)
      .values({
        code: input.code.toUpperCase(),
        createdBy: context.profileId,
        description: input.description ?? null,
        name: input.name,
        organizationId: context.organizationId,
        updatedBy: context.profileId,
      })
      .returning();
    if (!template) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Template asesmen gagal dibuat.",
        500,
      );
    }

    const version = await insertVersionStructure(
      database,
      context,
      template.id,
      1,
      input,
    );
    await insertAuditEvent(database, context, {
      action: "assessment_template.created",
      after: { template, version },
      entityId: template.id,
      entityType: "assessment_template",
    });

    return {
      ...templateDto(template),
      versions: [versionDto(version)],
    };
  });
}

export async function createAssessmentTemplateVersion(
  context: RequestContext,
  templateId: string,
  input: CreateTemplateVersionInput,
) {
  requirePermission(context, "assessment_templates.manage");

  return withTenantTransaction(context, async (database) => {
    const [template] = await database
      .select()
      .from(assessmentTemplates)
      .where(
        and(
          eq(assessmentTemplates.id, templateId),
          eq(assessmentTemplates.organizationId, context.organizationId),
        ),
      )
      .for("update")
      .limit(1);
    if (!template) {
      throw new DomainError("NOT_FOUND", "Template tidak ditemukan.", 404);
    }
    const [latest] = await database
      .select()
      .from(assessmentTemplateVersions)
      .where(
        and(
          eq(assessmentTemplateVersions.templateId, template.id),
          eq(
            assessmentTemplateVersions.organizationId,
            context.organizationId,
          ),
        ),
      )
      .orderBy(desc(assessmentTemplateVersions.versionNumber))
      .limit(1);
    const version = await insertVersionStructure(
      database,
      context,
      template.id,
      (latest?.versionNumber ?? 0) + 1,
      input,
    );
    await insertAuditEvent(database, context, {
      action: "assessment_template.version_created",
      after: version,
      entityId: template.id,
      entityType: "assessment_template",
    });
    return versionDto(version);
  });
}

export async function publishAssessmentTemplateVersion(
  context: RequestContext,
  templateId: string,
  versionId: string,
  input: PublishTemplateVersionInput,
) {
  requirePermission(context, "assessment_templates.publish");

  return withTenantTransaction(context, async (database) => {
    const [version] = await database
      .select()
      .from(assessmentTemplateVersions)
      .where(
        and(
          eq(assessmentTemplateVersions.id, versionId),
          eq(assessmentTemplateVersions.templateId, templateId),
          eq(
            assessmentTemplateVersions.organizationId,
            context.organizationId,
          ),
        ),
      )
      .for("update")
      .limit(1);
    if (!version) {
      throw new DomainError(
        "NOT_FOUND",
        "Versi template tidak ditemukan.",
        404,
      );
    }
    if (version.status !== "draft") {
      throw new DomainError(
        "INVALID_STATE",
        "Hanya versi draft yang dapat dipublikasikan.",
        409,
      );
    }
    if (version.maxScore <= 0) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Template published wajib memiliki pertanyaan dengan skor.",
        400,
      );
    }

    const sections = await database
      .select({ id: assessmentSections.id })
      .from(assessmentSections)
      .where(
        and(
          eq(assessmentSections.templateVersionId, version.id),
          eq(assessmentSections.organizationId, context.organizationId),
        ),
      );
    const questions =
      sections.length === 0
        ? []
        : await database
            .select()
            .from(assessmentQuestions)
            .where(
              and(
                eq(assessmentQuestions.organizationId, context.organizationId),
                inArray(
                  assessmentQuestions.sectionId,
                  sections.map((section) => section.id),
                ),
              ),
            );
    if (questions.length === 0) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Template harus memiliki minimal satu pertanyaan.",
        400,
      );
    }
    if (questions.some((question) => question.evidenceRequired)) {
      throw new DomainError(
        "INVALID_STATE",
        "Pertanyaan dengan bukti wajib menunggu Evidence Service aktif.",
        409,
      );
    }

    await database
      .update(assessmentTemplateVersions)
      .set({
        status: "retired",
        updatedAt: new Date().toISOString(),
        updatedBy: context.profileId,
      })
      .where(
        and(
          eq(assessmentTemplateVersions.templateId, templateId),
          eq(assessmentTemplateVersions.organizationId, context.organizationId),
          eq(assessmentTemplateVersions.status, "published"),
        ),
      );
    const now = new Date().toISOString();
    const [published] = await database
      .update(assessmentTemplateVersions)
      .set({
        publishedAt: now,
        publishedBy: context.profileId,
        status: "published",
        updatedAt: now,
        updatedBy: context.profileId,
      })
      .where(eq(assessmentTemplateVersions.id, version.id))
      .returning();
    await database
      .update(assessmentTemplates)
      .set({
        status: "active",
        updatedAt: now,
        updatedBy: context.profileId,
      })
      .where(
        and(
          eq(assessmentTemplates.id, templateId),
          eq(assessmentTemplates.organizationId, context.organizationId),
        ),
      );
    await insertAuditEvent(database, context, {
      action: "assessment_template.published",
      after: published,
      before: version,
      entityId: templateId,
      entityType: "assessment_template",
    });

    return {
      ...versionDto(published ?? version),
      note: input.note ?? null,
    };
  });
}

function assessmentListWhere(
  context: RequestContext,
  query: AssessmentListQuery,
): SQL {
  const clauses: SQL[] = [
    eq(caseAssessments.organizationId, context.organizationId),
  ];
  if (query.status) clauses.push(eq(caseAssessments.status, query.status));
  if (query.q) {
    const search = or(
      ilike(caseAssessments.referenceNumber, `%${query.q}%`),
      ilike(beneficiaryCases.referenceNumber, `%${query.q}%`),
      ilike(assessmentTemplates.name, `%${query.q}%`),
      ilike(crmContacts.displayName, `%${query.q}%`),
    );
    if (search) clauses.push(search);
  }
  return and(...clauses) ?? eq(caseAssessments.organizationId, context.organizationId);
}

export async function listAssessments(
  context: RequestContext,
  query: AssessmentListQuery,
) {
  requirePermission(context, "assessments.read");

  return withTenantTransaction(context, async (database) => {
    const where = assessmentListWhere(context, query);
    const offset = (query.page - 1) * query.pageSize;
    const rows = await database
      .select({
        assessment: caseAssessments,
        beneficiaryName: crmContacts.displayName,
        caseReference: beneficiaryCases.referenceNumber,
        templateName: assessmentTemplates.name,
        versionNumber: assessmentTemplateVersions.versionNumber,
      })
      .from(caseAssessments)
      .innerJoin(
        beneficiaryCases,
        and(
          eq(beneficiaryCases.id, caseAssessments.caseId),
          eq(
            beneficiaryCases.organizationId,
            caseAssessments.organizationId,
          ),
        ),
      )
      .innerJoin(
        crmContacts,
        and(
          eq(crmContacts.id, beneficiaryCases.beneficiaryContactId),
          eq(crmContacts.organizationId, beneficiaryCases.organizationId),
        ),
      )
      .innerJoin(
        assessmentTemplateVersions,
        eq(assessmentTemplateVersions.id, caseAssessments.templateVersionId),
      )
      .innerJoin(
        assessmentTemplates,
        eq(assessmentTemplates.id, assessmentTemplateVersions.templateId),
      )
      .where(where)
      .orderBy(desc(caseAssessments.updatedAt))
      .limit(query.pageSize)
      .offset(offset);
    const [{ total = 0 } = {}] = await database
      .select({ total: count() })
      .from(caseAssessments)
      .innerJoin(
        beneficiaryCases,
        eq(beneficiaryCases.id, caseAssessments.caseId),
      )
      .innerJoin(
        crmContacts,
        eq(crmContacts.id, beneficiaryCases.beneficiaryContactId),
      )
      .innerJoin(
        assessmentTemplateVersions,
        eq(assessmentTemplateVersions.id, caseAssessments.templateVersionId),
      )
      .innerJoin(
        assessmentTemplates,
        eq(assessmentTemplates.id, assessmentTemplateVersions.templateId),
      )
      .where(where);

    return {
      data: rows.map((row) =>
        assessmentDto(row.assessment, {
          beneficiaryName: row.beneficiaryName,
          caseReference: row.caseReference,
          templateName: row.templateName,
          versionNumber: row.versionNumber,
        }),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  });
}

async function findLockedAssessment(
  database: TenantDatabase,
  context: RequestContext,
  assessmentId: string,
) {
  const [assessment] = await database
    .select()
    .from(caseAssessments)
    .where(
      and(
        eq(caseAssessments.id, assessmentId),
        eq(caseAssessments.organizationId, context.organizationId),
      ),
    )
    .for("update")
    .limit(1);
  if (!assessment) {
    throw new DomainError("NOT_FOUND", "Asesmen tidak ditemukan.", 404);
  }
  return assessment;
}

async function assessmentQuestionsForVersion(
  database: TenantDatabase,
  context: RequestContext,
  versionId: string,
) {
  return database
    .select({ question: assessmentQuestions, section: assessmentSections })
    .from(assessmentQuestions)
    .innerJoin(
      assessmentSections,
      and(
        eq(assessmentSections.id, assessmentQuestions.sectionId),
        eq(
          assessmentSections.organizationId,
          assessmentQuestions.organizationId,
        ),
      ),
    )
    .where(
      and(
        eq(assessmentSections.templateVersionId, versionId),
        eq(assessmentQuestions.organizationId, context.organizationId),
      ),
    )
    .orderBy(assessmentSections.position, assessmentQuestions.position);
}

export async function getAssessment(
  context: RequestContext,
  assessmentId: string,
) {
  requirePermission(context, "assessments.read");

  return withTenantTransaction(context, async (database) => {
    const [record] = await database
      .select({
        assessment: caseAssessments,
        assessorName: profiles.displayName,
        beneficiaryName: crmContacts.displayName,
        caseReference: beneficiaryCases.referenceNumber,
        templateName: assessmentTemplates.name,
        version: assessmentTemplateVersions,
      })
      .from(caseAssessments)
      .innerJoin(
        beneficiaryCases,
        and(
          eq(beneficiaryCases.id, caseAssessments.caseId),
          eq(
            beneficiaryCases.organizationId,
            caseAssessments.organizationId,
          ),
        ),
      )
      .innerJoin(
        crmContacts,
        and(
          eq(crmContacts.id, beneficiaryCases.beneficiaryContactId),
          eq(crmContacts.organizationId, beneficiaryCases.organizationId),
        ),
      )
      .innerJoin(
        assessmentTemplateVersions,
        eq(assessmentTemplateVersions.id, caseAssessments.templateVersionId),
      )
      .innerJoin(
        assessmentTemplates,
        eq(assessmentTemplates.id, assessmentTemplateVersions.templateId),
      )
      .innerJoin(profiles, eq(profiles.id, caseAssessments.assessorProfileId))
      .where(
        and(
          eq(caseAssessments.id, assessmentId),
          eq(caseAssessments.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!record) {
      throw new DomainError("NOT_FOUND", "Asesmen tidak ditemukan.", 404);
    }
    const questionRows = await assessmentQuestionsForVersion(
      database,
      context,
      record.assessment.templateVersionId,
    );
    const [answers, reviews, events, evidence] = await Promise.all([
      database
        .select()
        .from(assessmentAnswers)
        .where(
          and(
            eq(assessmentAnswers.assessmentId, assessmentId),
            eq(assessmentAnswers.organizationId, context.organizationId),
          ),
        ),
      database
        .select()
        .from(assessmentReviews)
        .where(
          and(
            eq(assessmentReviews.assessmentId, assessmentId),
            eq(assessmentReviews.organizationId, context.organizationId),
          ),
        )
        .orderBy(desc(assessmentReviews.createdAt)),
      database
        .select()
        .from(assessmentEvents)
        .where(
          and(
            eq(assessmentEvents.assessmentId, assessmentId),
            eq(assessmentEvents.organizationId, context.organizationId),
          ),
        )
        .orderBy(assessmentEvents.occurredAt),
      database
        .select()
        .from(assessmentEvidence)
        .where(
          and(
            eq(assessmentEvidence.assessmentId, assessmentId),
            eq(assessmentEvidence.organizationId, context.organizationId),
          ),
        ),
    ]);
    const sectionMap = new Map<
      string,
      SectionRow & { questions: QuestionRow[] }
    >();
    for (const row of questionRows) {
      const existing = sectionMap.get(row.section.id);
      if (existing) existing.questions.push(row.question);
      else sectionMap.set(row.section.id, { ...row.section, questions: [row.question] });
    }

    return {
      ...assessmentDto(record.assessment, {
        assessorName: record.assessorName,
        beneficiaryName: record.beneficiaryName,
        caseReference: record.caseReference,
        templateName: record.templateName,
        versionNumber: record.version.versionNumber,
      }),
      template: versionDto(record.version, [...sectionMap.values()]),
      answers: answers.map((answer) => ({
        id: answer.id,
        question_id: answer.questionId,
        value: answer.value,
        calculated_score: answer.calculatedScore,
        updated_at: answer.updatedAt,
      })),
      reviews: reviews.map((review) => ({
        id: review.id,
        decision: review.decision,
        comment: review.comment,
        reviewer_profile_id: review.reviewerProfileId,
        score_snapshot: review.scoreSnapshot,
        created_at: review.createdAt,
      })),
      events: events.map((event) => ({
        id: event.id,
        event_type: event.eventType,
        from_status: event.fromStatus,
        to_status: event.toStatus,
        note: event.note,
        actor_profile_id: event.actorProfileId,
        occurred_at: event.occurredAt,
      })),
      evidence: evidence.map((item) => ({
        id: item.id,
        question_id: item.questionId,
        original_name: item.originalName,
        mime_type: item.mimeType,
        size_bytes: item.sizeBytes,
        classification: item.classification,
        version_number: item.versionNumber,
        storage_status: item.storageStatus,
        created_at: item.createdAt,
      })),
    };
  });
}

export async function createAssessment(
  context: RequestContext,
  input: CreateAssessmentInput,
) {
  requirePermission(context, "assessments.manage");

  return withTenantTransaction(context, async (database) => {
    const [caseRecord] = await database
      .select()
      .from(beneficiaryCases)
      .where(
        and(
          eq(beneficiaryCases.id, input.case_id),
          eq(beneficiaryCases.organizationId, context.organizationId),
        ),
      )
      .for("update")
      .limit(1);
    if (!caseRecord) {
      throw new DomainError("NOT_FOUND", "Kasus tidak ditemukan.", 404);
    }
    if (!["open", "assigned", "assessment"].includes(caseRecord.status)) {
      throw new DomainError(
        "INVALID_STATE",
        "Kasus tidak dapat memasuki tahap asesmen.",
        409,
      );
    }
    if (
      caseRecord.assignedTo &&
      caseRecord.assignedTo !== context.profileId &&
      !context.permissions.has("cases.manage")
    ) {
      throw new DomainError(
        "FORBIDDEN",
        "Kasus ditugaskan kepada petugas lain.",
        403,
      );
    }
    const [version] = await database
      .select({ template: assessmentTemplates, version: assessmentTemplateVersions })
      .from(assessmentTemplateVersions)
      .innerJoin(
        assessmentTemplates,
        and(
          eq(assessmentTemplates.id, assessmentTemplateVersions.templateId),
          eq(
            assessmentTemplates.organizationId,
            assessmentTemplateVersions.organizationId,
          ),
        ),
      )
      .where(
        and(
          eq(assessmentTemplateVersions.id, input.template_version_id),
          eq(
            assessmentTemplateVersions.organizationId,
            context.organizationId,
          ),
          eq(assessmentTemplateVersions.status, "published"),
          eq(assessmentTemplates.status, "active"),
        ),
      )
      .limit(1);
    if (!version) {
      throw new DomainError(
        "INVALID_STATE",
        "Versi template belum dipublikasikan atau tidak aktif.",
        409,
      );
    }

    const [assessment] = await database
      .insert(caseAssessments)
      .values({
        assessorProfileId: context.profileId,
        caseId: caseRecord.id,
        createdBy: context.profileId,
        maxScore: version.version.maxScore,
        organizationId: context.organizationId,
        referenceNumber: createReference(),
        templateVersionId: version.version.id,
        updatedBy: context.profileId,
      })
      .returning();
    if (!assessment) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Asesmen gagal dibuat.",
        500,
      );
    }
    const now = new Date().toISOString();
    await database
      .update(beneficiaryCases)
      .set({
        status: "assessment",
        updatedAt: now,
        updatedBy: context.profileId,
      })
      .where(eq(beneficiaryCases.id, caseRecord.id));
    await insertAssessmentEvent(database, context, {
      assessmentId: assessment.id,
      eventType: "assessment_created",
      toStatus: "draft",
    });
    await insertAuditEvent(database, context, {
      action: "assessment.created",
      after: assessment,
      entityId: assessment.id,
      entityType: "assessment",
    });
    return assessmentDto(assessment, {
      caseReference: caseRecord.referenceNumber,
      templateName: version.template.name,
      versionNumber: version.version.versionNumber,
    });
  });
}

export async function saveAssessmentAnswers(
  context: RequestContext,
  assessmentId: string,
  input: SaveAssessmentAnswersInput,
) {
  requirePermission(context, "assessments.manage");

  return withTenantTransaction(context, async (database) => {
    const assessment = await findLockedAssessment(
      database,
      context,
      assessmentId,
    );
    if (assessment.assessorProfileId !== context.profileId) {
      throw new DomainError(
        "FORBIDDEN",
        "Hanya asesor yang ditugaskan dapat mengubah jawaban.",
        403,
      );
    }
    if (!canEditAssessment(asAssessmentStatus(assessment.status))) {
      throw new DomainError(
        "INVALID_STATE",
        "Jawaban asesmen tidak dapat diubah pada status ini.",
        409,
      );
    }
    const questionRows = await assessmentQuestionsForVersion(
      database,
      context,
      assessment.templateVersionId,
    );
    const questionMap = new Map(
      questionRows.map((row) => [row.question.id, row.question]),
    );
    const submittedIds = input.answers.map((answer) => answer.question_id);
    if (new Set(submittedIds).size !== submittedIds.length) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Pertanyaan yang sama tidak boleh dikirim dua kali.",
        400,
      );
    }

    for (const answer of input.answers) {
      const question = questionMap.get(answer.question_id);
      if (!question) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Pertanyaan tidak termasuk dalam versi template asesmen.",
          400,
        );
      }
      const definition = questionDefinition(question);
      if (!isAnswerValueValid(definition, answer.value)) {
        throw new DomainError(
          "VALIDATION_ERROR",
          `Jawaban untuk ${question.code} tidak sesuai tipe pertanyaan.`,
          400,
        );
      }
      const calculatedScore = scoreAnswer(definition, answer.value);
      await database
        .insert(assessmentAnswers)
        .values({
          assessmentId,
          calculatedScore,
          createdBy: context.profileId,
          organizationId: context.organizationId,
          questionId: question.id,
          updatedBy: context.profileId,
          value: answer.value,
        })
        .onConflictDoUpdate({
          target: [
            assessmentAnswers.assessmentId,
            assessmentAnswers.questionId,
          ],
          set: {
            calculatedScore,
            updatedAt: new Date().toISOString(),
            updatedBy: context.profileId,
            value: answer.value,
          },
        });
    }

    const answers = await database
      .select()
      .from(assessmentAnswers)
      .where(
        and(
          eq(assessmentAnswers.assessmentId, assessment.id),
          eq(assessmentAnswers.organizationId, context.organizationId),
        ),
      );
    const totalScore = answers.reduce(
      (total, answer) => total + answer.calculatedScore,
      0,
    );
    const percentage =
      assessment.maxScore === 0
        ? 0
        : Math.round((totalScore / assessment.maxScore) * 10_000) / 100;
    const [updated] = await database
      .update(caseAssessments)
      .set({
        scorePercentage: percentage,
        totalScore,
        updatedAt: new Date().toISOString(),
        updatedBy: context.profileId,
      })
      .where(eq(caseAssessments.id, assessment.id))
      .returning();
    await insertAssessmentEvent(database, context, {
      assessmentId,
      eventType: "answers_saved",
      metadata: { answerCount: input.answers.length },
      toStatus: assessment.status,
    });
    return assessmentDto(updated ?? assessment);
  });
}

export async function submitAssessment(
  context: RequestContext,
  assessmentId: string,
  input: SubmitAssessmentInput,
) {
  requirePermission(context, "assessments.submit");

  return withTenantTransaction(context, async (database) => {
    const assessment = await findLockedAssessment(
      database,
      context,
      assessmentId,
    );
    if (assessment.assessorProfileId !== context.profileId) {
      throw new DomainError(
        "FORBIDDEN",
        "Hanya asesor yang ditugaskan dapat mengirim asesmen.",
        403,
      );
    }
    if (!canSubmitAssessment(asAssessmentStatus(assessment.status))) {
      throw new DomainError(
        "INVALID_STATE",
        "Asesmen tidak dapat dikirim pada status ini.",
        409,
      );
    }
    const [version] = await database
      .select()
      .from(assessmentTemplateVersions)
      .where(
        and(
          eq(assessmentTemplateVersions.id, assessment.templateVersionId),
          eq(
            assessmentTemplateVersions.organizationId,
            context.organizationId,
          ),
        ),
      )
      .limit(1);
    if (!version) {
      throw new DomainError(
        "INVALID_STATE",
        "Versi template asesmen tidak tersedia.",
        409,
      );
    }
    const questionRows = await assessmentQuestionsForVersion(
      database,
      context,
      assessment.templateVersionId,
    );
    const answers = await database
      .select()
      .from(assessmentAnswers)
      .where(
        and(
          eq(assessmentAnswers.assessmentId, assessment.id),
          eq(assessmentAnswers.organizationId, context.organizationId),
        ),
      );
    const score = calculateAssessmentScore(
      questionRows.map((row) => questionDefinition(row.question)),
      new Map(answers.map((answer) => [answer.questionId, answer.value])),
      version.passingScore,
    );
    const evidenceRequiredQuestionIds = questionRows
      .filter((row) => row.question.evidenceRequired)
      .map((row) => row.question.id);
    if (evidenceRequiredQuestionIds.length > 0) {
      const evidence = await database
        .select()
        .from(assessmentEvidence)
        .where(
          and(
            eq(assessmentEvidence.assessmentId, assessment.id),
            eq(assessmentEvidence.organizationId, context.organizationId),
            eq(assessmentEvidence.storageStatus, "confirmed"),
          ),
        );
      const evidenceQuestionIds = new Set(
        evidence.map((item) => item.questionId).filter(Boolean),
      );
      if (
        evidenceRequiredQuestionIds.some(
          (questionId) => !evidenceQuestionIds.has(questionId),
        )
      ) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Bukti wajib belum lengkap atau belum terkonfirmasi.",
          400,
        );
      }
    }
    for (const answer of answers) {
      await database
        .update(assessmentAnswers)
        .set({
          calculatedScore: score.questionScores.get(answer.questionId) ?? 0,
          updatedAt: new Date().toISOString(),
          updatedBy: context.profileId,
        })
        .where(eq(assessmentAnswers.id, answer.id));
    }
    const now = new Date().toISOString();
    const [updated] = await database
      .update(caseAssessments)
      .set({
        maxScore: score.maxScore,
        outcome: score.outcome,
        reviewedAt: null,
        reviewerProfileId: null,
        scorePercentage: score.percentage,
        status: "submitted",
        submittedAt: now,
        totalScore: score.totalScore,
        updatedAt: now,
        updatedBy: context.profileId,
      })
      .where(eq(caseAssessments.id, assessment.id))
      .returning();
    await insertAssessmentEvent(database, context, {
      assessmentId,
      eventType: "assessment_submitted",
      fromStatus: assessment.status,
      metadata: {
        maxScore: score.maxScore,
        outcome: score.outcome,
        totalScore: score.totalScore,
      },
      note: input.note ?? null,
      toStatus: "submitted",
    });
    await insertAuditEvent(database, context, {
      action: "assessment.submitted",
      after: updated,
      before: assessment,
      entityId: assessment.id,
      entityType: "assessment",
    });
    return assessmentDto(updated ?? assessment);
  });
}

export async function reviewAssessment(
  context: RequestContext,
  assessmentId: string,
  input: ReviewAssessmentInput,
) {
  requirePermission(context, "assessments.review");

  return withTenantTransaction(context, async (database) => {
    const assessment = await findLockedAssessment(
      database,
      context,
      assessmentId,
    );
    if (!canReviewAssessment(asAssessmentStatus(assessment.status))) {
      throw new DomainError(
        "INVALID_STATE",
        "Asesmen belum siap direview.",
        409,
      );
    }
    try {
      assertIndependentReviewer(
        assessment.assessorProfileId,
        context.profileId,
      );
    } catch (error) {
      throw new DomainError(
        "FORBIDDEN",
        error instanceof Error
          ? error.message
          : "Asesor tidak boleh mereview asesmennya sendiri.",
        403,
      );
    }
    const [activeReviewer] = await database
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, context.organizationId),
          eq(memberships.profileId, context.profileId),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);
    if (!activeReviewer) {
      throw new DomainError(
        "FORBIDDEN",
        "Reviewer tidak memiliki membership aktif.",
        403,
      );
    }
    if (
      input.decision === "approved" &&
      assessment.outcome === "manual_review"
    ) {
      throw new DomainError(
        "INVALID_STATE",
        "Asesmen tanpa scoring otomatis tidak dapat disetujui.",
        409,
      );
    }

    const now = new Date().toISOString();
    const nextStatus =
      input.decision === "approved" ? "approved" : "revision_requested";
    const nextOutcome =
      input.decision === "approved" ? assessment.outcome : "pending";
    await database.insert(assessmentReviews).values({
      assessmentId: assessment.id,
      comment: input.comment,
      decision: input.decision,
      organizationId: context.organizationId,
      reviewerProfileId: context.profileId,
      scoreSnapshot: {
        maxScore: assessment.maxScore,
        outcome: assessment.outcome,
        percentage: assessment.scorePercentage,
        totalScore: assessment.totalScore,
      },
    });
    const [updated] = await database
      .update(caseAssessments)
      .set({
        outcome: nextOutcome,
        reviewedAt: now,
        reviewerProfileId: context.profileId,
        status: nextStatus,
        updatedAt: now,
        updatedBy: context.profileId,
      })
      .where(eq(caseAssessments.id, assessment.id))
      .returning();

    if (input.decision === "approved") {
      await database
        .update(beneficiaryCases)
        .set({
          status:
            assessment.outcome === "eligible"
              ? "eligible"
              : "not_eligible",
          updatedAt: now,
          updatedBy: context.profileId,
        })
        .where(
          and(
            eq(beneficiaryCases.id, assessment.caseId),
            eq(beneficiaryCases.organizationId, context.organizationId),
          ),
        );
    }
    await insertAssessmentEvent(database, context, {
      assessmentId,
      eventType:
        input.decision === "approved"
          ? "assessment_approved"
          : "assessment_revision_requested",
      fromStatus: assessment.status,
      note: input.comment,
      toStatus: nextStatus,
    });
    await insertAuditEvent(database, context, {
      action:
        input.decision === "approved"
          ? "assessment.approved"
          : "assessment.revision_requested",
      after: updated,
      before: assessment,
      entityId: assessment.id,
      entityType: "assessment",
    });
    return assessmentDto(updated ?? assessment);
  });
}
