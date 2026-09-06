import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/neon/http";

import { clearCurrentSessionCache, getCurrentSession } from "./current-session";

vi.mock("@/lib/neon/http", () => ({
  apiFetch: vi.fn(),
}));

describe("getCurrentSession", () => {
  beforeEach(() => {
    clearCurrentSessionCache();
    vi.mocked(apiFetch).mockReset();
  });

  it("membagikan lookup sesi yang berlangsung kepada pemeriksaan auth dan organisasi", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ user: { id: "profile-a" } });

    await expect(
      Promise.all([getCurrentSession(), getCurrentSession()]),
    ).resolves.toEqual([
      { user: { id: "profile-a" } },
      { user: { id: "profile-a" } },
    ]);

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/api/me");
  });

  it("tidak menyimpan respons lama setelah cache sesi dibersihkan", async () => {
    let resolveFirstRequest!: (value: unknown) => void;
    vi.mocked(apiFetch)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstRequest = resolve;
          }),
      )
      .mockResolvedValueOnce({ user: { id: "profile-b" } });

    const firstRequest = getCurrentSession();
    clearCurrentSessionCache();
    resolveFirstRequest({ user: { id: "profile-a" } });
    await firstRequest;

    await expect(getCurrentSession()).resolves.toEqual({
      user: { id: "profile-b" },
    });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
