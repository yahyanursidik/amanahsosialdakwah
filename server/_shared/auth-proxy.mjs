import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import { readRawBody } from "./neon.mjs";
import {
  SESSION_COOKIE_NAME,
  hasStaleSessionCookies,
  sessionCookieCandidates,
  staleSessionCookieClears,
} from "./session-cookies.mjs";

export async function handleAuthProxy(request, response) {
  const startedAt = performance.now();
  const incomingRequestId = request.headers["x-request-id"];
  const requestId =
    typeof incomingRequestId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      incomingRequestId,
    )
      ? incomingRequestId
      : randomUUID();
  response.setHeader("x-request-id", requestId);
  response.setHeader("cache-control", "private, no-store");

  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

  if (!authBaseUrl) {
    response.statusCode = 500;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        error: {
          code: "AUTH_CONFIGURATION_ERROR",
          message: "Layanan autentikasi belum dikonfigurasi.",
          requestId,
        },
      }),
    );
    return;
  }

  const path = Array.isArray(request.query.path)
    ? request.query.path.join("/")
    : request.query.path;
  const targetUrl = new URL(`${authBaseUrl}/${path ?? ""}`);

  for (const [key, value] of Object.entries(request.query)) {
    if (key !== "path" && value !== undefined) {
      targetUrl.searchParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  }

  const headers = {
    accept: request.headers.accept ?? "application/json",
    cookie: sessionCookieCandidates(request.headers.cookie)[0] ?? "",
    "content-type": request.headers["content-type"] ?? "application/json",
    ...(request.headers.origin ? { origin: request.headers.origin } : {}),
    "user-agent": request.headers["user-agent"] ?? "AmanahOS",
  };
  const hasBody = !["GET", "HEAD"].includes(request.method ?? "GET");
  let authResponse;
  try {
    authResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await readRawBody(request, 64 * 1024) : undefined,
      redirect: "manual",
    });
    response.statusCode = authResponse.status;
  } catch (error) {
    const statusCode = error?.statusCode === 413 ? 413 : 502;
    response.statusCode = statusCode;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(
      JSON.stringify({
        error: {
          code:
            statusCode === 413
              ? "REQUEST_TOO_LARGE"
              : "AUTH_SERVICE_UNAVAILABLE",
          message:
            statusCode === 413
              ? "Ukuran permintaan melebihi batas."
              : "Layanan autentikasi sedang tidak tersedia.",
          requestId,
        },
      }),
    );
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        event: "auth_proxy_failed",
        requestId,
        status: statusCode,
      }),
    );
    return;
  } finally {
    console.info(
      JSON.stringify({
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        event: "auth_proxy_request",
        method: request.method ?? "GET",
        requestId,
        status: response.statusCode,
      }),
    );
  }

  const contentType = authResponse.headers.get("content-type");
  if (contentType) {
    response.setHeader("content-type", contentType);
  }

  const location = authResponse.headers.get("location");
  if (location) {
    response.setHeader("location", location);
  }

  const setCookie =
    typeof authResponse.headers.getSetCookie === "function"
      ? authResponse.headers.getSetCookie()
      : authResponse.headers.get("set-cookie");

  const cookies = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  const setsNewSession = cookies.some((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`) && !/Max-Age=0/i.test(cookie),
  );

  if (setsNewSession && hasStaleSessionCookies(request.headers.cookie)) {
    // Hapus cookie sesi lama tanpa partisi sebelum cookie baru ditulis.
    response.setHeader("set-cookie", [...staleSessionCookieClears(), ...cookies]);
  } else if (cookies.length > 0) {
    response.setHeader("set-cookie", cookies);
  }

  response.end(Buffer.from(await authResponse.arrayBuffer()));
}
