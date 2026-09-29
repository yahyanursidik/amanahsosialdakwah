import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import { getOrganizationReport } from "../services/report-service";
import {
  getStakeholderStatement,
  listStakeholderSummary,
} from "../services/stakeholder-report-service";
import type { AppEnv } from "../types";
import {
  reportQuerySchema,
  stakeholderListQuerySchema,
  stakeholderParamsSchema,
} from "./report-schemas";

export const reportsRoute = new Hono<AppEnv>({ strict: false });

function invalidStakeholder(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Parameter laporan pemangku kepentingan tidak valid.",
      400,
    );
  }
}

reportsRoute.get(
  "/stakeholders",
  zValidator("query", stakeholderListQuerySchema, invalidStakeholder),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json({
      data: await listStakeholderSummary(
        requestContext,
        context.req.valid("query"),
      ),
      meta: { requestId: requestContext.requestId },
    });
  },
);

reportsRoute.get(
  "/stakeholders/:contactId",
  zValidator("param", stakeholderParamsSchema, invalidStakeholder),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json({
      data: await getStakeholderStatement(
        requestContext,
        context.req.valid("param").contactId,
      ),
      meta: { requestId: requestContext.requestId },
    });
  },
);

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
