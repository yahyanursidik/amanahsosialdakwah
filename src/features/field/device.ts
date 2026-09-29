export type GpsReading = {
  accuracy: number;
  capturedAt: string;
  latitude: number;
  longitude: number;
};

/** Mengambil lokasi GPS perangkat (akurasi tinggi, batas 20 detik). */
export function captureGps(): Promise<GpsReading> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Perangkat tidak mendukung GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          accuracy: Math.round(position.coords.accuracy * 100) / 100,
          capturedAt: new Date(position.timestamp).toISOString(),
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan lokasi untuk aplikasi ini di pengaturan browser."
              : "Lokasi belum didapat. Coba di area terbuka lalu ulangi.",
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
  });
}

export function formatGps(reading: GpsReading | null) {
  if (!reading) return "";
  return `${reading.latitude}, ${reading.longitude} (±${Math.round(reading.accuracy)} m)`;
}

export function mapsUrl(latitude: number | string, longitude: number | string) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export type CompressedPhoto = {
  caption?: string;
  data_url: string;
  height: number;
  width: number;
};

const MAX_BYTES = 560_000;

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Mengecilkan foto kamera di perangkat (maks. 1280 px, JPEG) agar hemat kuota
 * dan di bawah batas 600 KB server.
 */
export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  const source =
    bitmap ??
    (await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
      image.src = URL.createObjectURL(file);
    }));
  const originalWidth = "naturalWidth" in source ? source.naturalWidth : source.width;
  const originalHeight = "naturalHeight" in source ? source.naturalHeight : source.height;

  for (const [maxSide, quality] of [
    [1280, 0.72],
    [1024, 0.62],
    [800, 0.55],
  ] as const) {
    const scale = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(source, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrlBytes(dataUrl) <= MAX_BYTES) {
      bitmap?.close();
      return { data_url: dataUrl, height, width };
    }
  }
  bitmap?.close();
  throw new Error("Foto terlalu besar meski sudah dikompres. Ambil ulang dengan resolusi lebih rendah.");
}

export function newClientReference(prefix = "fld") {
  return `${prefix}-${crypto.randomUUID()}`;
}
