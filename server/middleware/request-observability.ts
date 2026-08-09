import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "../types";

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveRequestId(value: string | undefined): string {
  return value && requestIdPattern.test(value) ? value : crypto.randomUUID();
}

export const requestObservabilityMiddleware: MiddlewareHandler<AppEnv> = async (
  context,
  next,
) => {
  const startedAt = performance.now();
  const requestId = resolveRequestId(context.req.header("x-request-id"));
  context.set("requestId", requestId);

  try {
    await next();
  } finally {
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    context.header("x-request-id", requestId);
    context.header("cache-control", "no-store");

    console.info(
      JSON.stringify({
        durationMs,
        event: "http_request",
        method: context.req.method,
        path: context.req.path,
        requestId,
        status: context.res.status,
      }),
    );
  }
};
