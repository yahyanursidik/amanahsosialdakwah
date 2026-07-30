import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  approveProcurementRequest,
  cancelProcurementRequest,
  cancelPurchaseOrder,
  createProcurementRequest,
  createPurchaseOrder,
  getProcurementRequest,
  issuePurchaseOrder,
  listProcurementRequests,
  receiveGoods,
  recordVendorInvoice,
  submitProcurementRequest,
} from "../services/procurement-service";
import type { AppEnv } from "../types";
import {
  approveProcurementRequestSchema,
  cancelProcurementSchema,
  createProcurementRequestSchema,
  createPurchaseOrderSchema,
  procurementIdempotencyKeySchema,
  procurementIdParamsSchema,
  procurementListQuerySchema,
  procurementNoteSchema,
  receiveGoodsSchema,
  recordVendorInvoiceSchema,
} from "./procurement-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data permintaan pengadaan tidak valid.",
      400,
    );
  }
}

function idempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}) {
  const result = procurementIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter dan wajib untuk command pengadaan.",
      400,
    );
  }
  return result.data;
}

export const procurementRoute = new Hono<AppEnv>({ strict: false });

procurementRoute.get(
  "/",
  zValidator("query", procurementListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listProcurementRequests(
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

procurementRoute.post(
  "/",
  zValidator("json", createProcurementRequestSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createProcurementRequest(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

procurementRoute.get(
  "/:id",
  zValidator("param", procurementIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getProcurementRequest(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

procurementRoute.post(
  "/:id/submit",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", procurementNoteSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await submitProcurementRequest(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json").notes,
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

procurementRoute.post(
  "/:id/approve",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", approveProcurementRequestSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await approveProcurementRequest(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

procurementRoute.post(
  "/:id/cancel",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", cancelProcurementSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await cancelProcurementRequest(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

procurementRoute.post(
  "/:id/purchase-orders",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", createPurchaseOrderSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createPurchaseOrder(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

procurementRoute.post(
  "/purchase-orders/:id/issue",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", procurementNoteSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await issuePurchaseOrder(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json").notes,
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

procurementRoute.post(
  "/purchase-orders/:id/receive",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", receiveGoodsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await receiveGoods(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

procurementRoute.post(
  "/purchase-orders/:id/invoices",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", recordVendorInvoiceSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await recordVendorInvoice(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

procurementRoute.post(
  "/purchase-orders/:id/cancel",
  zValidator("param", procurementIdParamsSchema, validationHook),
  zValidator("json", cancelProcurementSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await cancelPurchaseOrder(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
