import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { DomainError } from "../domain/errors";
import {
  cancelAidPackagePacking,
  createAidPackagePacking,
  createAidPackageTemplate,
  getAidPackagePacking,
  getAidPackageTemplate,
  listAidPackagePackings,
  listAidPackageTemplates,
  packAidPackage,
  publishAidPackageTemplate,
  unpackAidPackage,
} from "../services/aid-package-service";
import type { AppEnv } from "../types";
import {
  aidPackageIdempotencyKeySchema,
  aidPackageIdParamsSchema,
  aidPackageListQuerySchema,
  aidPackageReasonSchema,
  createAidPackagePackingSchema,
  createAidPackageTemplateSchema,
  packAidPackageSchema,
} from "./aid-package-schemas";

const validationHook = (result: { success: boolean }) => {
  if (!result.success)
    throw new DomainError(
      "VALIDATION_ERROR",
      "Data paket bantuan tidak valid.",
      400,
    );
};

function idempotencyKey(value: string | undefined): string {
  const parsed = aidPackageIdempotencyKeySchema.safeParse(value);
  if (!parsed.success)
    throw new DomainError(
      "VALIDATION_ERROR",
      "Idempotency-Key minimal 16 karakter dan wajib untuk command stok.",
      400,
    );
  return parsed.data;
}

export const aidPackagesRoute = new Hono<AppEnv>({ strict: false });

aidPackagesRoute.get(
  "/templates",
  zValidator("query", aidPackageListQuerySchema, validationHook),
  async (c) => {
    const result = await listAidPackageTemplates(
      c.get("requestContext"),
      c.req.valid("query"),
    );
    return c.json({
      data: result.data,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: c.get("requestId"),
      },
    });
  },
);
aidPackagesRoute.post(
  "/templates",
  zValidator("json", createAidPackageTemplateSchema, validationHook),
  async (c) =>
    c.json(
      {
        data: await createAidPackageTemplate(
          c.get("requestContext"),
          c.req.valid("json"),
        ),
        meta: { requestId: c.get("requestId") },
      },
      201,
    ),
);
aidPackagesRoute.get(
  "/templates/:id",
  zValidator("param", aidPackageIdParamsSchema, validationHook),
  async (c) =>
    c.json({
      data: await getAidPackageTemplate(
        c.get("requestContext"),
        c.req.valid("param").id,
      ),
      meta: { requestId: c.get("requestId") },
    }),
);
aidPackagesRoute.post(
  "/templates/:id/publish",
  zValidator("param", aidPackageIdParamsSchema, validationHook),
  async (c) =>
    c.json({
      data: await publishAidPackageTemplate(
        c.get("requestContext"),
        c.req.valid("param").id,
      ),
      meta: { requestId: c.get("requestId") },
    }),
);

aidPackagesRoute.get(
  "/packings",
  zValidator("query", aidPackageListQuerySchema, validationHook),
  async (c) => {
    const result = await listAidPackagePackings(
      c.get("requestContext"),
      c.req.valid("query"),
    );
    return c.json({
      data: result.data,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        requestId: c.get("requestId"),
      },
    });
  },
);
aidPackagesRoute.post(
  "/packings",
  zValidator("json", createAidPackagePackingSchema, validationHook),
  async (c) =>
    c.json(
      {
        data: await createAidPackagePacking(
          c.get("requestContext"),
          c.req.valid("json"),
        ),
        meta: { requestId: c.get("requestId") },
      },
      201,
    ),
);
aidPackagesRoute.get(
  "/packings/:id",
  zValidator("param", aidPackageIdParamsSchema, validationHook),
  async (c) =>
    c.json({
      data: await getAidPackagePacking(
        c.get("requestContext"),
        c.req.valid("param").id,
      ),
      meta: { requestId: c.get("requestId") },
    }),
);
aidPackagesRoute.post(
  "/packings/:id/pack",
  zValidator("param", aidPackageIdParamsSchema, validationHook),
  zValidator("json", packAidPackageSchema, validationHook),
  async (c) =>
    c.json({
      data: await packAidPackage(
        c.get("requestContext"),
        c.req.valid("param").id,
        c.req.valid("json"),
        idempotencyKey(c.req.header("Idempotency-Key")),
      ),
      meta: { requestId: c.get("requestId") },
    }),
);
aidPackagesRoute.post(
  "/packings/:id/cancel",
  zValidator("param", aidPackageIdParamsSchema, validationHook),
  zValidator("json", aidPackageReasonSchema, validationHook),
  async (c) =>
    c.json({
      data: await cancelAidPackagePacking(
        c.get("requestContext"),
        c.req.valid("param").id,
        c.req.valid("json"),
      ),
      meta: { requestId: c.get("requestId") },
    }),
);
aidPackagesRoute.post(
  "/packings/:id/unpack",
  zValidator("param", aidPackageIdParamsSchema, validationHook),
  zValidator("json", aidPackageReasonSchema, validationHook),
  async (c) =>
    c.json({
      data: await unpackAidPackage(
        c.get("requestContext"),
        c.req.valid("param").id,
        c.req.valid("json"),
        idempotencyKey(c.req.header("Idempotency-Key")),
      ),
      meta: { requestId: c.get("requestId") },
    }),
);
