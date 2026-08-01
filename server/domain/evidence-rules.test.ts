import { describe, expect, it } from "vitest";
import {
  assertEvidenceFile,
  assertRestrictedAccess,
  evidenceObjectKey,
  safeEvidenceName,
} from "./evidence-rules";

describe("evidence rules", () => {
  it("menerima MIME aman dan menolak executable", () => {
    expect(() =>
      assertEvidenceFile({ mimeType: "image/jpeg", sizeBytes: 1024 }),
    ).not.toThrow();
    expect(() =>
      assertEvidenceFile({ mimeType: "text/html", sizeBytes: 1024 }),
    ).toThrow();
  });
  it("membatasi ukuran 25 MB", () => {
    expect(() =>
      assertEvidenceFile({
        mimeType: "application/pdf",
        sizeBytes: 26 * 1024 * 1024,
      }),
    ).toThrow();
  });
  it("membuat key tanpa nama asli", () => {
    const key = evidenceObjectKey({
      classification: "internal",
      entityId: crypto.randomUUID(),
      entityType: "case",
      fileId: crypto.randomUUID(),
      logicalFileId: crypto.randomUUID(),
      mimeType: "application/pdf",
      organizationId: crypto.randomUUID(),
      version: 1,
    });
    expect(key).not.toContain("nama-penerima");
    expect(key).toMatch(/\/file-[a-f0-9-]+\.pdf$/);
    expect(safeEvidenceName("Bukti Kunjungan (1).pdf")).toBe(
      "Bukti-Kunjungan-1-.pdf",
    );
  });
  it("mewajibkan permission untuk restricted", () => {
    expect(() =>
      assertRestrictedAccess("restricted", new Set(["evidence_files.read"])),
    ).toThrow();
    expect(() =>
      assertRestrictedAccess(
        "restricted",
        new Set(["evidence_files.restricted_read"]),
      ),
    ).not.toThrow();
  });
});
