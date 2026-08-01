import { describe, expect, it } from "vitest";
import {
  evidenceConfirmSchema,
  evidenceUploadIntentSchema,
} from "./evidence-schemas";

describe("evidence schemas", () => {
  it("menerima upload intent yang aman", () => {
    expect(
      evidenceUploadIntentSchema.safeParse({
        classification: "confidential",
        entity_id: crypto.randomUUID(),
        entity_type: "logistics_shipment",
        file_name: "bukti.jpg",
        mime_type: "image/jpeg",
        purpose: "Bukti serah terima",
        size_bytes: 1024,
      }).success,
    ).toBe(true);
  });
  it("menolak MIME dan ukuran berbahaya", () => {
    expect(
      evidenceUploadIntentSchema.safeParse({
        entity_id: crypto.randomUUID(),
        entity_type: "case",
        file_name: "payload.html",
        mime_type: "text/html",
        purpose: "Bukti",
        size_bytes: 99,
      }).success,
    ).toBe(false);
  });
  it("memvalidasi checksum sha256", () => {
    expect(
      evidenceConfirmSchema.safeParse({ checksum_sha256: "a".repeat(64) })
        .success,
    ).toBe(true);
    expect(
      evidenceConfirmSchema.safeParse({ checksum_sha256: "invalid" }).success,
    ).toBe(false);
  });
});
