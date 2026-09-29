export declare const SESSION_COOKIE_NAME: string;
export declare function sessionCookieCandidates(
  header: string | null | undefined,
): string[];
export declare function hasStaleSessionCookies(
  header: string | null | undefined,
): boolean;
export declare function staleSessionCookieClears(): string[];
