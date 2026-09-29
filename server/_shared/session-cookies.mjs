/**
 * Neon Auth sekarang menulis cookie sesi dengan atribut `Partitioned`.
 * Browser yang masih menyimpan cookie lama bernama sama (tanpa partisi) atau
 * cookie `better-auth.session_token` akan mengirim beberapa nilai sekaligus,
 * dan Neon Auth membaca nilai pertama yang sering kali sudah basi. Helper ini
 * membuat validasi sesi tahan terhadap cookie ganda tersebut.
 */
export const SESSION_COOKIE_NAME = "__Secure-neon-auth.session_token";
const LEGACY_COOKIE_NAMES = new Set(["better-auth.session_token"]);

function parseCookieHeader(header) {
  return (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      return { name: separator < 0 ? part : part.slice(0, separator), part };
    });
}

/**
 * Daftar header cookie yang layak dicoba untuk `get-session`, masing-masing
 * hanya berisi satu nilai cookie sesi. Nilai yang dikirim terakhir (umumnya
 * yang terbaru) dicoba lebih dulu. Header tanpa duplikasi dikembalikan apa adanya.
 */
export function sessionCookieCandidates(header) {
  const cookies = parseCookieHeader(header);
  const sessionParts = [];
  const otherParts = [];
  let hasLegacy = false;

  for (const cookie of cookies) {
    if (cookie.name === SESSION_COOKIE_NAME) {
      if (!sessionParts.includes(cookie.part)) sessionParts.push(cookie.part);
    } else if (LEGACY_COOKIE_NAMES.has(cookie.name)) {
      hasLegacy = true;
    } else {
      otherParts.push(cookie.part);
    }
  }

  if (sessionParts.length <= 1 && !hasLegacy) {
    return [header ?? ""];
  }
  if (sessionParts.length === 0) {
    return [otherParts.join("; ")];
  }
  return [...sessionParts]
    .reverse()
    .map((sessionPart) => [...otherParts, sessionPart].join("; "));
}

/** Apakah header membawa cookie sesi ganda atau cookie sesi versi lama. */
export function hasStaleSessionCookies(header) {
  const cookies = parseCookieHeader(header);
  return (
    cookies.filter((cookie) => cookie.name === SESSION_COOKIE_NAME).length > 1 ||
    cookies.some((cookie) => LEGACY_COOKIE_NAMES.has(cookie.name))
  );
}

/**
 * Set-Cookie untuk menghapus cookie sesi lama tanpa partisi dan cookie versi
 * lama. Harus dikirim SEBELUM cookie sesi baru agar cookie baru tetap menang
 * pada browser yang mengabaikan atribut `Partitioned`.
 */
export function staleSessionCookieClears() {
  return [
    `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None`,
    "better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
  ];
}
