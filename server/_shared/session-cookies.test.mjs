import { describe, expect, it } from "vitest";

import {
  hasStaleSessionCookies,
  sessionCookieCandidates,
  staleSessionCookieClears,
} from "./session-cookies.mjs";

const name = "__Secure-neon-auth.session_token";

describe("session cookie helpers", () => {
  it("mengembalikan header apa adanya bila tidak ada duplikasi", () => {
    const header = `${name}=fresh; theme=dark`;
    expect(sessionCookieCandidates(header)).toEqual([header]);
    expect(hasStaleSessionCookies(header)).toBe(false);
  });

  it("mencoba cookie sesi terbaru lebih dulu dan membuang cookie lama", () => {
    const header = `${name}=stale; better-auth.session_token=legacy; ${name}=fresh; theme=dark`;
    expect(hasStaleSessionCookies(header)).toBe(true);
    expect(sessionCookieCandidates(header)).toEqual([
      `theme=dark; ${name}=fresh`,
      `theme=dark; ${name}=stale`,
    ]);
  });

  it("membersihkan cookie versi lama walau hanya satu cookie sesi", () => {
    expect(
      sessionCookieCandidates(`better-auth.session_token=legacy; ${name}=fresh`),
    ).toEqual([`${name}=fresh`]);
  });

  it("menyediakan Set-Cookie penghapus untuk cookie lama", () => {
    expect(staleSessionCookieClears()[0]).toMatch(
      new RegExp(`^${name}=; Max-Age=0`),
    );
  });
});
