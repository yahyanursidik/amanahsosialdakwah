import type { AuthProvider } from "@refinedev/core";

import { setCurrentAccessContext } from "@/features/access-control/access-context";
import { clearActiveOrganizationPreference } from "@/features/organizations/active-organization-storage";
import { apiFetch, ApiError } from "@/lib/neon/http";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type ForgotPasswordVariables = {
  email: string;
};

export type UpdatePasswordVariables = {
  oldPassword?: string;
  password: string;
  secret?: string;
  token?: string;
  userId?: string;
};

export type AuthIdentity = {
  email: string;
  id: string;
  name: string;
};

export type NeonAuthUser = {
  $id: string;
  authUserId: string;
  email: string;
  id: string;
  name: string;
};

export type MeResponse = {
  user: NeonAuthUser;
};

function getPublicLoginError(error: unknown): Error {
  if (error instanceof ApiError && error.status === 401) {
    return new Error("Email atau kata sandi tidak cocok.");
  }

  return new Error(
    "Layanan autentikasi sedang tidak tersedia. Coba beberapa saat lagi.",
  );
}

function recoveryUrl() {
  return new URL("/update-password", window.location.origin).toString();
}

function getResetToken(secret?: string, token?: string) {
  return token ?? secret ?? new URLSearchParams(window.location.search).get("token");
}

export function createAuthProvider(): AuthProvider {
  return {
    login: async ({ email, password }: LoginCredentials) => {
      try {
        await apiFetch("/api/auth/sign-in/email", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
            rememberMe: true,
          }),
        });

        return {
          success: true,
          redirectTo: "/",
        };
      } catch (error) {
        return {
          success: false,
          error: getPublicLoginError(error),
        };
      }
    },
    logout: async () => {
      try {
        await apiFetch("/api/auth/sign-out", {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          return {
            success: false,
            error: new Error(
              "Sesi tidak dapat ditutup. Coba beberapa saat lagi.",
            ),
          };
        }
      }

      clearActiveOrganizationPreference();
      setCurrentAccessContext(null);

      return {
        success: true,
        redirectTo: "/login",
      };
    },
    forgotPassword: async ({ email }: ForgotPasswordVariables) => {
      try {
        await apiFetch("/api/auth/forget-password", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            redirectTo: recoveryUrl(),
          }),
        });

        return { success: true };
      } catch {
        return { success: true };
      }
    },
    updatePassword: async ({
      oldPassword,
      password,
      secret,
      token,
    }: UpdatePasswordVariables) => {
      const resetToken = getResetToken(secret, token);

      try {
        if (resetToken) {
          await apiFetch("/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({
              newPassword: password,
              token: resetToken,
            }),
          });
        } else {
          await apiFetch("/api/auth/change-password", {
            method: "POST",
            body: JSON.stringify({
              currentPassword: oldPassword,
              newPassword: password,
              revokeOtherSessions: true,
            }),
          });
        }

        return {
          success: true,
          redirectTo: resetToken ? "/login" : "/",
        };
      } catch {
        return {
          success: false,
          error: new Error(
            resetToken
              ? "Tautan pemulihan tidak valid atau telah kedaluwarsa."
              : "Kata sandi belum dapat diperbarui. Periksa kata sandi saat ini.",
          ),
        };
      }
    },
    check: async () => {
      try {
        await apiFetch<MeResponse>("/api/me");

        return {
          authenticated: true,
        };
      } catch (error) {
        setCurrentAccessContext(null);

        return {
          authenticated: false,
          redirectTo: "/login",
          logout: true,
          ...(!(error instanceof ApiError && error.status === 401)
            ? {
                error: new Error(
                  "Status sesi tidak dapat diperiksa. Coba beberapa saat lagi.",
                ),
              }
            : {}),
        };
      }
    },
    onError: async (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        return {
          error: new Error("Sesi berakhir."),
          logout: true,
          redirectTo: "/login",
        };
      }

      return {
        error: error instanceof Error ? error : new Error("Permintaan gagal."),
      };
    },
    getPermissions: async () => null,
    getIdentity: async () => {
      try {
        const me = await apiFetch<MeResponse>("/api/me");

        return {
          id: me.user.id,
          name: me.user.name || me.user.email || "Pengguna",
          email: me.user.email,
        } satisfies AuthIdentity;
      } catch {
        return null;
      }
    },
  };
}

export const authProvider = createAuthProvider();
