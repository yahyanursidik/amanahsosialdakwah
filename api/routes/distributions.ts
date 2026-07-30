import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  addDistributionEvidence,
  assignDistribution,
  cancelDistribution,
  completeDistribution,
  confirmDistribution,
  createDistributionPlan,
  executeDistribution,
  getDistributionPlan,
  listDistributionAssignees,
  listDistributionPlans,
  markDistributionReady,
  startDistribution,
  verifyDistribution,
} from "../services/distribution-service";
import type { AppEnv } from "../types";
import {
  addDistributionEvidenceSchema,
  assignDistributionSchema,
  cancelDistributionSchema,
  confirmDistributionSchema,
  createDistributionPlanSchema,
  distributionIdempotencyKeySchema,
  distributionIdParamsSchema,
  distributionListQuerySchema,
  distributionNoteSchema,
  executeDistributionSchema,
  verifyDistributionSchema,
} from "./distribution-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data permintaan distribusi tidak valid.",
      400,
    );
  }
}

function idempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}) {
  const result = distributionIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter dan wajib untuk command distribusi.",
      400,
    );
  }
  return result.data;
}

export const distributionsRoute = new Hono<AppEnv>({ strict: false });

distributionsRoute.get(
  "/",
  zValidator("query", distributionListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listDistributionPlans(
      requestContext,
      context.req.valid("query"),
    );
    return context.json({
      data: result.data,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        requestId: requestContext.requestId,
        total: result.total,
      },
    });
  },
);
distributionsRoute.post(
  "/",
  zValidator("json", createDistributionPlanSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createDistributionPlan(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
distributionsRoute.get("/assignees", async (context) => {
  const requestContext = context.get("requestContext");
  const data = await listDistributionAssignees(requestContext);
  return context.json({ data, meta: { requestId: requestContext.requestId } });
});
distributionsRoute.get(
  "/:id",
  zValidator("param", distributionIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getDistributionPlan(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

distributionsRoute.post(
  "/:id/ready",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", distributionNoteSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await markDistributionReady(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json").notes,
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
distributionsRoute.post(
  "/:id/assign",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", assignDistributionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await assignDistribution(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
distributionsRoute.post(
  "/:id/start",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", distributionNoteSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await startDistribution(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json").notes,
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
distributionsRoute.post(
  "/:id/execute",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", executeDistributionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await executeDistribution(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
distributionsRoute.post(
  "/:id/evidence",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", addDistributionEvidenceSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await addDistributionEvidence(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
distributionsRoute.post(
  "/:id/confirm",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", confirmDistributionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await confirmDistribution(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
distributionsRoute.post(
  "/:id/verify",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", verifyDistributionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await verifyDistribution(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
distributionsRoute.post(
  "/:id/complete",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", distributionNoteSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await completeDistribution(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json").notes,
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
distributionsRoute.post(
  "/:id/cancel",
  zValidator("param", distributionIdParamsSchema, validationHook),
  zValidator("json", cancelDistributionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await cancelDistribution(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
