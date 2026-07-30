import { readRawBody } from "../_shared/neon.mjs";

const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

export default async function handler(request, response) {
  if (!authBaseUrl) {
    response.statusCode = 500;
    response.end("NEON_AUTH_BASE_URL belum tersedia.");
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
    cookie: request.headers.cookie ?? "",
    "content-type": request.headers["content-type"] ?? "application/json",
    ...(request.headers.origin ? { origin: request.headers.origin } : {}),
    "user-agent": request.headers["user-agent"] ?? "AmanahOS",
  };
  const hasBody = !["GET", "HEAD"].includes(request.method ?? "GET");
  const authResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await readRawBody(request) : undefined,
    redirect: "manual",
  });

  response.statusCode = authResponse.status;

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

  if (setCookie) {
    response.setHeader("set-cookie", setCookie);
  }

  response.end(Buffer.from(await authResponse.arrayBuffer()));
}
