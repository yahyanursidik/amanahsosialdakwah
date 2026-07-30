import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  createApprovalWorkflow,
  createApprovalWorkflowVersion,
  getApprovalWorkflow,
  listApprovalWorkflows,
  publishApprovalWorkflowVersion,
} from "../services/approval-service";
import type { AppEnv } from "../types";
import {
  approvalIdParamsSchema,
  approvalListQuerySchema,
  approvalVersionParamsSchema,
  createApprovalWorkflowSchema,
  createApprovalWorkflowVersionSchema,
  publishApprovalWorkflowSchema,
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

export const approvalWorkflowsRoute = new Hono<AppEnv>({ strict: false });

approvalWorkflowsRoute.get(
  "/",
  zValidator("query", approvalListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listApprovalWorkflows(
      requestContext,
      context.req.valid("query"),
    );
    return context.json({
      data: result.data,
      meta: { ...result, data: undefined, requestId: requestContext.requestId },
    });
  },
);

approvalWorkflowsRoute.post(
  "/",
  zValidator("json", createApprovalWorkflowSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createApprovalWorkflow(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

approvalWorkflowsRoute.get(
  "/:id",
  zValidator("param", approvalIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getApprovalWorkflow(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);

approvalWorkflowsRoute.post(
  "/:id/versions",
  zValidator("param", approvalIdParamsSchema, validationHook),
  zValidator("json", createApprovalWorkflowVersionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createApprovalWorkflowVersion(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

approvalWorkflowsRoute.post(
  "/:id/versions/:versionId/publish",
  zValidator("param", approvalVersionParamsSchema, validationHook),
  zValidator("json", publishApprovalWorkflowSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const params = context.req.valid("param");
    const data = await publishApprovalWorkflowVersion(
      requestContext,
      params.id,
      params.versionId,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
