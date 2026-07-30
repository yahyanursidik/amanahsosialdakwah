import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthProvider } from "@/providers/auth-provider";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: init.status ?? 200,
  });
}

describe("authProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("meneruskan kredensial login ke Neon Auth proxy dan mengarahkan sesi yang berhasil", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));
    const provider = createAuthProvider();

    const result = await provider.login({
      email: "  petugas@example.org ",
      password: "rahasia",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-in/email",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          email: "petugas@example.org",
          password: "rahasia",
          rememberMe: true,
        }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      redirectTo: "/",
    });
  });

  it("tidak membocorkan detail teknis saat kredensial ditolak", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "Invalid credentials" }, { status: 401 }),
    );
    const provider = createAuthProvider();

    const result = await provider.login({
      email: "petugas@example.org",
      password: "salah",
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Email atau kata sandi tidak cocok.");
  });

  it("menolak akses ketika sesi Neon Auth tidak tersedia", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "Unauthorized" }, { status: 401 }),
    );
    const provider = createAuthProvider();

    await expect(provider.check()).resolves.toMatchObject({
      authenticated: false,
      redirectTo: "/login",
      logout: true,
    });
  });

  it("memulihkan sesi melalui profil server-side tanpa token buatan aplikasi", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        user: {
          $id: "profile-id",
          id: "profile-id",
          authUserId: "auth-user-id",
          email: "petugas@example.org",
          name: "Petugas",
        },
      }),
    );
    const provider = createAuthProvider();

    await expect(provider.check()).resolves.toEqual({
      authenticated: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("menghapus sesi saat ini ketika logout", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));
    const provider = createAuthProvider();

    await expect(provider.logout({})).resolves.toMatchObject({
      success: true,
      redirectTo: "/login",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("menghapus preferensi organisasi saat logout", async () => {
    const removeItem = vi.fn();
    const storage = vi
      .spyOn(window, "localStorage", "get")
      .mockReturnValue({ removeItem } as unknown as Storage);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: true }));
    const provider = createAuthProvider();

    await provider.logout({});

    expect(removeItem).toHaveBeenCalledWith("amanah.active-organization-id");
    storage.mockRestore();
  });

  it("mengirim recovery ke route tetap milik aplikasi", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));
    const provider = createAuthProvider();

    await expect(
      provider.forgotPassword?.({ email: "  petugas@example.org " }),
    ).resolves.toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/forget-password",
      expect.objectContaining({
        body: JSON.stringify({
          email: "petugas@example.org",
          redirectTo: "http://localhost:3000/update-password",
        }),
      }),
    );
  });

  it("tidak membocorkan keberadaan akun pada forgot password", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "not found" }, { status: 404 }),
    );
    const provider = createAuthProvider();

    await expect(
      provider.forgotPassword?.({ email: "tidak-ada@example.org" }),
    ).resolves.toMatchObject({ success: true });
  });

  it("menyelesaikan recovery dengan token Neon Auth", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));
    const provider = createAuthProvider();

    await expect(
      provider.updatePassword?.({
        password: "kata-sandi-baru",
        token: "recovery-token",
      }),
    ).resolves.toMatchObject({
      success: true,
      redirectTo: "/login",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/reset-password",
      expect.objectContaining({
        body: JSON.stringify({
          newPassword: "kata-sandi-baru",
          token: "recovery-token",
        }),
      }),
    );
  });

  it("mengubah kata sandi sesi dengan konfirmasi kata sandi lama", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));
    const provider = createAuthProvider();

    await expect(
      provider.updatePassword?.({
        oldPassword: "kata-sandi-lama",
        password: "kata-sandi-baru",
      }),
    ).resolves.toMatchObject({
      success: true,
      redirectTo: "/",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/change-password",
      expect.objectContaining({
        body: JSON.stringify({
          currentPassword: "kata-sandi-lama",
          newPassword: "kata-sandi-baru",
          revokeOtherSessions: true,
        }),
      }),
    );
  });
});
