import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";

import { DomainError } from "./domain/errors";
import { requestContextMiddleware } from "./middleware/request-context";
import { applicationsRoute } from "./routes/applications";
import { aidPackagesRoute } from "./routes/aid-packages";
import { approvalRequestsRoute } from "./routes/approval-requests";
import { approvalWorkflowsRoute } from "./routes/approval-workflows";
import { assessmentTemplatesRoute } from "./routes/assessment-templates";
import { assessmentsRoute } from "./routes/assessments";
import { casesRoute } from "./routes/cases";
import { distributionsRoute } from "./routes/distributions";
import { evidenceRoute } from "./routes/evidence";
import { fundsRoute } from "./routes/funds";
import { inventoryRoute } from "./routes/inventory";
import { logisticsRoute } from "./routes/logistics";
import { procurementRoute } from "./routes/procurement";
import type { AppEnv } from "./types";

export const app = new Hono<AppEnv>({ strict: false }).basePath("/api/v1");

app.use("*", secureHeaders());
app.use("*", async (context, next) => {
  const requestId = crypto.randomUUID();
  context.set("requestId", requestId);
  await next();
  context.header("x-request-id", requestId);
});
app.use(
  "*",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: (context) =>
      context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Ukuran permintaan melebihi batas.",
            requestId: context.get("requestId") ?? crypto.randomUUID(),
          },
        },
        400,
      ),
  }),
);
app.use("*", async (context, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(context.req.method) &&
    context.req.header("sec-fetch-site") === "cross-site"
  ) {
    throw new DomainError("FORBIDDEN", "Permintaan lintas situs ditolak.", 403);
  }
  await next();
});

app.get("/health", (context) =>
  context.json({
    data: { status: "ok" },
    meta: { requestId: context.get("requestId") },
  }),
);

app.use("/applications", requestContextMiddleware);
app.use("/applications/*", requestContextMiddleware);
app.use("/cases", requestContextMiddleware);
app.use("/cases/*", requestContextMiddleware);
app.use("/assessment-templates", requestContextMiddleware);
app.use("/assessment-templates/*", requestContextMiddleware);
app.use("/assessments", requestContextMiddleware);
app.use("/assessments/*", requestContextMiddleware);
app.use("/approval-workflows", requestContextMiddleware);
app.use("/approval-workflows/*", requestContextMiddleware);
app.use("/approval-requests", requestContextMiddleware);
app.use("/approval-requests/*", requestContextMiddleware);
app.use("/funds", requestContextMiddleware);
app.use("/funds/*", requestContextMiddleware);
app.use("/distributions", requestContextMiddleware);
app.use("/distributions/*", requestContextMiddleware);
app.use("/procurement", requestContextMiddleware);
app.use("/procurement/*", requestContextMiddleware);
app.use("/inventory", requestContextMiddleware);
app.use("/inventory/*", requestContextMiddleware);
app.use("/aid-packages", requestContextMiddleware);
app.use("/aid-packages/*", requestContextMiddleware);
app.use("/logistics", requestContextMiddleware);
app.use("/logistics/*", requestContextMiddleware);
app.use("/evidence", requestContextMiddleware);
app.use("/evidence/*", requestContextMiddleware);

app.route("/applications", applicationsRoute);
app.route("/cases", casesRoute);
app.route("/assessment-templates", assessmentTemplatesRoute);
app.route("/assessments", assessmentsRoute);
app.route("/approval-workflows", approvalWorkflowsRoute);
app.route("/approval-requests", approvalRequestsRoute);
app.route("/funds", fundsRoute);
app.route("/distributions", distributionsRoute);
app.route("/procurement", procurementRoute);
app.route("/inventory", inventoryRoute);
app.route("/aid-packages", aidPackagesRoute);
app.route("/logistics", logisticsRoute);
app.route("/evidence", evidenceRoute);

app.notFound((context) =>
  context.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Endpoint tidak ditemukan.",
        requestId: context.get("requestId") ?? crypto.randomUUID(),
      },
    },
    404,
  ),
);

app.onError((error, context) => {
  const requestId = context.get("requestId") ?? crypto.randomUUID();

  if (error instanceof DomainError) {
    return context.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
        },
      },
      error.status,
    );
  }

  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      requestId,
    }),
  );

  return context.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan pada server.",
        requestId,
      },
    },
    500,
  );
});
