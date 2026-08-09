import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("Hono API foundation", () => {
  beforeAll(() => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://test:test@localhost:5432/test?sslmode=disable",
    );
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it(
    "mengembalikan health envelope dan request ID",
    async () => {
      const { app } = await import("./app");
      const response = await app.request("http://localhost/api/v1/health");
      const payload = (await response.json()) as {
        data: { status: string };
        meta: { requestId: string };
      };

      expect(response.status).toBe(200);
      expect(payload.data.status).toBe("ok");
      expect(payload.meta.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(response.headers.get("x-request-id")).toBe(payload.meta.requestId);
    },
    15_000,
  );

  it("mengembalikan error envelope konsisten untuk endpoint asing", async () => {
    const { app } = await import("./app");
    const response = await app.request("http://localhost/api/v1/unknown");
    const payload = (await response.json()) as {
      error: { code: string; message: string; requestId: string };
    };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("NOT_FOUND");
    expect(payload.error.requestId).toBeTruthy();
  });

  it("melindungi endpoint asesmen dengan konteks organisasi server-side", async () => {
    const { app } = await import("./app");
    const response = await app.request(
      "http://localhost/api/v1/assessments",
    );
    const payload = (await response.json()) as {
      error: { code: string; requestId: string };
    };

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("FORBIDDEN");
    expect(payload.error.requestId).toBeTruthy();
  });

  it("melindungi laporan organisasi dengan konteks server-side", async () => {
    const { app } = await import("./app");
    const response = await app.request(
      "http://localhost/api/v1/reports/overview?range=30d",
    );
    const payload = (await response.json()) as {
      error: { code: string; requestId: string };
    };

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("FORBIDDEN");
    expect(payload.error.requestId).toBeTruthy();
  });

  it("melindungi register risiko dengan konteks organisasi server-side", async () => {
    const { app } = await import("./app");
    const response = await app.request(
      "http://localhost/api/v1/governance/risks",
    );
    const payload = (await response.json()) as {
      error: { code: string; requestId: string };
    };

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("FORBIDDEN");
    expect(payload.error.requestId).toBeTruthy();
  });
});
