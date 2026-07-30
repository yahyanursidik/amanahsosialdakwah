import { DomainError } from "../domain/errors";
import type { RequestContext } from "../types";

export function requirePermission(
  context: RequestContext,
  permission: string,
): void {
  if (!context.permissions.has(permission)) {
    throw new DomainError(
      "FORBIDDEN",
      "Anda tidak memiliki akses untuk tindakan ini.",
      403,
    );
  }
}
