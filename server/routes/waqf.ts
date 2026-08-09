import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  assignWaqfNazhir,
  createWaqfAsset,
  createWaqfLegalDocument,
  distributeWaqfBenefit,
  getWaqfAsset,
  listWaqfAssets,
  listWaqfContacts,
  recordWaqfIncome,
  recordWaqfMaintenance,
  recordWaqfUtilization,
  recordWaqfValuation,
  registerWaqfAsset,
  verifyWaqfLegalDocument,
} from "../services/waqf-service";
import type { AppEnv } from "../types";
import {
  assignWaqfNazhirSchema,
  createWaqfAssetSchema,
  createWaqfLegalDocumentSchema,
  distributeWaqfBenefitSchema,
  recordWaqfIncomeSchema,
  recordWaqfMaintenanceSchema,
  recordWaqfUtilizationSchema,
  recordWaqfValuationSchema,
  verifyWaqfLegalDocumentSchema,
  waqfIdempotencyKeySchema,
  waqfIdParamsSchema,
  waqfListQuerySchema,
} from "./waqf-schemas";

function invalid(result: { success: boolean }): void {
  if (!result.success) {
    throw new DomainError("VALIDATION_ERROR", "Data wakaf tidak valid.", 400);
  }
}

function idempotencyKey(context: {
  req: { header: (name: string) => string | undefined };
}): string {
  const parsed = waqfIdempotencyKeySchema.safeParse(
    context.req.header("idempotency-key"),
  );
  if (!parsed.success) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter wajib untuk command ini.",
      400,
    );
  }
  return parsed.data;
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

function one(data: unknown, requestId: string) {
  return { data, meta: { requestId } };
}

export const waqfRoute = new Hono<AppEnv>({ strict: false });

waqfRoute.get(
  "/contacts",
  zValidator("query", waqfListQuerySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      listEnvelope(
        await listWaqfContacts(requestContext, context.req.valid("query")),
        requestContext.requestId,
      ),
    );
  },
);

waqfRoute.get(
  "/assets",
  zValidator("query", waqfListQuerySchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      listEnvelope(
        await listWaqfAssets(requestContext, context.req.valid("query")),
        requestContext.requestId,
      ),
    );
  },
);

waqfRoute.post(
  "/assets",
  zValidator("json", createWaqfAssetSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await createWaqfAsset(requestContext, context.req.valid("json")),
        requestContext.requestId,
      ),
      201,
    );
  },
);

waqfRoute.get(
  "/assets/:id",
  zValidator("param", waqfIdParamsSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await getWaqfAsset(requestContext, context.req.valid("param").id),
        requestContext.requestId,
      ),
    );
  },
);

waqfRoute.post(
  "/assets/:id/register",
  zValidator("param", waqfIdParamsSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await registerWaqfAsset(requestContext, context.req.valid("param").id),
        requestContext.requestId,
      ),
    );
  },
);

waqfRoute.post(
  "/assets/:id/legal-documents",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", createWaqfLegalDocumentSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await createWaqfLegalDocument(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
      201,
    );
  },
);

waqfRoute.post(
  "/legal-documents/:id/verify",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", verifyWaqfLegalDocumentSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await verifyWaqfLegalDocument(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
    );
  },
);

waqfRoute.post(
  "/assets/:id/nazhirs",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", assignWaqfNazhirSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await assignWaqfNazhir(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
      201,
    );
  },
);

waqfRoute.post(
  "/assets/:id/valuations",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", recordWaqfValuationSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await recordWaqfValuation(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
      201,
    );
  },
);

waqfRoute.post(
  "/assets/:id/utilizations",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", recordWaqfUtilizationSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await recordWaqfUtilization(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
      201,
    );
  },
);

waqfRoute.post(
  "/assets/:id/maintenance",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", recordWaqfMaintenanceSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await recordWaqfMaintenance(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
        ),
        requestContext.requestId,
      ),
      201,
    );
  },
);

waqfRoute.post(
  "/assets/:id/income",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", recordWaqfIncomeSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await recordWaqfIncome(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
          idempotencyKey(context),
        ),
        requestContext.requestId,
      ),
      201,
    );
  },
);

waqfRoute.post(
  "/assets/:id/benefits",
  zValidator("param", waqfIdParamsSchema, invalid),
  zValidator("json", distributeWaqfBenefitSchema, invalid),
  async (context) => {
    const requestContext = context.get("requestContext");
    return context.json(
      one(
        await distributeWaqfBenefit(
          requestContext,
          context.req.valid("param").id,
          context.req.valid("json"),
          idempotencyKey(context),
        ),
        requestContext.requestId,
      ),
      201,
    );
  },
);
