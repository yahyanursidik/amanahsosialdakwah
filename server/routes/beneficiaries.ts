import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  createBeneficiary,
  getBeneficiary,
  getBeneficiarySummary,
  listBeneficiaries,
  updateBeneficiary,
} from "../services/beneficiary-service";
import type { AppEnv } from "../types";
import {
  beneficiaryIdParamsSchema,
  beneficiaryListQuerySchema,
  createBeneficiarySchema,
  updateBeneficiarySchema,
} from "./beneficiary-schemas";

function invalid(result: {
  error?: { issues?: Array<{ message: string }> };
  success: boolean;
}): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      result.error?.issues?.[0]?.message ?? "Data penerima manfaat tidak valid.",
      400,
    );
  }
}

export const beneficiariesRoute = new Hono<AppEnv>({ strict: false });

beneficiariesRoute.get(
  "/",
  zValidator("query", beneficiaryListQuerySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listBeneficiaries(
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

beneficiariesRoute.get("/summary", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json({
    data: await getBeneficiarySummary(requestContext),
    meta: { requestId: requestContext.requestId },
  });
});

beneficiariesRoute.post(
  "/",
  zValidator("json", createBeneficiarySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      {
        data: await createBeneficiary(requestContext, context.req.valid("json")),
        meta: { requestId: requestContext.requestId },
      },
      201,
    );
  },
);

beneficiariesRoute.get(
  "/:id",
  zValidator("param", beneficiaryIdParamsSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json({
      data: await getBeneficiary(requestContext, context.req.valid("param").id),
      meta: { requestId: requestContext.requestId },
    });
  },
);

beneficiariesRoute.post(
  "/:id/profile",
  zValidator("param", beneficiaryIdParamsSchema, invalid),
  zValidator("json", updateBeneficiarySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json({
      data: await updateBeneficiary(
        requestContext,
        context.req.valid("param").id,
        context.req.valid("json"),
      ),
      meta: { requestId: requestContext.requestId },
    });
  },
);
