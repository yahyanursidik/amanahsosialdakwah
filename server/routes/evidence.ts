import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { DomainError } from "../domain/errors";
import {
  confirmEvidenceUpload,
  createEvidenceDownload,
  createEvidenceUploadIntent,
  evidenceStorageReady,
  getEvidenceFile,
  listEvidenceFiles,
  markEvidenceDeleted,
  publishEvidence,
} from "../services/evidence-service";
import type { AppEnv } from "../types";
import {
  evidenceConfirmSchema,
  evidenceDeleteSchema,
  evidenceIdParamsSchema,
  evidenceListQuerySchema,
  evidencePublishSchema,
  evidenceUploadIntentSchema,
} from "./evidence-schemas";

function validationHook(result: { success: boolean }): void {
  if (!result.success)
    throw new DomainError("VALIDATION_ERROR", "Data bukti tidak valid.", 400);
}

export const evidenceRoute = new Hono<AppEnv>({ strict: false });

evidenceRoute.get("/status", (context) =>
  context.json({
    data: { storage_ready: evidenceStorageReady() },
    meta: { requestId: context.get("requestContext").requestId },
  }),
);
evidenceRoute.get(
  "/files",
  zValidator("query", evidenceListQuerySchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const result = await listEvidenceFiles(
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
evidenceRoute.post(
  "/upload-intents",
  zValidator("json", evidenceUploadIntentSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createEvidenceUploadIntent(
      requestContext,
      context.req.valid("json"),
    );
    return context.json(
      { data, meta: { requestId: requestContext.requestId } },
      201,
    );
  },
);
evidenceRoute.get(
  "/files/:id",
  zValidator("param", evidenceIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await getEvidenceFile(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
evidenceRoute.post(
  "/files/:id/confirm",
  zValidator("param", evidenceIdParamsSchema, validationHook),
  zValidator("json", evidenceConfirmSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await confirmEvidenceUpload(
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
evidenceRoute.post(
  "/files/:id/download",
  zValidator("param", evidenceIdParamsSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await createEvidenceDownload(
      requestContext,
      context.req.valid("param").id,
    );
    return context.json({
      data,
      meta: { requestId: requestContext.requestId },
    });
  },
);
evidenceRoute.post(
  "/files/:id/delete",
  zValidator("param", evidenceIdParamsSchema, validationHook),
  zValidator("json", evidenceDeleteSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await markEvidenceDeleted(
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
evidenceRoute.post(
  "/files/:id/publish",
  zValidator("param", evidenceIdParamsSchema, validationHook),
  zValidator("json", evidencePublishSchema, validationHook),
  async (context) => {
    const requestContext = context.get("requestContext");
    const data = await publishEvidence(
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
