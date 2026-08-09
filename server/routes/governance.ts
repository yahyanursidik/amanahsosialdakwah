import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  createComplaint,
  createCorrectiveAction,
  createGovernanceIncident,
  createRiskFlag,
  listAuditEvents,
  listComplaints,
  listCorrectiveActions,
  listGovernanceIncidents,
  listRiskFlags,
  transitionGovernanceRecord,
} from "../services/governance-service";
import type { AppEnv } from "../types";
import {
  createComplaintSchema,
  createCorrectiveActionSchema,
  createGovernanceIncidentSchema,
  createRiskFlagSchema,
  governanceIdParamsSchema,
  governanceListQuerySchema,
  governanceTransitionSchema,
} from "./governance-schemas";

export const governanceRoute = new Hono<AppEnv>({ strict: false });
const invalid = (result: { success: boolean }) => {
  if (!result.success) throw new DomainError("VALIDATION_ERROR", "Data tata kelola tidak valid.", 400);
};
const envelope = (data: unknown, requestId: string, status = 200) => ({ data, meta: { requestId }, status });
const listEnvelope = (result: { data: unknown[]; page: number; pageSize: number; total: number }, requestId: string) => ({ data: result.data, meta: { page: result.page, pageSize: result.pageSize, total: result.total, requestId } });

const lists = [
  ["/risks", listRiskFlags],
  ["/incidents", listGovernanceIncidents],
  ["/complaints", listComplaints],
  ["/corrective-actions", listCorrectiveActions],
  ["/audit-events", listAuditEvents],
] as const;
for (const [path, handler] of lists) {
  governanceRoute.get(path, zValidator("query", governanceListQuerySchema, invalid), async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(listEnvelope(await handler(requestContext, context.req.valid("query")), requestContext.requestId));
  });
}

governanceRoute.post("/risks", zValidator("json", createRiskFlagSchema, invalid), async (context) => {
  const requestContext = context.get("requestContext");
  const result = envelope(await createRiskFlag(requestContext, context.req.valid("json")), requestContext.requestId, 201);
  return context.json({ data: result.data, meta: result.meta }, 201);
});
governanceRoute.post("/incidents", zValidator("json", createGovernanceIncidentSchema, invalid), async (context) => {
  const requestContext = context.get("requestContext");
  const result = envelope(await createGovernanceIncident(requestContext, context.req.valid("json")), requestContext.requestId, 201);
  return context.json({ data: result.data, meta: result.meta }, 201);
});
governanceRoute.post("/complaints", zValidator("json", createComplaintSchema, invalid), async (context) => {
  const requestContext = context.get("requestContext");
  const result = envelope(await createComplaint(requestContext, context.req.valid("json")), requestContext.requestId, 201);
  return context.json({ data: result.data, meta: result.meta }, 201);
});
governanceRoute.post("/corrective-actions", zValidator("json", createCorrectiveActionSchema, invalid), async (context) => {
  const requestContext = context.get("requestContext");
  const result = envelope(await createCorrectiveAction(requestContext, context.req.valid("json")), requestContext.requestId, 201);
  return context.json({ data: result.data, meta: result.meta }, 201);
});

const transitions = [
  ["/risks/:id/transition", "risk_flag"],
  ["/incidents/:id/transition", "incident"],
  ["/complaints/:id/transition", "complaint"],
  ["/corrective-actions/:id/transition", "corrective_action"],
] as const;
for (const [path, type] of transitions) {
  governanceRoute.post(path, zValidator("param", governanceIdParamsSchema, invalid), zValidator("json", governanceTransitionSchema, invalid), async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(envelope(await transitionGovernanceRecord(requestContext, type, context.req.valid("param").id, context.req.valid("json")), requestContext.requestId));
  });
}
