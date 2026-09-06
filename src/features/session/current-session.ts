import { apiFetch } from "@/lib/neon/http";

const cacheDurationMs = 2_000;

let cachedSession: { expiresAt: number; value: unknown } | null = null;
let pendingSession: Promise<unknown> | null = null;
let sessionGeneration = 0;

/**
 * Shares the short-lived initial session lookup used by Refine and the
 * organization provider. This is an in-memory optimization only: the active
 * organization and its membership are still validated by the server response.
 */
export function getCurrentSession<T>(): Promise<T> {
  if (cachedSession && cachedSession.expiresAt > Date.now()) {
    return Promise.resolve(cachedSession.value as T);
  }

  if (pendingSession) {
    return pendingSession as Promise<T>;
  }

  const request = apiFetch<T>("/api/me");
  const requestGeneration = sessionGeneration;
  pendingSession = request;

  void request.then(
    (value) => {
      if (requestGeneration !== sessionGeneration) {
        return;
      }

      cachedSession = {
        expiresAt: Date.now() + cacheDurationMs,
        value,
      };
    },
    () => undefined,
  ).finally(() => {
    if (pendingSession === request) {
      pendingSession = null;
    }
  });

  return request;
}

export function clearCurrentSessionCache() {
  sessionGeneration += 1;
  cachedSession = null;
  pendingSession = null;
}
