import { describe, expect, it } from "vitest";

import { getCanonicalLocalAuthUrl } from "./local-auth-origin";

describe("getCanonicalLocalAuthUrl", () => {
  it("mengalihkan loopback IPv4 ke localhost saat development", () => {
    expect(
      getCanonicalLocalAuthUrl(
        {
          hostname: "127.0.0.1",
          href: "http://127.0.0.1:5173/login?to=%2Fworkspace",
        },
        true,
      ),
    ).toBe("http://localhost:5173/login?to=%2Fworkspace");
  });

  it("tidak mengubah origin production atau hostname lain", () => {
    expect(
      getCanonicalLocalAuthUrl(
        {
          hostname: "127.0.0.1",
          href: "http://127.0.0.1:5173/login",
        },
        false,
      ),
    ).toBeNull();
    expect(
      getCanonicalLocalAuthUrl(
        {
          hostname: "localhost",
          href: "http://localhost:5173/login",
        },
        true,
      ),
    ).toBeNull();
  });
});
