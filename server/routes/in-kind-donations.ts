import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  getInKindDonation,
  listInKindDonations,
  receiveInKindDonation,
} from "../services/in-kind-donation-service";
import type { AppEnv } from "../types";
import {
  inKindDonationIdempotencyKeySchema,
  inKindDonationIdParamsSchema,
  inKindDonationListQuerySchema,
  receiveInKindDonationSchema,
} from "./in-kind-donation-schemas";

function invalid(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data donasi barang tidak valid.",
      400,
    );
  }
}

export const inKindDonationsRoute = new Hono<AppEnv>({ strict: false });

inKindDonationsRoute.get(
  "/",
  zValidator("query", inKindDonationListQuerySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listInKindDonations(
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

inKindDonationsRoute.post(
  "/",
  zValidator("json", receiveInKindDonationSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const key = inKindDonationIdempotencyKeySchema.safeParse(
      context.req.header("idempotency-key"),
    );
    if (!key.success) {
      throw new DomainError(
        "VALIDATION_ERROR",
        "Idempotency-Key minimal 16 karakter wajib untuk penerimaan barang.",
        400,
      );
    }
    return context.json(
      {
        data: await receiveInKindDonation(
          requestContext,
          context.req.valid("json"),
          key.data,
        ),
        meta: { requestId: requestContext.requestId },
      },
      201,
    );
  },
);

inKindDonationsRoute.get(
  "/:id",
  zValidator("param", inKindDonationIdParamsSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json({
      data: await getInKindDonation(
        requestContext,
        context.req.valid("param").id,
      ),
      meta: { requestId: requestContext.requestId },
    });
  },
);
