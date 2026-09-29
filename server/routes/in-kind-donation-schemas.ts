import { z } from "zod";

const quantity = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/)
  .refine((value) => Number(value) > 0, "Jumlah harus lebih dari nol.");
const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/);

export const inKindDonationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const inKindDonationListQuerySchema = z.object({
  giving_type: z
    .enum(["infaq", "sedekah", "zakat", "waqf", "hibah", "csr", "other"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(40).optional(),
});

export const inKindDonationIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const receiveInKindDonationSchema = z
  .object({
    currency: z.string().trim().length(3).default("IDR"),
    donor_contact_id: z.string().uuid().optional().nullable(),
    donor_name: z.string().trim().min(2).max(240).optional(),
    donor_type: z.enum(["individual", "institution", "anonymous"]),
    giving_type: z.enum([
      "infaq",
      "sedekah",
      "zakat",
      "waqf",
      "hibah",
      "csr",
      "other",
    ]),
    items: z
      .array(
        z.object({
          batch_number: z.string().trim().min(1).max(120).optional(),
          expires_at: z.string().date().optional(),
          item_condition: z
            .enum(["new", "good_used", "needs_repair"])
            .default("new"),
          product_id: z.string().uuid(),
          quantity,
          unit_value: money.default("0"),
        }),
      )
      .min(1, "Minimal satu barang diterima.")
      .max(100),
    notes: z.string().trim().max(3000).optional(),
    program_id: z.string().uuid().optional().nullable(),
    received_at: z.string().datetime({ offset: true }),
    warehouse_id: z.string().uuid(),
    waqf_asset_id: z.string().uuid().optional().nullable(),
  })
  .superRefine((value, context) => {
    if (value.donor_type !== "anonymous" && !value.donor_contact_id && !value.donor_name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih donatur dari kontak atau isi nama donatur.",
        path: ["donor_name"],
      });
    }
    if (value.giving_type !== "waqf" && value.waqf_asset_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aset wakaf hanya ditautkan untuk donasi barang berjenis wakaf.",
        path: ["waqf_asset_id"],
      });
    }
    const products = new Set<string>();
    value.items.forEach((item, index) => {
      const key = `${item.product_id}:${item.batch_number ?? ""}`;
      if (products.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Produk dan batch yang sama tidak boleh diulang.",
          path: ["items", index, "product_id"],
        });
      }
      products.add(key);
    });
  });

export type InKindDonationListQuery = z.infer<
  typeof inKindDonationListQuerySchema
>;
export type ReceiveInKindDonationInput = z.infer<
  typeof receiveInKindDonationSchema
>;
