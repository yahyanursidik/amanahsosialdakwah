import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  createProgramCategory,
  listProgramCategories,
  updateProgramCategory,
} from "../services/program-category-service";
import type { AppEnv } from "../types";
import { programCategoryParamsSchema, programCategorySchema } from "./program-category-schemas";

function invalid(result: {
  error?: { issues?: Array<{ message: string }> };
  success: boolean;
}): void {
  if (!result.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      result.error?.issues?.[0]?.message ?? "Data kategori tidak valid.",
      400,
    );
  }
}

export const programCategoriesRoute = new Hono<AppEnv>({ strict: false });

const one = (data: unknown, requestId: string) => ({ data, meta: { requestId } });

programCategoriesRoute.get("/", async (context) => {
  const requestContext = context.get("requestContext");
  return context.json(one(await listProgramCategories(requestContext), requestContext.requestId));
});

programCategoriesRoute.post(
  "/",
  zValidator("json", programCategorySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(await createProgramCategory(requestContext, context.req.valid("json")), requestContext.requestId),
      201,
    );
  },
);

programCategoriesRoute.put(
  "/:id",
  zValidator("param", programCategoryParamsSchema, invalid),
  zValidator("json", programCategorySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await updateProgramCategory(requestContext, context.req.valid("param").id, context.req.valid("json")),
        requestContext.requestId,
      ),
    );
  },
);
