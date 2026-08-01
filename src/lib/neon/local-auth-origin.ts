type LocationLike = Pick<Location, "hostname" | "href">;

export function getCanonicalLocalAuthUrl(
  location: LocationLike,
  isDevelopment: boolean,
) {
  if (!isDevelopment || location.hostname !== "127.0.0.1") {
    return null;
  }

  const canonicalUrl = new URL(location.href);
  canonicalUrl.hostname = "localhost";
  return canonicalUrl.toString();
}
