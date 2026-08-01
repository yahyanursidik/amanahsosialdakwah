const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
]);

const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

export function assertEvidenceFile(input: {
  mimeType: string;
  sizeBytes: number;
}): void {
  if (!allowedMimeTypes.has(input.mimeType))
    throw new Error("Tipe file bukti tidak diizinkan.");
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > 25 * 1024 * 1024
  ) {
    throw new Error("Ukuran file bukti harus antara 1 byte dan 25 MB.");
  }
}

export function safeEvidenceName(fileName: string): string {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (normalized || "evidence-file").slice(0, 180);
}

export function evidenceObjectKey(input: {
  classification: string;
  entityId: string;
  entityType: string;
  fileId: string;
  logicalFileId: string;
  mimeType: string;
  organizationId: string;
  version: number;
}): string {
  const extension = extensions[input.mimeType];
  if (!extension) throw new Error("Ekstensi file bukti tidak dikenali.");
  return `organizations/${input.organizationId}/${input.classification}/${input.entityType}/${input.entityId}/${input.logicalFileId}/${input.version}/file-${input.fileId}.${extension}`;
}

export function assertRestrictedAccess(
  classification: string,
  permissions: Set<string>,
): void {
  if (
    classification === "restricted" &&
    !permissions.has("evidence_files.restricted_read")
  ) {
    throw new Error("Bukti restricted memerlukan permission khusus.");
  }
}
