import { describe, expect, it } from "vitest";

import { resolveRequestId } from "./request-observability";

describe("request observability", () => {
  it("mempertahankan request ID UUID yang valid", () => {
    const requestId = "a30a7117-bb01-4d5e-82f8-0db2137bb330";
    expect(resolveRequestId(requestId)).toBe(requestId);
  });

  it("mengganti request ID tidak valid", () => {
    expect(resolveRequestId("private-user-value")).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
