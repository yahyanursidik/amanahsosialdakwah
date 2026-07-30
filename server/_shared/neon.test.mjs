import { describe, expect, it } from "vitest";

import { readJsonBody } from "./neon.mjs";

describe("readJsonBody", () => {
  it("membaca JSON dari Buffer adaptor API lokal", async () => {
    const request = {
      body: Buffer.from(
        JSON.stringify({
          action: "read",
          organizationId: "organization-a",
          resource: "programs",
        }),
      ),
    };

    await expect(readJsonBody(request)).resolves.toEqual({
      action: "read",
      organizationId: "organization-a",
      resource: "programs",
    });
  });

  it("mempertahankan body object dari runtime serverless", async () => {
    const body = { action: "manage", resource: "memberships" };

    await expect(readJsonBody({ body })).resolves.toBe(body);
  });
});
