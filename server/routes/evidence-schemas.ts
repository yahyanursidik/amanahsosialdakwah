import { z } from "zod";

export const evidenceIdParamsSchema = z.object({ id: z.string().uuid() });
export const evidenceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
  entity_type: z.string().trim().max(64).optional(),
  entity_id: z.string().uuid().optional(),
});
export const evidenceUploadIntentSchema = z.object({
  classification: z
    .enum(["internal", "confidential", "restricted"])
    .default("internal"),
  entity_id: z.string().uuid(),
  entity_type: z.enum([
    "application",
    "case",
    "assessment",
    "distribution",
    "procurement",
    "inventory_adjustment",
    "aid_package_packing",
    "logistics_shipment",
    "logistics_incident",
    "crm_contact",
  ]),
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
  ]),
  previous_file_id: z.string().uuid().optional(),
  purpose: z.string().trim().min(3).max(200),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
export const evidenceConfirmSchema = z.object({
  checksum_sha256: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export const evidenceDeleteSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});
export const evidencePublishSchema = z.object({
  consent_reference: z.string().trim().min(5).max(500),
  redaction_notes: z.string().trim().min(10).max(2000),
});

export type EvidenceListQuery = z.infer<typeof evidenceListQuerySchema>;
export type EvidenceUploadIntentInput = z.infer<
  typeof evidenceUploadIntentSchema
>;
export type EvidenceConfirmInput = z.infer<typeof evidenceConfirmSchema>;
export type EvidenceDeleteInput = z.infer<typeof evidenceDeleteSchema>;
export type EvidencePublishInput = z.infer<typeof evidencePublishSchema>;
