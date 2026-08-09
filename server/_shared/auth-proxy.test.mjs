import { afterEach, describe, expect, it, vi } from "vitest";

import { handleAuthProxy } from "./auth-proxy.mjs";

const originalAuthBaseUrl = process.env.NEON_AUTH_BASE_URL;

function createResponse() {
  const headers = new Map();

  return {
    statusCode: 200,
    headers,
    body: undefined,
    setHeader(name, value) {
      headers.set(name, value);
    },
    end(body) {
      this.body = body;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();

  if (originalAuthBaseUrl === undefined) {
    delete process.env.NEON_AUTH_BASE_URL;
  } else {
    process.env.NEON_AUTH_BASE_URL = originalAuthBaseUrl;
  }
});

describe("handleAuthProxy", () => {
  it("meneruskan path, query, body, origin, dan cookie sesi", async () => {
    process.env.NEON_AUTH_BASE_URL = "https://auth.example.test/api/auth";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "session=secure; Path=/; HttpOnly; Secure",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const request = {
      method: "POST",
      query: { path: ["sign-in", "email"], redirect: "/workspace" },
      headers: {
        accept: "application/json",
        cookie: "existing=value",
        "content-type": "application/json",
        origin: "https://amanahsosialdakwah.vercel.app",
        "user-agent": "vitest",
      },
      body: { email: "user@example.test", password: "secret" },
    };
    const response = createResponse();

    await handleAuthProxy(request, response);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [target, init] = fetchMock.mock.calls[0];
    expect(target.toString()).toBe(
      "https://auth.example.test/api/auth/sign-in/email?redirect=%2Fworkspace",
    );
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify(request.body),
      redirect: "manual",
    });
    expect(init.headers).toMatchObject({
      cookie: "existing=value",
      origin: "https://amanahsosialdakwah.vercel.app",
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.headers.get("set-cookie")).toEqual(
      expect.arrayContaining([expect.stringContaining("session=secure")]),
    );
    expect(response.body.toString("utf8")).toBe(JSON.stringify({ ok: true }));
  });

  it("mengembalikan 500 ketika environment Auth belum tersedia", async () => {
    delete process.env.NEON_AUTH_BASE_URL;
    const response = createResponse();

    await handleAuthProxy({ method: "GET", query: {}, headers: {} }, response);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error.code).toBe(
      "AUTH_CONFIGURATION_ERROR",
    );
  });

  it("menolak body auth yang melebihi 64 KiB", async () => {
    process.env.NEON_AUTH_BASE_URL = "https://auth.example.test/api/auth";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = createResponse();

    await handleAuthProxy(
      {
        method: "POST",
        query: { path: "sign-in/email" },
        headers: {},
        body: "x".repeat(64 * 1024 + 1),
      },
      response,
    );

    expect(response.statusCode).toBe(413);
    expect(JSON.parse(response.body).error.code).toBe("REQUEST_TOO_LARGE");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
