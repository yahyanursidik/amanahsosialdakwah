import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  assignShipment,
  createFieldReport,
  getFieldReport,
  getFieldWorkspace,
  listFieldMembers,
  listFieldReports,
  reviewFieldReport,
} from "../services/field-service";
import {
  cancelFieldTask,
  completeFieldTask,
  createFieldTasks,
  getFieldTask,
  listFieldTasks,
  updateFieldTaskItem,
} from "../services/field-task-service";
import type { AppEnv } from "../types";
import {
  assignShipmentSchema,
  cancelFieldTaskSchema,
  completeFieldTaskSchema,
  createFieldReportSchema,
  createFieldTasksSchema,
  fieldIdParamsSchema,
  fieldReportListQuerySchema,
  fieldTaskItemParamsSchema,
  fieldTaskListQuerySchema,
  reviewFieldReportSchema,
  updateFieldTaskItemSchema,
} from "./field-schemas";

function invalid(result: {
  error?: { issues?: Array<{ message: string }> };
  success: boolean;
}): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      result.error?.issues?.[0]?.message ?? "Data lapangan tidak valid.",
      400,
    );
  }
}

export const fieldRoute = new Hono<AppEnv>({ strict: false });

const one = (data: unknown, requestId: string) => ({ data, meta: { requestId } });

fieldRoute.get("/workspace", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json(
    one(await getFieldWorkspace(requestContext), requestContext.requestId),
  );
});

fieldRoute.get("/members", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json(
    one(await listFieldMembers(requestContext), requestContext.requestId),
  );
});

fieldRoute.get(
  "/reports",
  zValidator("query", fieldReportListQuerySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFieldReports(
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

fieldRoute.post(
  "/reports",
  zValidator("json", createFieldReportSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await createFieldReport(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      one(result, requestContext.requestId),
      result.duplicate ? 200 : 201,
    );
  },
);

fieldRoute.get(
  "/reports/:id",
  zValidator("param", fieldIdParamsSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await getFieldReport(requestContext, context.req.valid("param").id),
        requestContext.requestId,
      ),
    );
  },
);

fieldRoute.post(
  "/reports/:id/review",
  zValidator("param", fieldIdParamsSchema, invalid),
  zValidator("json", reviewFieldReportSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await reviewFieldReport(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
    );
  },
);

fieldRoute.post(
  "/shipments/:id/assign",
  zValidator("param", fieldIdParamsSchema, invalid),
  zValidator("json", assignShipmentSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await assignShipment(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json").profile_id,
        ),
        requestContext.requestId,
      ),
    );
  },
);

fieldRoute.get(
  "/tasks",
  zValidator("query", fieldTaskListQuerySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listFieldTasks(requestContext, context.req.valid("query"));
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

fieldRoute.post(
  "/tasks",
  zValidator("json", createFieldTasksSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await createFieldTasks(requestContext, context.req.valid("json")),
        requestContext.requestId,
      ),
      201,
    );
  },
);

fieldRoute.get(
  "/tasks/:id",
  zValidator("param", fieldIdParamsSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await getFieldTask(requestContext, context.req.valid("param").id),
        requestContext.requestId,
      ),
    );
  },
);

fieldRoute.post(
  "/tasks/:id/items/:itemId",
  zValidator("param", fieldTaskItemParamsSchema, invalid),
  zValidator("json", updateFieldTaskItemSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    const params = context.req.valid("param");
    return context.json(
      one(
        await updateFieldTaskItem(
          requestContext,
          params.id,
          params.itemId,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
    );
  },
);

fieldRoute.post(
  "/tasks/:id/complete",
  zValidator("param", fieldIdParamsSchema, invalid),
  zValidator("json", completeFieldTaskSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await completeFieldTask(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json").completion_notes,
        ),
        requestContext.requestId,
      ),
    );
  },
);

fieldRoute.post(
  "/tasks/:id/cancel",
  zValidator("param", fieldIdParamsSchema, invalid),
  zValidator("json", cancelFieldTaskSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await cancelFieldTask(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json").reason,
        ),
        requestContext.requestId,
      ),
    );
  },
);
