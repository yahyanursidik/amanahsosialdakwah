const ACTIVE_ORGANIZATION_KEY = "amanah.active-organization-id";

function getStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readActiveOrganizationPreference(): string | null {
  try {
    return getStorage()?.getItem(ACTIVE_ORGANIZATION_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeActiveOrganizationPreference(
  organizationId: string,
): void {
  try {
    getStorage()?.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
  } catch {
    // Storage is only a preference cache; authorization never depends on it.
  }
}

export function clearActiveOrganizationPreference(): void {
  try {
    getStorage()?.removeItem(ACTIVE_ORGANIZATION_KEY);
  } catch {
    // Ignore unavailable or blocked browser storage.
  }
}
