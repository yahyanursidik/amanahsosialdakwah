import { z } from "zod";

const decimalSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,4})?$/, "Gunakan angka positif maksimal 4 desimal.")
  .refine((value) => Number(value) > 0, "Kuantitas harus lebih dari nol.");

export const aidPackageIdParamsSchema = z.object({ id: z.string().uuid() });

export const aidPackageListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  status: z.string().trim().max(30).optional(),
});

export const createAidPackageTemplateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Za-z0-9._:-]+$/),
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: decimalSchema,
        unit: z.string().trim().min(1).max(30),
        allow_substitution: z.boolean().default(false),
        substitution_notes: z.string().trim().max(500).optional(),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (items) =>
        new Set(items.map((item) => item.product_id)).size === items.length,
      "Produk dalam template tidak boleh duplikat.",
    ),
});

export const createAidPackagePackingSchema = z.object({
  template_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  package_count: z.number().int().min(1).max(100_000),
  recipient_label: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const packAidPackageSchema = z.object({
  substitutions: z
    .array(
      z.object({
        template_item_id: z.string().uuid(),
        product_id: z.string().uuid(),
        reason: z.string().trim().min(10).max(500),
      }),
    )
    .max(100)
    .refine(
      (items) =>
        new Set(items.map((item) => item.template_item_id)).size ===
        items.length,
      "Substitusi untuk satu komponen tidak boleh duplikat.",
    )
    .default([]),
});

export const aidPackageReasonSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

export const aidPackageIdempotencyKeySchema = z.string().min(16).max(200);

export type AidPackageListQuery = z.infer<typeof aidPackageListQuerySchema>;
export type CreateAidPackageTemplateInput = z.infer<
  typeof createAidPackageTemplateSchema
>;
export type CreateAidPackagePackingInput = z.infer<
  typeof createAidPackagePackingSchema
>;
export type PackAidPackageInput = z.infer<typeof packAidPackageSchema>;
export type AidPackageReasonInput = z.infer<typeof aidPackageReasonSchema>;
