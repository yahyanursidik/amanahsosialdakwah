import { z } from "zod";

const quantitySchema = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,15})(\.\d{1,4})?$/, "Kuantitas tidak valid.")
  .refine((value) => Number(value) > 0, "Kuantitas harus lebih dari nol.");

const signedQuantitySchema = z
  .string()
  .trim()
  .regex(/^-?(0|[1-9]\d{0,15})(\.\d{1,4})?$/, "Delta tidak valid.")
  .refine((value) => Number(value) !== 0, "Delta tidak boleh nol.");

const dateTime = z.string().datetime({ offset: true });

export const inventoryIdParamsSchema = z.object({ id: z.string().uuid() });

export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});

export const inventoryIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const createInventoryProductSchema = z.object({
  base_unit: z.string().trim().min(1).max(32),
  category: z.string().trim().max(120).optional(),
  name: z.string().trim().min(3).max(200),
  sku: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9._:-]+$/),
  track_batch: z.boolean().default(false),
  track_expiry: z.boolean().default(false),
});

export const createInventoryWarehouseSchema = z.object({
  address_notes: z.string().trim().max(1000).optional(),
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9._:-]+$/),
  name: z.string().trim().min(3).max(200),
  type: z.enum(["central", "field", "partner", "virtual"]).default("central"),
});

export const createInventoryAdjustmentSchema = z.object({
  adjustment_type: z.enum([
    "stocktake_gain",
    "stocktake_loss",
    "damage",
    "loss",
    "correction",
  ]),
  batch_number: z.string().trim().max(120).optional(),
  expected_delta: signedQuantitySchema,
  expires_at: z.string().date().optional(),
  notes: z.string().trim().min(10).max(2000),
  product_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
});

export const inventoryDecisionSchema = z.object({
  notes: z.string().trim().min(10).max(2000),
});

export const postGoodsReceiptInventorySchema = z.object({
  items: z.array(
    z.object({
      batch_number: z.string().trim().max(120).optional(),
      expires_at: z.string().date().optional(),
      product_id: z.string().uuid(),
      quantity: quantitySchema,
      source_item_name: z.string().trim().max(200).optional(),
      unit: z.string().trim().min(1).max(32),
      warehouse_id: z.string().uuid(),
    }),
  ).min(1).max(50),
  notes: z.string().trim().max(2000).optional(),
  occurred_at: dateTime,
});

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
export type CreateInventoryProductInput = z.infer<
  typeof createInventoryProductSchema
>;
export type CreateInventoryWarehouseInput = z.infer<
  typeof createInventoryWarehouseSchema
>;
export type CreateInventoryAdjustmentInput = z.infer<
  typeof createInventoryAdjustmentSchema
>;
export type InventoryDecisionInput = z.infer<typeof inventoryDecisionSchema>;
export type PostGoodsReceiptInventoryInput = z.infer<
  typeof postGoodsReceiptInventorySchema
>;
