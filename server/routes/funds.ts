import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  activateFundAllocation,
  createFundAllocation,
  createFundCommitment,
  createFundReconciliation,
  createFundRestriction,
  getFundAllocation,
  getFundOverview,
  listFundAllocations,
  listFundCommitments,
  listFundDisbursements,
  listFundReceipts,
  listFundReconciliations,
  listFundRestrictions,
  postFundDisbursement,
  postFundReceipt,
  reverseFundAllocation,
  reverseFundDisbursement,
  reverseFundReceipt,
} from "../services/fund-service";
import type { AppEnv } from "../types";
import {
  createFundAllocationSchema,
  createFundCommitmentSchema,
  createFundReconciliationSchema,
  createFundRestrictionSchema,
  fundIdParamsSchema,
  fundListQuerySchema,
  idempotencyKeySchema,
  postFundDisbursementSchema,
  postFundReceiptSchema,
  reverseFundTransactionSchema,
} from "./fund-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data permintaan tidak valid.",
      400,
    );
  }
}

function idempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}): string {
  const parsed = idempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!parsed.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter dan wajib untuk command dana.",
      400,
    );
  }
  return parsed.data;
}

export const fundsRoute = new Hono<AppEnv>({ strict: false });

fundsRoute.get("/overview", async (context) => {
  const requestContext = context.get("requestContext");
  const data = await getFundOverview(requestContext);
  return context.json({ data, meta: { requestId: requestContext.requestId } });
});

function listEnvelope(
  result: {
    data: Row[];
    page: number;
    pageSize: number;
    total: number;
  },
  requestId: string,
) {
  return {
    data: result.data,
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      requestId,
      total: result.total,
    },
  };
}

type Row = Record<string, unknown> & { id: string };

fundsRoute.get(
  "/restrictions",
  zValidator("query", fundListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFundRestrictions(
      requestContext,
      context.req.valid("query"),
    );
    return context.json(listEnvelope(result, requestContext.requestId));
  },
);
fundsRoute.post(
  "/restrictions",
  zValidator("json", createFundRestrictionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createFundRestriction(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

fundsRoute.get(
  "/commitments",
  zValidator("query", fundListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFundCommitments(
      requestContext,
      context.req.valid("query"),
    );
    return context.json(listEnvelope(result, requestContext.requestId));
  },
);
fundsRoute.post(
  "/commitments",
  zValidator("json", createFundCommitmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createFundCommitment(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

fundsRoute.get(
  "/receipts",
  zValidator("query", fundListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFundReceipts(
      requestContext,
      context.req.valid("query"),
    );
    return context.json(listEnvelope(result, requestContext.requestId));
  },
);
fundsRoute.post(
  "/receipts",
  zValidator("json", postFundReceiptSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await postFundReceipt(
      requestContext,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
fundsRoute.post(
  "/receipts/:id/reverse",
  zValidator("param", fundIdParamsSchema, validationHook),
  zValidator("json", reverseFundTransactionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await reverseFundReceipt(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

fundsRoute.get(
  "/allocations",
  zValidator("query", fundListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFundAllocations(
      requestContext,
      context.req.valid("query"),
    );
    return context.json(listEnvelope(result, requestContext.requestId));
  },
);
fundsRoute.post(
  "/allocations",
  zValidator("json", createFundAllocationSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createFundAllocation(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
fundsRoute.get(
  "/allocations/:id",
  zValidator("param", fundIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getFundAllocation(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
fundsRoute.post(
  "/allocations/:id/activate",
  zValidator("param", fundIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await activateFundAllocation(
      requestContext,
      context.req.valid("param").id,
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
fundsRoute.post(
  "/allocations/:id/reverse",
  zValidator("param", fundIdParamsSchema, validationHook),
  zValidator("json", reverseFundTransactionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await reverseFundAllocation(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

fundsRoute.get(
  "/disbursements",
  zValidator("query", fundListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFundDisbursements(
      requestContext,
      context.req.valid("query"),
    );
    return context.json(listEnvelope(result, requestContext.requestId));
  },
);
fundsRoute.post(
  "/disbursements",
  zValidator("json", postFundDisbursementSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await postFundDisbursement(
      requestContext,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
fundsRoute.post(
  "/disbursements/:id/reverse",
  zValidator("param", fundIdParamsSchema, validationHook),
  zValidator("json", reverseFundTransactionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await reverseFundDisbursement(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

fundsRoute.get(
  "/reconciliations",
  zValidator("query", fundListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFundReconciliations(
      requestContext,
      context.req.valid("query"),
    );
    return context.json(listEnvelope(result, requestContext.requestId));
  },
);
fundsRoute.post(
  "/reconciliations",
  zValidator("json", createFundReconciliationSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createFundReconciliation(
      requestContext,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
