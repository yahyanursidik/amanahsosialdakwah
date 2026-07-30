import { z } from "zod";

const money = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/)
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari nol.");

const quantity = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,15})(\.\d{1,4})?$/)
  .refine((value) => Number(value) > 0, "Kuantitas harus lebih dari nol.");

const currency = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const dateTime = z.string().datetime({ offset: true });

export const procurementIdParamsSchema = z.object({ id: z.string().uuid() });
export const procurementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});

export const procurementIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const procurementItemSchema = z.object({
  estimated_unit_price: money.optional(),
  name: z.string().trim().min(3).max(200),
  quantity,
  unit: z.string().trim().min(1).max(32),
});

export const createProcurementRequestSchema = z.object({
  currency: currency.default("IDR"),
  expected_at: dateTime.optional(),
  items: z.array(procurementItemSchema).min(1).max(50),
  program_id: z.string().uuid().nullable().optional(),
  purpose: z.string().trim().min(10).max(2000),
  title: z.string().trim().min(3).max(200),
});

export const procurementNoteSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

export const approveProcurementRequestSchema = z.object({
  notes: z.string().trim().min(10).max(2000),
});

export const cancelProcurementSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});

export const createPurchaseOrderSchema = z.object({
  amount: money,
  currency: currency.default("IDR"),
  expected_delivery_at: dateTime.optional(),
  payment_terms: z.string().trim().max(1000).optional(),
  vendor_contact_id: z.string().uuid(),
});

export const receiveGoodsSchema = z.object({
  condition_summary: z.string().trim().min(10).max(2000),
  items_received: z.array(procurementItemSchema).min(1).max(50),
  receipt_number: z.string().trim().min(2).max(80),
  received_at: dateTime,
  received_status: z.enum(["partially_received", "received"]),
});

export const recordVendorInvoiceSchema = z.object({
  amount: money,
  currency: currency.default("IDR"),
  invoice_date: dateTime,
  invoice_number: z.string().trim().min(2).max(120),
  payment_reference: z.string().trim().max(200).optional(),
});

export type ProcurementListQuery = z.infer<typeof procurementListQuerySchema>;
export type CreateProcurementRequestInput = z.infer<
  typeof createProcurementRequestSchema
>;
export type ApproveProcurementRequestInput = z.infer<
  typeof approveProcurementRequestSchema
>;
export type CancelProcurementInput = z.infer<typeof cancelProcurementSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;
export type RecordVendorInvoiceInput = z.infer<
  typeof recordVendorInvoiceSchema
>;
