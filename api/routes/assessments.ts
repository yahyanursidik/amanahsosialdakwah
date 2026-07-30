import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  createAssessment,
  getAssessment,
  listAssessments,
  reviewAssessment,
  saveAssessmentAnswers,
  submitAssessment,
} from "../services/assessment-service";
import type { AppEnv } from "../types";
import {
  assessmentIdParamsSchema,
  assessmentListQuerySchema,
  createAssessmentSchema,
  reviewAssessmentSchema,
  saveAssessmentAnswersSchema,
  submitAssessmentSchema,
} from "./assessment-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data permintaan tidak valid.",
      400,
    );
  }
}

export const assessmentsRoute = new Hono<AppEnv>({ strict: false });

assessmentsRoute.get(
  "/",
  zValidator("query", assessmentListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listAssessments(
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

assessmentsRoute.post(
  "/",
  zValidator("json", createAssessmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const assessment = await createAssessment(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      {
        data: assessment,
        meta: { requestId: requestContext.requestId },
      },
      201,
    );
  },
);

assessmentsRoute.get(
  "/:id",
  zValidator("param", assessmentIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const assessment = await getAssessment(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data: assessment,
      meta: { requestId: requestContext.requestId },
    });
  },
);

assessmentsRoute.post(
  "/:id/answers",
  zValidator("param", assessmentIdParamsSchema, validationHook),
  zValidator("json", saveAssessmentAnswersSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const assessment = await saveAssessmentAnswers(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data: assessment,
      meta: { requestId: requestContext.requestId },
    });
  },
);

assessmentsRoute.post(
  "/:id/submit",
  zValidator("param", assessmentIdParamsSchema, validationHook),
  zValidator("json", submitAssessmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const assessment = await submitAssessment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data: assessment,
      meta: { requestId: requestContext.requestId },
    });
  },
);

assessmentsRoute.post(
  "/:id/review",
  zValidator("param", assessmentIdParamsSchema, validationHook),
  zValidator("json", reviewAssessmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const assessment = await reviewAssessment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data: assessment,
      meta: { requestId: requestContext.requestId },
    });
  },
);
