import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  assignCase,
  getCase,
  listCases,
} from "../services/application-case-service";
import type { AppEnv } from "../types";
import {
  assignCaseSchema,
  idParamsSchema,
  listQuerySchema,
} from "./application-case-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data permintaan tidak valid.",
      400,
    );
  }
}

export const casesRoute = new Hono<AppEnv>({ strict: false });

casesRoute.get(
  "/",
  zValidator("query", listQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listCases(
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

casesRoute.get(
  "/:id",
  zValidator("param", idParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const caseRecord = await getCase(
      requestContext,
      context.req.valid("param").id,
    );

    return context.json({
      data: caseRecord,
      meta: { requestId: requestContext.requestId },
    });
  },
);

casesRoute.post(
  "/:id/assign",
  zValidator("param", idParamsSchema, validationHook),
  zValidator("json", assignCaseSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const caseRecord = await assignCase(
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
