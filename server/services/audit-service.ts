import { auditEvents } from "../db/applications-schema";
import type { TenantDatabase } from "../db/client";
import type { RequestContext } from "../types";

export async function insertAuditEvent(
  database: TenantDatabase,
  context: RequestContext,
  values: {
    action: string;
    after?: unknown;
    before?: unknown;
    entityId: string;
    entityType: string;
  },
): Promise<void> {
  await database.insert(auditEvents).values({
    action: values.action,
    actorProfileId: context.profileId,
    afterData: values.after ?? null,
    beforeData: values.before ?? null,
    entityId: values.entityId,
    entityType: values.entityType,
    organizationId: context.organizationId,
    requestId: context.requestId,
  });
}
