import type { IncomingMessage, ServerResponse } from "node:http";

import { app } from "./app";

type VercelNodeRequest = IncomingMessage & { body?: unknown };

const FORWARDED_PATH_PARAM = "__path";

/**
 * Vercel (non-Next.js) tidak mencocokkan catch-all `api/v1/[...route]` untuk
 * path bertingkat, sehingga `vercel.json` me-rewrite `/api/v1/*` ke satu
 * fungsi dengan path asli di query `__path`. Fungsi ini mengembalikan URL asli
 * agar routing Hono (`basePath("/api/v1")`) tetap sama dengan lokal.
 */
export function resolveApiUrl(rawUrl: string, host: string): URL {
  const url = new URL(rawUrl, `https://${host}`);
  const forwarded = url.searchParams
    .getAll(FORWARDED_PATH_PARAM)
    .flatMap((value) => value.split("/"))
    .filter(Boolean);
  url.searchParams.delete(FORWARDED_PATH_PARAM);

  if (!url.pathname.startsWith("/api/v1/") && url.pathname !== "/api/v1") {
    url.pathname = `/api/v1${forwarded.length > 0 ? `/${forwarded.join("/")}` : ""}`;
  }
  return url;
}

async function readBody(request: VercelNodeRequest): Promise<Buffer> {
  const preParsed = request.body;
  if (Buffer.isBuffer(preParsed)) return preParsed;
  if (typeof preParsed === "string") return Buffer.from(preParsed);
  if (preParsed !== undefined && preParsed !== null) {
    return Buffer.from(JSON.stringify(preParsed));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Runtime Node Vercel memanggil default export sebagai `(req, res)`. Handler
 * gaya Web (`hono/vercel`) tidak pernah menulis ke `res` sehingga request
 * menggantung; adaptor ini menjembatani Node ↔ Fetch secara eksplisit.
 */
export default async function vercelNodeHandler(
  request: VercelNodeRequest,
  response: ServerResponse,
) {
  const method = request.method ?? "GET";
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const body = ["GET", "HEAD"].includes(method)
    ? undefined
    : await readBody(request);
  const apiResponse = await app.fetch(
    new Request(resolveApiUrl(request.url ?? "/", request.headers.host ?? "localhost"), {
      headers,
      method,
      ...(body && body.length > 0 ? { body } : {}),
    }),
  );

  response.statusCode = apiResponse.status;
  apiResponse.headers.forEach((value, name) => {
    if (name !== "set-cookie") response.setHeader(name, value);
  });
  const cookies = apiResponse.headers.getSetCookie();
  if (cookies.length > 0) response.setHeader("set-cookie", cookies);
  response.end(Buffer.from(await apiResponse.arrayBuffer()));
}
