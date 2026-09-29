import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  addDonorInteraction,
  completeDonorFollowUp,
  createDonor,
  getDonor,
  getDonorSummary,
  listDonors,
  updateDonor,
} from "../services/donor-service";
import type { AppEnv } from "../types";
import {
  completeFollowUpSchema,
  createDonorSchema,
  donorIdParamsSchema,
  donorInteractionParamsSchema,
  donorInteractionSchema,
  donorListQuerySchema,
  updateDonorSchema,
} from "./donor-schemas";

function invalid(result: {
  error?: { issues?: Array<{ message: string }> };
  success: boolean;
}): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      result.error?.issues?.[0]?.message ?? "Data donatur tidak valid.",
      400,
    );
  }
}

export const donorsRoute = new Hono<AppEnv>({ strict: false });

const one = (data: unknown, requestId: string) => ({ data, meta: { requestId } });

donorsRoute.get(
  "/",
  zValidator("query", donorListQuerySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listDonors(requestContext, context.req.valid("query"));
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

donorsRoute.get("/summary", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json(one(await getDonorSummary(requestContext), requestContext.requestId));
});

donorsRoute.post(
  "/",
  zValidator("json", createDonorSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(await createDonor(requestContext, context.req.valid("json")), requestContext.requestId),
      201,
    );
  },
);

donorsRoute.get(
  "/:id",
  zValidator("param", donorIdParamsSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(await getDonor(requestContext, context.req.valid("param").id), requestContext.requestId),
    );
  },
);

donorsRoute.put(
  "/:id",
  zValidator("param", donorIdParamsSchema, invalid),
  zValidator("json", updateDonorSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await updateDonor(requestContext, context.req.valid("param").id, context.req.valid("json")),
        requestContext.requestId,
      ),
    );
  },
);

donorsRoute.post(
  "/:id/interactions",
  zValidator("param", donorIdParamsSchema, invalid),
  zValidator("json", donorInteractionSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await addDonorInteraction(requestContext, context.req.valid("param").id, context.req.valid("json")),
        requestContext.requestId,
      ),
      201,
    );
  },
);

donorsRoute.post(
  "/:id/interactions/:interactionId/complete",
  zValidator("param", donorInteractionParamsSchema, invalid),
  zValidator("json", completeFollowUpSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const params = context.req.valid("param");
    return context.json(
      one(
        await completeDonorFollowUp(requestContext, params.id, params.interactionId, context.req.valid("json").note),
        requestContext.requestId,
      ),
    );
  },
);
