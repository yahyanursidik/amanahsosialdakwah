import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import { getOrganizationReport } from "../services/report-service";
import type { AppEnv } from "../types";
import { reportQuerySchema } from "./report-schemas";

export const reportsRoute = new Hono<AppEnv>({ strict: false });

reportsRoute.get(
  "/overview",
  zValidator("query", reportQuerySchema, (result) => {
    if (!result.success) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Rentang laporan tidak valid.",
        400,
      );
    }
  }),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json({
      data: await getOrganizationReport(
        requestContext,
        context.req.valid("query"),
      ),
      meta: { requestId: requestContext.requestId },
    });
  },
);
