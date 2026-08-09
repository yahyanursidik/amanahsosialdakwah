import { randomUUID } from "node:crypto";

import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from "drizzle-orm";

import {
  aidApplications,
  applicationCaseEvents,
  applicationScreenings,
  beneficiaryCases,
} from "../db/applications-schema";
import {
  crmContactRoles,
  crmContacts,
  memberships,
  profiles,
  programs,
} from "../../drizzle/schema";
import {
  applicationStatusAfterScreening,
  canAssignCase,
  canConvertApplication,
  canSubmitApplication,
  type ApplicationStatus,
} from "../domain/application-case-rules";
import { DomainError } from "../domain/errors";
import type {
  AssignCaseInput,
  ConvertApplicationInput,
  CreateApplicationInput,
  ListQuery,
  ScreenApplicationInput,
  SubmitApplicationInput,
} from "../routes/application-case-schemas";
import type { RequestContext } from "../types";
import { withTenantTransaction, type TenantDatabase } from "../db/client";
import { insertAuditEvent } from "./audit-service";
import { requirePermission } from "./request-authorization";

type ApplicationRow = typeof aidApplications.$inferSelect;
type CaseRow = typeof beneficiaryCases.$inferSelect;

function applicationDto(
  row: ApplicationRow,
  related?: { applicantName?: string | null; programName?: string | null },
) {
  return {
    id: row.id,
    organization_id: row.organizationId,
    reference_number: row.referenceNumber,
    program_id: row.programId,
    program_name: related?.programName ?? null,
    applicant_contact_id: row.applicantContactId,
    applicant_name: related?.applicantName ?? null,
    channel: row.channel,
    requested_support: row.requestedSupport,
    urgency: row.urgency,
    status: row.status,
    submitted_at: row.submittedAt,
    screening_completed_at: row.screeningCompletedAt,
    notes: row.notes,
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function caseDto(
  row: CaseRow,
  related?: {
    assigneeName?: string | null;
    beneficiaryName?: string | null;
    programName?: string | null;
  },
) {
  return {
    id: row.id,
    organization_id: row.organizationId,
    reference_number: row.referenceNumber,
    application_id: row.applicationId,
    program_id: row.programId,
    program_name: related?.programName ?? null,
    beneficiary_contact_id: row.beneficiaryContactId,
    beneficiary_name: related?.beneficiaryName ?? null,
    status: row.status,
    assigned_to: row.assignedTo,
    assignee_name: related?.assigneeName ?? null,
    summary: row.summary,
    opened_at: row.openedAt,
    closed_at: row.closedAt,
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function createReference(prefix: "APP" | "CASE"): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}

function assertStatus(
  status: string,
): asserts status is ApplicationStatus {
  const statuses = new Set<ApplicationStatus>([
    "accepted",
    "cancelled",
    "converted",
    "draft",
    "in_screening",
    "rejected",
    "submitted",
  ]);

  if (!statuses.has(status as ApplicationStatus)) {
    throw new DomainError(
      "INVALID_STATE",
      "Status pengajuan tidak dikenal.",
      409,
    );
  }
}

async function insertEvent(
  database: TenantDatabase,
  context: RequestContext,
  values: {
    entityId: string;
    entityType: "application" | "case";
    eventType: string;
    fromStatus?: string | null;
    metadata?: Record<string, unknown>;
    note?: string | null;
    toStatus?: string | null;
  },
) {
  await database.insert(applicationCaseEvents).values({
    actorProfileId: context.profileId,
    entityId: values.entityId,
    entityType: values.entityType,
    eventType: values.eventType,
    fromStatus: values.fromStatus ?? null,
    metadata: values.metadata ?? {},
    note: values.note ?? null,
    organizationId: context.organizationId,
    requestId: context.requestId,
    toStatus: values.toStatus ?? null,
  });
}

async function findLockedApplication(
  database: TenantDatabase,
  context: RequestContext,
  applicationId: string,
) {
  const [application] = await database
    .select()
    .from(aidApplications)
    .where(
      and(
        eq(aidApplications.id, applicationId),
        eq(aidApplications.organizationId, context.organizationId),
      ),
    )
    .for("update")
    .limit(1);

  if (!application) {
    throw new DomainError(
      "NOT_FOUND",
      "Pengajuan tidak ditemukan.",
      404,
    );
  }

  return application;
}

function listWhere(
  organizationId: string,
  status: string | undefined,
  q: string | undefined,
  columns: { reference: typeof aidApplications.referenceNumber },
): SQL {
  const clauses: SQL[] = [eq(aidApplications.organizationId, organizationId)];

  if (status) {
    clauses.push(eq(aidApplications.status, status));
  }

  if (q) {
    const search = or(
      ilike(columns.reference, `%${q}%`),
      ilike(programs.name, `%${q}%`),
      ilike(crmContacts.displayName, `%${q}%`),
    );
    if (search) {
      clauses.push(search);
    }
  }

  return and(...clauses) ?? eq(aidApplications.organizationId, organizationId);
}

export async function listApplications(
  context: RequestContext,
  query: ListQuery,
) {
  requirePermission(context, "applications.read");

  return withTenantTransaction(context, async (database) => {
    const where = listWhere(context.organizationId, query.status, query.q, {
      reference: aidApplications.referenceNumber,
    });
    const offset = (query.page - 1) * query.pageSize;
    const rows = await database
      .select({
        application: aidApplications,
        applicantName: crmContacts.displayName,
        programName: programs.name,
      })
      .from(aidApplications)
      .innerJoin(
        crmContacts,
        and(
          eq(crmContacts.id, aidApplications.applicantContactId),
          eq(crmContacts.organizationId, aidApplications.organizationId),
        ),
      )
      .innerJoin(
        programs,
        and(
          eq(programs.id, aidApplications.programId),
          eq(programs.organizationId, aidApplications.organizationId),
        ),
      )
      .where(where)
      .orderBy(desc(aidApplications.createdAt))
      .limit(query.pageSize)
      .offset(offset);
    const [{ value: total = 0 } = { value: 0 }] = await database
      .select({ value: count() })
      .from(aidApplications)
      .innerJoin(
        crmContacts,
        eq(crmContacts.id, aidApplications.applicantContactId),
      )
      .innerJoin(programs, eq(programs.id, aidApplications.programId))
      .where(where);

    return {
      data: rows.map((row) =>
        applicationDto(row.application, {
          applicantName: row.applicantName,
          programName: row.programName,
        }),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  });
}

export async function getApplication(
  context: RequestContext,
  applicationId: string,
) {
  requirePermission(context, "applications.read");

  return withTenantTransaction(context, async (database) => {
    const [row] = await database
      .select({
        application: aidApplications,
        applicantName: crmContacts.displayName,
        programName: programs.name,
      })
      .from(aidApplications)
      .innerJoin(
        crmContacts,
        eq(crmContacts.id, aidApplications.applicantContactId),
      )
      .innerJoin(programs, eq(programs.id, aidApplications.programId))
      .where(
        and(
          eq(aidApplications.id, applicationId),
          eq(aidApplications.organizationId, context.organizationId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new DomainError(
        "NOT_FOUND",
        "Pengajuan tidak ditemukan.",
        404,
      );
    }

    const screenings = await database
      .select()
      .from(applicationScreenings)
      .where(
        and(
          eq(applicationScreenings.organizationId, context.organizationId),
          eq(applicationScreenings.applicationId, applicationId),
        ),
      )
      .orderBy(desc(applicationScreenings.sequenceNumber));
    const events = await database
      .select()
      .from(applicationCaseEvents)
      .where(
        and(
          eq(applicationCaseEvents.organizationId, context.organizationId),
          eq(applicationCaseEvents.entityType, "application"),
          eq(applicationCaseEvents.entityId, applicationId),
        ),
      )
      .orderBy(desc(applicationCaseEvents.occurredAt));
    const [linkedCase] = await database
      .select()
      .from(beneficiaryCases)
      .where(
        and(
          eq(beneficiaryCases.organizationId, context.organizationId),
          eq(beneficiaryCases.applicationId, applicationId),
        ),
      )
      .limit(1);

    return {
      ...applicationDto(row.application, row),
      screenings: screenings.map((screening) => ({
        id: screening.id,
        sequence_number: screening.sequenceNumber,
        result: screening.result,
        notes: screening.notes,
        risk_flags: screening.riskFlags,
        screened_by: screening.screenedBy,
        screened_at: screening.screenedAt,
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
      linked_case_id: linkedCase?.id ?? null,
    };
  });
}

export async function createApplication(
  context: RequestContext,
  input: CreateApplicationInput,
) {
  requirePermission(context, "applications.manage");

  return withTenantTransaction(context, async (database) => {
    const [program] = await database
      .select({
        id: programs.id,
        isArchived: programs.isArchived,
        status: programs.status,
      })
      .from(programs)
      .where(
        and(
          eq(programs.id, input.program_id),
          eq(programs.organizationId, context.organizationId),
        ),
      )
      .limit(1);

    if (!program || program.status !== "active" || program.isArchived) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Pengajuan hanya dapat dibuat untuk program aktif.",
        400,
      );
    }

    const [beneficiary] = await database
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .innerJoin(
        crmContactRoles,
        and(
          eq(crmContactRoles.contactId, crmContacts.id),
          eq(crmContactRoles.organizationId, context.organizationId),
          eq(crmContactRoles.roleType, "beneficiary"),
          eq(crmContactRoles.status, "active"),
        ),
      )
      .where(
        and(
          eq(crmContacts.id, input.applicant_contact_id),
          eq(crmContacts.organizationId, context.organizationId),
          eq(crmContacts.status, "active"),
        ),
      )
      .limit(1);

    if (!beneficiary) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Kontak pemohon harus merupakan penerima manfaat aktif.",
        400,
      );
    }

    const [created] = await database
      .insert(aidApplications)
      .values({
        applicantContactId: input.applicant_contact_id,
        channel: input.channel,
        createdBy: context.profileId,
        notes: input.notes ?? null,
        organizationId: context.organizationId,
        programId: input.program_id,
        referenceNumber: createReference("APP"),
        requestedSupport: input.requested_support,
        urgency: input.urgency,
        updatedBy: context.profileId,
      })
      .returning();

    if (!created) {
      throw new DomainError(
        "INTERNAL_ERROR",
        "Pengajuan gagal dibuat.",
        500,
      );
    }

    await insertEvent(database, context, {
      entityId: created.id,
      entityType: "application",
      eventType: "created",
      toStatus: created.status,
    });
    await insertAuditEvent(database, context, {
      action: "application.create",
      after: applicationDto(created),
      entityId: created.id,
      entityType: "application",
    });

    return applicationDto(created);
  });
}

export async function submitApplication(
  context: RequestContext,
  applicationId: string,
  input: SubmitApplicationInput,
) {
  requirePermission(context, "applications.submit");

  return withTenantTransaction(context, async (database) => {
    const application = await findLockedApplication(
      database,
      context,
      applicationId,
    );
    assertStatus(application.status);

    if (application.status === "submitted") {
      return applicationDto(application);
    }

    if (!canSubmitApplication(application.status)) {
      throw new DomainError(
        "INVALID_STATE",
        "Hanya pengajuan draft yang dapat dikirim.",
        409,
      );
    }

    const [updated] = await database
      .update(aidApplications)
      .set({
        status: "submitted",
        submittedAt: new Date().toISOString(),
        updatedBy: context.profileId,
      })
      .where(
        and(
          eq(aidApplications.id, application.id),
          eq(aidApplications.organizationId, context.organizationId),
        ),
      )
      .returning();

    if (!updated) {
      throw new DomainError(
        "CONFLICT",
        "Pengajuan berubah saat diproses.",
        409,
      );
    }

    await insertEvent(database, context, {
      entityId: updated.id,
      entityType: "application",
      eventType: "submitted",
      fromStatus: application.status,
      note: input.note ?? null,
      toStatus: updated.status,
    });
    await insertAuditEvent(database, context, {
      action: "application.submit",
      after: applicationDto(updated),
      before: applicationDto(application),
      entityId: updated.id,
      entityType: "application",
    });

    return applicationDto(updated);
  });
}

export async function screenApplication(
  context: RequestContext,
  applicationId: string,
  input: ScreenApplicationInput,
) {
  requirePermission(context, "applications.screen");

  return withTenantTransaction(context, async (database) => {
    const application = await findLockedApplication(
      database,
      context,
      applicationId,
    );
    assertStatus(application.status);

    if (application.createdBy === context.profileId) {
      throw new DomainError(
        "FORBIDDEN",
        "Pembuat pengajuan tidak dapat melakukan screening sendiri.",
        403,
      );
    }

    let nextStatus: ApplicationStatus;
    try {
      nextStatus = applicationStatusAfterScreening(
        application.status,
        input.result,
      );
    } catch {
      throw new DomainError(
        "INVALID_STATE",
        "Pengajuan tidak berada pada status yang dapat di-screening.",
        409,
      );
    }

    const [{ value: screeningCount = 0 } = { value: 0 }] = await database
      .select({ value: count() })
      .from(applicationScreenings)
      .where(
        and(
          eq(applicationScreenings.organizationId, context.organizationId),
          eq(applicationScreenings.applicationId, application.id),
        ),
      );

    await database.insert(applicationScreenings).values({
      applicationId: application.id,
      createdBy: context.profileId,
      notes: input.notes,
      organizationId: context.organizationId,
      result: input.result,
      riskFlags: input.risk_flags,
      screenedBy: context.profileId,
      sequenceNumber: screeningCount + 1,
    });
    const [updated] = await database
      .update(aidApplications)
      .set({
        screeningCompletedAt:
          nextStatus === "accepted" || nextStatus === "rejected"
            ? new Date().toISOString()
            : null,
        status: nextStatus,
        updatedBy: context.profileId,
      })
      .where(eq(aidApplications.id, application.id))
      .returning();

    if (!updated) {
      throw new DomainError(
        "CONFLICT",
        "Pengajuan berubah saat screening.",
        409,
      );
    }

    await insertEvent(database, context, {
      entityId: updated.id,
      entityType: "application",
      eventType: "screened",
      fromStatus: application.status,
      metadata: {
        result: input.result,
        riskFlags: input.risk_flags,
      },
      note: input.notes,
      toStatus: updated.status,
    });
    await insertAuditEvent(database, context, {
      action: "application.screen",
      after: applicationDto(updated),
      before: applicationDto(application),
      entityId: updated.id,
      entityType: "application",
    });

    return applicationDto(updated);
  });
}

export async function convertApplicationToCase(
  context: RequestContext,
  applicationId: string,
  input: ConvertApplicationInput,
) {
  requirePermission(context, "applications.convert");

  return withTenantTransaction(context, async (database) => {
    const application = await findLockedApplication(
      database,
      context,
      applicationId,
    );
    assertStatus(application.status);
    const [existingCase] = await database
      .select()
      .from(beneficiaryCases)
      .where(
        and(
          eq(beneficiaryCases.organizationId, context.organizationId),
          eq(beneficiaryCases.applicationId, application.id),
        ),
      )
      .limit(1);

    if (existingCase) {
      return caseDto(existingCase);
    }

    if (!canConvertApplication(application.status)) {
      throw new DomainError(
        "INVALID_STATE",
        "Hanya pengajuan yang diterima yang dapat dikonversi menjadi kasus.",
        409,
      );
    }

    const [createdCase] = await database
      .insert(beneficiaryCases)
      .values({
        applicationId: application.id,
        beneficiaryContactId: application.applicantContactId,
        createdBy: context.profileId,
        organizationId: context.organizationId,
        programId: application.programId,
        referenceNumber: createReference("CASE"),
        summary: input.summary ?? application.requestedSupport,
        updatedBy: context.profileId,
      })
      .returning();

    if (!createdCase) {
      throw new DomainError("INTERNAL_ERROR", "Kasus gagal dibuat.", 500);
    }

    const [updatedApplication] = await database
      .update(aidApplications)
      .set({
        status: "converted",
        updatedBy: context.profileId,
      })
      .where(eq(aidApplications.id, application.id))
      .returning();

    await insertEvent(database, context, {
      entityId: application.id,
      entityType: "application",
      eventType: "converted_to_case",
      fromStatus: application.status,
      metadata: { caseId: createdCase.id },
      toStatus: "converted",
    });
    await insertEvent(database, context, {
      entityId: createdCase.id,
      entityType: "case",
      eventType: "opened",
      metadata: { applicationId: application.id },
      toStatus: createdCase.status,
    });
    await insertAuditEvent(database, context, {
      action: "application.convert",
      after: {
        application: updatedApplication
          ? applicationDto(updatedApplication)
          : null,
        case: caseDto(createdCase),
      },
      before: applicationDto(application),
      entityId: application.id,
      entityType: "application",
    });

    return caseDto(createdCase);
  });
}

export async function listCases(
  context: RequestContext,
  query: ListQuery,
) {
  requirePermission(context, "cases.read");

  return withTenantTransaction(context, async (database) => {
    const clauses: SQL[] = [
      eq(beneficiaryCases.organizationId, context.organizationId),
    ];
    if (query.status) {
      clauses.push(eq(beneficiaryCases.status, query.status));
    }
    if (query.q) {
      const search = or(
        ilike(beneficiaryCases.referenceNumber, `%${query.q}%`),
        ilike(programs.name, `%${query.q}%`),
        ilike(crmContacts.displayName, `%${query.q}%`),
      );
      if (search) clauses.push(search);
    }
    const where =
      and(...clauses) ??
      eq(beneficiaryCases.organizationId, context.organizationId);
    const rows = await database
      .select({
        assigneeName: profiles.displayName,
        beneficiaryName: crmContacts.displayName,
        caseRecord: beneficiaryCases,
        programName: programs.name,
      })
      .from(beneficiaryCases)
      .innerJoin(
        crmContacts,
        eq(crmContacts.id, beneficiaryCases.beneficiaryContactId),
      )
      .innerJoin(programs, eq(programs.id, beneficiaryCases.programId))
      .leftJoin(profiles, eq(profiles.id, beneficiaryCases.assignedTo))
      .where(where)
      .orderBy(desc(beneficiaryCases.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [{ value: total = 0 } = { value: 0 }] = await database
      .select({ value: count() })
      .from(beneficiaryCases)
      .innerJoin(
        crmContacts,
        eq(crmContacts.id, beneficiaryCases.beneficiaryContactId),
      )
      .innerJoin(programs, eq(programs.id, beneficiaryCases.programId))
      .where(where);

    return {
      data: rows.map((row) =>
        caseDto(row.caseRecord, {
          assigneeName: row.assigneeName,
          beneficiaryName: row.beneficiaryName,
          programName: row.programName,
        }),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  });
}

export async function getCase(context: RequestContext, caseId: string) {
  requirePermission(context, "cases.read");

  return withTenantTransaction(context, async (database) => {
    const [row] = await database
      .select({
        assigneeName: profiles.displayName,
        beneficiaryName: crmContacts.displayName,
        caseRecord: beneficiaryCases,
        programName: programs.name,
      })
      .from(beneficiaryCases)
      .innerJoin(
        crmContacts,
        eq(crmContacts.id, beneficiaryCases.beneficiaryContactId),
      )
      .innerJoin(programs, eq(programs.id, beneficiaryCases.programId))
      .leftJoin(profiles, eq(profiles.id, beneficiaryCases.assignedTo))
      .where(
        and(
          eq(beneficiaryCases.id, caseId),
          eq(beneficiaryCases.organizationId, context.organizationId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new DomainError("NOT_FOUND", "Kasus tidak ditemukan.", 404);
    }

    const events = await database
      .select()
      .from(applicationCaseEvents)
      .where(
        and(
          eq(applicationCaseEvents.organizationId, context.organizationId),
          eq(applicationCaseEvents.entityType, "case"),
          eq(applicationCaseEvents.entityId, caseId),
        ),
      )
      .orderBy(desc(applicationCaseEvents.occurredAt));

    return {
      ...caseDto(row.caseRecord, row),
      events: events.map((event) => ({
        id: event.id,
        event_type: event.eventType,
        from_status: event.fromStatus,
        to_status: event.toStatus,
        note: event.note,
        actor_profile_id: event.actorProfileId,
        occurred_at: event.occurredAt,
      })),
    };
  });
}

export async function assignCase(
  context: RequestContext,
  caseId: string,
  input: AssignCaseInput,
) {
  requirePermission(context, "cases.assign");

  return withTenantTransaction(context, async (database) => {
    const [caseRecord] = await database
      .select()
      .from(beneficiaryCases)
      .where(
        and(
          eq(beneficiaryCases.id, caseId),
          eq(beneficiaryCases.organizationId, context.organizationId),
        ),
      )
      .for("update")
      .limit(1);

    if (!caseRecord) {
      throw new DomainError("NOT_FOUND", "Kasus tidak ditemukan.", 404);
    }

    if (!canAssignCase(caseRecord.status)) {
      throw new DomainError(
        "INVALID_STATE",
        "Kasus pada status ini tidak dapat ditugaskan.",
        409,
      );
    }

    const [assigneeMembership] = await database
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, context.organizationId),
          eq(memberships.profileId, input.assigned_to),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!assigneeMembership) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Penanggung jawab harus memiliki membership aktif di organisasi ini.",
        400,
      );
    }

    const [updated] = await database
      .update(beneficiaryCases)
      .set({
        assignedTo: input.assigned_to,
        status: caseRecord.status === "open" ? "assigned" : caseRecord.status,
        updatedBy: context.profileId,
      })
      .where(eq(beneficiaryCases.id, caseRecord.id))
      .returning();

    if (!updated) {
      throw new DomainError("CONFLICT", "Kasus berubah saat diproses.", 409);
    }

    await insertEvent(database, context, {
      entityId: updated.id,
      entityType: "case",
      eventType: "assigned",
      fromStatus: caseRecord.status,
      metadata: { assignedTo: input.assigned_to },
      note: input.note ?? null,
      toStatus: updated.status,
    });
    await insertAuditEvent(database, context, {
      action: "case.assign",
      after: caseDto(updated),
      before: caseDto(caseRecord),
      entityId: updated.id,
      entityType: "case",
    });

    return caseDto(updated);
  });
}
