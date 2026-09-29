import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import vercelNodeHandler, { resolveApiUrl } from "./vercel-node-handler";

describe("resolveApiUrl", () => {
  it("memulihkan path bertingkat dari query __path hasil rewrite", () => {
    const url = resolveApiUrl(
      "/api/v1-router?__path=reports%2Foverview&range=30d",
      "example.test",
    );
    expect(url.pathname).toBe("/api/v1/reports/overview");
    expect(url.searchParams.get("range")).toBe("30d");
    expect(url.searchParams.has("__path")).toBe(false);
  });

  it("mendukung __path yang dikirim berulang per segmen", () => {
    const url = resolveApiUrl(
      "/api/v1-router?__path=waqf&__path=proposals",
      "example.test",
    );
    expect(url.pathname).toBe("/api/v1/waqf/proposals");
  });

  it("mempertahankan URL asli bila Vercel meneruskan path aslinya", () => {
    const url = resolveApiUrl(
      "/api/v1/beneficiaries/summary?__path=beneficiaries%2Fsummary",
      "example.test",
    );
    expect(url.pathname).toBe("/api/v1/beneficiaries/summary");
  });
});

describe("vercelNodeHandler", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((request, response) => {
      void vercelNodeHandler(request, response);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("menjawab health melalui signature Node (req, res) tanpa menggantung", async () => {
    const response = await fetch(`${baseUrl}/api/v1-router?__path=health`, {
      signal: AbortSignal.timeout(5000),
    });
    const payload = (await response.json()) as { data?: { status?: string } };
    expect(response.status).toBe(200);
    expect(payload.data?.status).toBe("ok");
  });

  it("merutekan path bertingkat ke Hono (butuh sesi, bukan 404)", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1-router?__path=reports%2Foverview`,
      { signal: AbortSignal.timeout(5000) },
    );
    expect(response.status).not.toBe(404);
    expect([400, 401, 403]).toContain(response.status);
  });
});
