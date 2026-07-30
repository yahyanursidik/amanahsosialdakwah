import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  convertApplicationToCase,
  createApplication,
  getApplication,
  listApplications,
  screenApplication,
  submitApplication,
} from "../services/application-case-service";
import type { AppEnv } from "../types";
import {
  convertApplicationSchema,
  createApplicationSchema,
  idParamsSchema,
  listQuerySchema,
  screenApplicationSchema,
  submitApplicationSchema,
} from "./application-case-schemas";

function validationHook(
  result: { success: boolean },
): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data permintaan tidak valid.",
      400,
    );
  }
}

export const applicationsRoute = new Hono<AppEnv>({ strict: false });

applicationsRoute.get(
  "/",
  zValidator("query", listQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listApplications(
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

applicationsRoute.post(
  "/",
  zValidator("json", createApplicationSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const application = await createApplication(
      requestContext,
      context.req.valid("json"),
    );

    return context.json(
      {
        data: application,
        meta: { requestId: requestContext.requestId },
      },
      201,
    );
  },
);

applicationsRoute.get(
  "/:id",
  zValidator("param", idParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const application = await getApplication(
      requestContext,
      context.req.valid("param").id,
    );

    return context.json({
      data: application,
      meta: { requestId: requestContext.requestId },
    });
  },
);

applicationsRoute.post(
  "/:id/submit",
  zValidator("param", idParamsSchema, validationHook),
  zValidator("json", submitApplicationSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const application = await submitApplication(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );

    return context.json({
      data: application,
      meta: { requestId: requestContext.requestId },
    });
  },
);

applicationsRoute.post(
  "/:id/screen",
  zValidator("param", idParamsSchema, validationHook),
  zValidator("json", screenApplicationSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const application = await screenApplication(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );

    return context.json({
      data: application,
      meta: { requestId: requestContext.requestId },
    });
  },
);

applicationsRoute.post(
  "/:id/convert-to-case",
  zValidator("param", idParamsSchema, validationHook),
  zValidator("json", convertApplicationSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const caseRecord = await convertApplicationToCase(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );

    return context.json({
      data: caseRecord,
      meta: { requestId: requestContext.requestId },
    });
  },
);
