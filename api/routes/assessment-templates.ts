import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  createAssessmentTemplate,
  createAssessmentTemplateVersion,
  getAssessmentTemplate,
  listAssessmentTemplates,
  publishAssessmentTemplateVersion,
} from "../services/assessment-service";
import type { AppEnv } from "../types";
import {
  assessmentIdParamsSchema,
  assessmentListQuerySchema,
  createAssessmentTemplateSchema,
  createTemplateVersionSchema,
  publishTemplateVersionSchema,
  templateVersionParamsSchema,
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

export const assessmentTemplatesRoute = new Hono<AppEnv>({ strict: false });

assessmentTemplatesRoute.get(
  "/",
  zValidator("query", assessmentListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listAssessmentTemplates(
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

assessmentTemplatesRoute.post(
  "/",
  zValidator("json", createAssessmentTemplateSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const template = await createAssessmentTemplate(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      {
        data: template,
        meta: { requestId: requestContext.requestId },
      },
      201,
    );
  },
);

assessmentTemplatesRoute.get(
  "/:id",
  zValidator("param", assessmentIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const template = await getAssessmentTemplate(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data: template,
      meta: { requestId: requestContext.requestId },
    });
  },
);

assessmentTemplatesRoute.post(
  "/:id/versions",
  zValidator("param", assessmentIdParamsSchema, validationHook),
  zValidator("json", createTemplateVersionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const version = await createAssessmentTemplateVersion(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json(
      {
        data: version,
        meta: { requestId: requestContext.requestId },
      },
      201,
    );
  },
);

assessmentTemplatesRoute.post(
  "/:id/versions/:versionId/publish",
  zValidator("param", templateVersionParamsSchema, validationHook),
  zValidator("json", publishTemplateVersionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const params = context.req.valid("param");
    const version = await publishAssessmentTemplateVersion(
      requestContext,
      params.id,
      params.versionId,
      context.req.valid("json"),
    );
    return context.json({
      data: version,
      meta: { requestId: requestContext.requestId },
    });
  },
);
