import { apiFetch, ApiError } from "@/lib/neon/http";

/**
 * Antrean kerja lapangan di perangkat (IndexedDB). Laporan dan centang
 * ceklis yang gagal dikirim karena sinyal hilang disimpan lalu dikirim ulang
 * otomatis sesuai urutan. Laporan idempoten per `client_reference`; centang
 * ceklis memakai kunci per butir sehingga hanya status terakhir yang dikirim.
 */
export type OutboxEntry = {
  client_reference: string;
  lastError?: string;
  organizationId: string;
  payload: Record<string, unknown> & { title: string };
  savedAt: string;
  /** Endpoint tujuan; kosong berarti laporan lapangan. */
  url?: string;
};

const REPORTS_URL = "/api/v1/field/reports";

const DB_NAME = "amanah-field";
const STORE = "outbox";
const EVENT = "amanah-field-outbox-changed";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "client_reference" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB tidak tersedia."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Operasi antrean gagal."));
    transaction.oncomplete = () => db.close();
  });
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

export function onOutboxChange(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export async function listOutbox(organizationId?: string): Promise<OutboxEntry[]> {
  try {
    const entries = await withStore<OutboxEntry[]>("readonly", (store) => store.getAll());
    return entries.filter((entry) => !organizationId || entry.organizationId === organizationId);
  } catch {
    return [];
  }
}

async function saveToOutbox(entry: OutboxEntry) {
  await withStore("readwrite", (store) => store.put(entry));
  notify();
}

async function removeFromOutbox(clientReference: string) {
  await withStore("readwrite", (store) => store.delete(clientReference));
  notify();
}

function isNetworkFailure(error: unknown) {
  return !(error instanceof ApiError) || error.status >= 500 || error.status === 0;
}

export type SubmitResult =
  | { id: string; reference_number: string; status: "sent" }
  | { status: "queued" };

/** Mengirim laporan; bila offline/gagal jaringan, disimpan ke antrean. */
export async function submitFieldReport(
  organizationId: string,
  payload: OutboxEntry["payload"] & { client_reference: string },
): Promise<SubmitResult> {
  if (!navigator.onLine) {
    await saveToOutbox({ client_reference: payload.client_reference, organizationId, payload, savedAt: new Date().toISOString() });
    return { status: "queued" };
  }
  try {
    const response = await apiFetch<{ data: { id: string; reference_number: string } }>(
      REPORTS_URL,
      { body: JSON.stringify(payload), method: "POST" },
    );
    return { ...response.data, status: "sent" };
  } catch (error) {
    if (isNetworkFailure(error)) {
      await saveToOutbox({
        client_reference: payload.client_reference,
        lastError: error instanceof Error ? error.message : "Jaringan bermasalah",
        organizationId,
        payload,
        savedAt: new Date().toISOString(),
      });
      return { status: "queued" };
    }
    throw error;
  }
}

/**
 * Menjalankan aksi lapangan kecil (mis. centang ceklis). Bila offline atau
 * jaringan gagal, aksi disimpan dengan `key` sehingga aksi berikutnya untuk
 * butir yang sama menimpa yang lama.
 */
export async function runFieldAction<T>(
  organizationId: string,
  action: { key: string; payload: Record<string, unknown>; title: string; url: string },
): Promise<{ data?: T; status: "queued" | "sent" }> {
  const entry: OutboxEntry = {
    client_reference: action.key,
    organizationId,
    payload: { ...action.payload, title: action.title },
    savedAt: new Date().toISOString(),
    url: action.url,
  };
  if (!navigator.onLine) {
    await saveToOutbox(entry);
    return { status: "queued" };
  }
  try {
    const response = await apiFetch<{ data: T }>(action.url, {
      body: JSON.stringify(action.payload),
      method: "POST",
    });
    return { data: response.data, status: "sent" };
  } catch (error) {
    if (isNetworkFailure(error)) {
      await saveToOutbox({
        ...entry,
        lastError: error instanceof Error ? error.message : "Jaringan bermasalah",
      });
      return { status: "queued" };
    }
    throw error;
  }
}

function bodyOf(entry: OutboxEntry) {
  if (!entry.url) return entry.payload;
  // Judul hanya untuk tampilan antrean; tidak dikirim ke endpoint aksi.
  const body: Record<string, unknown> = { ...entry.payload };
  delete body.title;
  return body;
}

/** Mengirim ulang seluruh antrean milik organisasi aktif, urut waktu simpan. */
export async function flushOutbox(organizationId: string) {
  let sent = 0;
  let failed = 0;
  const entries = (await listOutbox(organizationId)).sort((left, right) =>
    left.savedAt.localeCompare(right.savedAt),
  );
  for (const entry of entries) {
    try {
      await apiFetch(entry.url ?? REPORTS_URL, {
        body: JSON.stringify(bodyOf(entry)),
        method: "POST",
      });
      await removeFromOutbox(entry.client_reference);
      sent += 1;
    } catch (error) {
      failed += 1;
      if (!isNetworkFailure(error)) {
        // Ditolak validasi server: simpan alasannya agar petugas bisa memperbaiki.
        await saveToOutbox({
          ...entry,
          lastError: error instanceof Error ? error.message : "Ditolak server",
        });
      }
    }
  }
  return { failed, sent };
}

export async function discardOutboxEntry(clientReference: string) {
  await removeFromOutbox(clientReference);
}
