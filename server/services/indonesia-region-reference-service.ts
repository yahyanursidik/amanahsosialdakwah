export type IndonesiaRegencyLocation = {
  city: string;
  province: string;
};

type OpenAdminDataRecord = {
  name_local?: unknown;
  parent_name_local?: unknown;
};

type OpenAdminDataPayload = {
  data?: unknown;
};

const NATIONAL_REFERENCE_URL =
  "https://api.openadmindata.org/api/v1/id/regency.json";
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;

// A compact fallback keeps the Program form useful if the public reference is
// temporarily unavailable. The complete national catalogue is refreshed in memory.
const fallbackLocations: IndonesiaRegencyLocation[] = (
  [
    ["Kabupaten Bandung", "Jawa Barat"],
    ["Kabupaten Bandung Barat", "Jawa Barat"],
    ["Kabupaten Bekasi", "Jawa Barat"],
    ["Kabupaten Bogor", "Jawa Barat"],
    ["Kabupaten Ciamis", "Jawa Barat"],
    ["Kabupaten Cianjur", "Jawa Barat"],
    ["Kabupaten Cirebon", "Jawa Barat"],
    ["Kabupaten Garut", "Jawa Barat"],
    ["Kabupaten Indramayu", "Jawa Barat"],
    ["Kabupaten Karawang", "Jawa Barat"],
    ["Kabupaten Kuningan", "Jawa Barat"],
    ["Kabupaten Majalengka", "Jawa Barat"],
    ["Kabupaten Pangandaran", "Jawa Barat"],
    ["Kabupaten Purwakarta", "Jawa Barat"],
    ["Kabupaten Subang", "Jawa Barat"],
    ["Kabupaten Sukabumi", "Jawa Barat"],
    ["Kabupaten Sumedang", "Jawa Barat"],
    ["Kabupaten Tasikmalaya", "Jawa Barat"],
    ["Kota Bandung", "Jawa Barat"],
    ["Kota Banjar", "Jawa Barat"],
    ["Kota Bekasi", "Jawa Barat"],
    ["Kota Bogor", "Jawa Barat"],
    ["Kota Cimahi", "Jawa Barat"],
    ["Kota Cirebon", "Jawa Barat"],
    ["Kota Depok", "Jawa Barat"],
    ["Kota Sukabumi", "Jawa Barat"],
    ["Kota Tasikmalaya", "Jawa Barat"],
    ["Kota Jakarta Pusat", "DKI Jakarta"],
    ["Kota Jakarta Selatan", "DKI Jakarta"],
    ["Kota Jakarta Timur", "DKI Jakarta"],
    ["Kota Jakarta Utara", "DKI Jakarta"],
    ["Kota Serang", "Banten"],
    ["Kota Tangerang", "Banten"],
    ["Kota Tangerang Selatan", "Banten"],
    ["Kota Semarang", "Jawa Tengah"],
    ["Kota Surakarta", "Jawa Tengah"],
    ["Kota Yogyakarta", "DI Yogyakarta"],
    ["Kota Surabaya", "Jawa Timur"],
    ["Kota Malang", "Jawa Timur"],
    ["Kota Denpasar", "Bali"],
    ["Kota Medan", "Sumatera Utara"],
    ["Kota Padang", "Sumatera Barat"],
    ["Kota Pekanbaru", "Riau"],
    ["Kota Palembang", "Sumatera Selatan"],
    ["Kota Bandar Lampung", "Lampung"],
    ["Kota Pontianak", "Kalimantan Barat"],
    ["Kota Banjarmasin", "Kalimantan Selatan"],
    ["Kota Samarinda", "Kalimantan Timur"],
    ["Kota Makassar", "Sulawesi Selatan"],
    ["Kota Manado", "Sulawesi Utara"],
    ["Kota Kendari", "Sulawesi Tenggara"],
    ["Kota Ambon", "Maluku"],
    ["Kota Jayapura", "Papua"],
  ] satisfies Array<[string, string]>
).map(([city, province]) => ({ city, province }));

let cachedLocations: IndonesiaRegencyLocation[] | null = null;
let cacheExpiresAt = 0;
let refreshPromise: Promise<void> | null = null;

function uniqueLocations(
  locations: IndonesiaRegencyLocation[],
): IndonesiaRegencyLocation[] {
  const unique = new Map<string, IndonesiaRegencyLocation>();
  for (const location of locations) {
    const city = location.city.trim();
    const province = location.province.trim();
    if (!city || !province) continue;
    unique.set(
      `${city.toLocaleLowerCase("id")}|${province.toLocaleLowerCase("id")}`,
      {
        city,
        province,
      },
    );
  }
  return [...unique.values()].sort((left, right) =>
    left.city.localeCompare(right.city, "id"),
  );
}

export function readReferenceLocations(
  payload: unknown,
): IndonesiaRegencyLocation[] {
  const records = (payload as OpenAdminDataPayload | null)?.data;
  if (!Array.isArray(records)) return [];

  return uniqueLocations(
    records.flatMap((record) => {
      const { name_local: city, parent_name_local: province } =
        record as OpenAdminDataRecord;
      return typeof city === "string" && typeof province === "string"
        ? [{ city, province }]
        : [];
    }),
  );
}

async function refreshReference(): Promise<void> {
  try {
    const response = await fetch(NATIONAL_REFERENCE_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(1_800),
    });
    if (!response.ok) return;

    const locations = readReferenceLocations(await response.json());
    if (locations.length > 0) {
      cachedLocations = uniqueLocations([...locations, ...fallbackLocations]);
      cacheExpiresAt = Date.now() + CACHE_DURATION_MS;
    }
  } catch {
    // A public reference must never prevent a field officer from creating a Program.
  }
}

export async function getIndonesiaRegencyLocations(): Promise<
  IndonesiaRegencyLocation[]
> {
  if (cachedLocations && cacheExpiresAt > Date.now()) return cachedLocations;

  refreshPromise ??= refreshReference().finally(() => {
    refreshPromise = null;
  });
  await Promise.race([
    refreshPromise,
    new Promise<void>((resolve) => setTimeout(resolve, 1_900)),
  ]);

  return cachedLocations ?? fallbackLocations;
}
