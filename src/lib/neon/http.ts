import { readActiveOrganizationPreference } from "@/features/organizations/active-organization-storage";

export type ApiErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        requestId?: string;
      };
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusCode = status;
  }
}

export function apiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const activeOrganizationId = readActiveOrganizationPreference();

  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }

  if (activeOrganizationId) {
    headers.set("x-active-organization", activeOrganizationId);
  }

  const response = await fetch(apiPath(path), {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    let message = "Permintaan gagal.";

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      message =
        typeof payload.error === "string"
          ? payload.error
          : (payload.error?.message ?? message);
    } catch {
      message = response.statusText || message;
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
