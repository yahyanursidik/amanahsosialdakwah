import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  cancelApprovalRequest,
  createApprovalRequest,
  decideApprovalRequest,
  getApprovalRequest,
  listApprovalRequests,
  submitApprovalRequest,
} from "../services/approval-service";
import type { AppEnv } from "../types";
import {
  approvalCommandSchema,
  approvalDecisionSchema,
  approvalIdParamsSchema,
  approvalListQuerySchema,
  createApprovalRequestSchema,
} from "./approval-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data permintaan tidak valid.",
      400,
    );
  }
}

export const approvalRequestsRoute = new Hono<AppEnv>({ strict: false });

approvalRequestsRoute.get(
  "/",
  zValidator("query", approvalListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listApprovalRequests(
      requestContext,
      context.req.valid("query"),
    );
    return context.json({
      data: result.data,
      meta: { ...result, data: undefined, requestId: requestContext.requestId },
    });
  },
);

approvalRequestsRoute.post(
  "/",
  zValidator("json", createApprovalRequestSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createApprovalRequest(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

approvalRequestsRoute.get(
  "/:id",
  zValidator("param", approvalIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getApprovalRequest(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

approvalRequestsRoute.post(
  "/:id/submit",
  zValidator("param", approvalIdParamsSchema, validationHook),
  zValidator("json", approvalCommandSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await submitApprovalRequest(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

approvalRequestsRoute.post(
  "/:id/decision",
  zValidator("param", approvalIdParamsSchema, validationHook),
  zValidator("json", approvalDecisionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await decideApprovalRequest(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

approvalRequestsRoute.post(
  "/:id/cancel",
  zValidator("param", approvalIdParamsSchema, validationHook),
  zValidator("json", approvalCommandSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await cancelApprovalRequest(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
