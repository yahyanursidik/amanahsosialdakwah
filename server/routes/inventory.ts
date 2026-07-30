import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  approveInventoryAdjustment,
  cancelInventoryAdjustment,
  createInventoryAdjustment,
  createInventoryProduct,
  createInventoryWarehouse,
  getInventoryAdjustment,
  listInventoryAdjustments,
  listInventoryBalances,
  listInventoryMovements,
  listInventoryProducts,
  listInventoryWarehouses,
  postGoodsReceiptToInventory,
  postInventoryAdjustment,
  submitInventoryAdjustment,
} from "../services/inventory-service";
import type { AppEnv } from "../types";
import {
  createInventoryAdjustmentSchema,
  createInventoryProductSchema,
  createInventoryWarehouseSchema,
  inventoryDecisionSchema,
  inventoryIdempotencyKeySchema,
  inventoryIdParamsSchema,
  inventoryListQuerySchema,
  postGoodsReceiptInventorySchema,
} from "./inventory-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data inventory tidak valid.",
      400,
    );
  }
}

function idempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}) {
  const result = inventoryIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter dan wajib untuk command inventory.",
      400,
    );
  }
  return result.data;
}

export const inventoryRoute = new Hono<AppEnv>({ strict: false });

inventoryRoute.get(
  "/products",
  zValidator("query", inventoryListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listInventoryProducts(
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

inventoryRoute.post(
  "/products",
  zValidator("json", createInventoryProductSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createInventoryProduct(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

inventoryRoute.get(
  "/warehouses",
  zValidator("query", inventoryListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listInventoryWarehouses(
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

inventoryRoute.post(
  "/warehouses",
  zValidator("json", createInventoryWarehouseSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createInventoryWarehouse(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

inventoryRoute.get(
  "/balances",
  zValidator("query", inventoryListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listInventoryBalances(
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

inventoryRoute.get(
  "/movements",
  zValidator("query", inventoryListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listInventoryMovements(
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

inventoryRoute.get(
  "/adjustments",
  zValidator("query", inventoryListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listInventoryAdjustments(
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

inventoryRoute.post(
  "/adjustments",
  zValidator("json", createInventoryAdjustmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createInventoryAdjustment(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);

inventoryRoute.get(
  "/adjustments/:id",
  zValidator("param", inventoryIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getInventoryAdjustment(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

inventoryRoute.post(
  "/adjustments/:id/submit",
  zValidator("param", inventoryIdParamsSchema, validationHook),
  zValidator("json", inventoryDecisionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await submitInventoryAdjustment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

inventoryRoute.post(
  "/adjustments/:id/approve",
  zValidator("param", inventoryIdParamsSchema, validationHook),
  zValidator("json", inventoryDecisionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await approveInventoryAdjustment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

inventoryRoute.post(
  "/adjustments/:id/cancel",
  zValidator("param", inventoryIdParamsSchema, validationHook),
  zValidator("json", inventoryDecisionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await cancelInventoryAdjustment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

inventoryRoute.post(
  "/adjustments/:id/post",
  zValidator("param", inventoryIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await postInventoryAdjustment(
      requestContext,
      context.req.valid("param").id,
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);

inventoryRoute.post(
  "/goods-receipts/:id/post",
  zValidator("param", inventoryIdParamsSchema, validationHook),
  zValidator("json", postGoodsReceiptInventorySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await postGoodsReceiptToInventory(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({ data, meta: { requestId: requestContext.requestId } });
  },
);
