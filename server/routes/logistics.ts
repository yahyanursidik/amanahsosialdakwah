import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  addLogisticsTracking,
  confirmLogisticsDelivery,
  createLogisticsCourier,
  createLogisticsShipment,
  dispatchLogisticsShipment,
  getLogisticsShipment,
  listLogisticsCouriers,
  listLogisticsShipments,
  receiveLogisticsReturn,
  reportLogisticsIncident,
  requestLogisticsReturn,
  resolveLogisticsIncident,
} from "../services/logistics-service";
import type { AppEnv } from "../types";
import {
  createLogisticsCourierSchema,
  createLogisticsShipmentSchema,
  logisticsDeliverySchema,
  logisticsDispatchSchema,
  logisticsIdempotencyKeySchema,
  logisticsIdParamsSchema,
  logisticsIncidentResolutionSchema,
  logisticsIncidentSchema,
  logisticsListQuerySchema,
  logisticsReturnReceiveSchema,
  logisticsReturnRequestSchema,
  logisticsTrackingSchema,
} from "./logistics-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success)
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data logistik tidak valid.",
      400,
    );
}

function idempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}): string {
  const result = logisticsIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!result.success)
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter dan wajib untuk command logistik.",
      400,
    );
  return result.data;
}

function listEnvelope(
  result: { data: unknown[]; page: number; pageSize: number; total: number },
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

export const logisticsRoute = new Hono<AppEnv>({ strict: false });

logisticsRoute.get(
  "/couriers",
  zValidator("query", logisticsListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      listEnvelope(
        await listLogisticsCouriers(requestContext, context.req.valid("query")),
        requestContext.requestId,
      ),
    );
  },
);
logisticsRoute.post(
  "/couriers",
  zValidator("json", createLogisticsCourierSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createLogisticsCourier(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
logisticsRoute.get(
  "/shipments",
  zValidator("query", logisticsListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      listEnvelope(
        await listLogisticsShipments(
          requestContext,
          context.req.valid("query"),
        ),
        requestContext.requestId,
      ),
    );
  },
);
logisticsRoute.post(
  "/shipments",
  zValidator("json", createLogisticsShipmentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createLogisticsShipment(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
logisticsRoute.get(
  "/shipments/:id",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getLogisticsShipment(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
logisticsRoute.post(
  "/shipments/:id/dispatch",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  zValidator("json", logisticsDispatchSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await dispatchLogisticsShipment(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
logisticsRoute.post(
  "/shipments/:id/tracking",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  zValidator("json", logisticsTrackingSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await addLogisticsTracking(
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
logisticsRoute.post(
  "/shipments/:id/deliver",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  zValidator("json", logisticsDeliverySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await confirmLogisticsDelivery(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
logisticsRoute.post(
  "/shipments/:id/return",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  zValidator("json", logisticsReturnRequestSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await requestLogisticsReturn(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
logisticsRoute.post(
  "/shipments/:id/return/receive",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  zValidator("json", logisticsReturnReceiveSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await receiveLogisticsReturn(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
      idempotencyKey(context),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
logisticsRoute.post(
  "/shipments/:id/incidents",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  zValidator("json", logisticsIncidentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await reportLogisticsIncident(
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
logisticsRoute.post(
  "/incidents/:id/resolve",
  zValidator("param", logisticsIdParamsSchema, validationHook),
  zValidator("json", logisticsIncidentResolutionSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await resolveLogisticsIncident(
      requestContext,
      context.req.valid("param").id,
      context.req.valid("json"),
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
