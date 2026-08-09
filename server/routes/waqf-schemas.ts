import { z } from "zod";

const date = z.string().date();
const dateTime = z.string().datetime({ offset: true });
const optionalUuid = z.string().uuid().optional().nullable();
const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/);
const notes = z.string().trim().min(10).max(3000);

export const waqfIdParamsSchema = z.object({ id: z.string().uuid() });
export const waqfListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(40).optional(),
});
export const waqfIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const createWaqfAssetSchema = z.object({
  acquisition_date: date.optional(),
  acquisition_value: money.optional(),
  asset_type: z.enum([
    "land",
    "building",
    "cash",
    "productive_asset",
    "vehicle",
    "equipment",
    "other",
  ]),
  currency: z.string().trim().length(3).default("IDR"),
  description: notes,
  donor_contact_id: optionalUuid,
  location_text: z.string().trim().max(2000).optional(),
  name: z.string().trim().min(3).max(240),
});
export const createWaqfLegalDocumentSchema = z.object({
  document_number: z.string().trim().min(2).max(160),
  document_type: z.enum([
    "akta_ikrar_wakaf",
    "sertifikat_wakaf",
    "sertifikat_tanah",
    "bukti_transfer",
    "surat_pernyataan",
    "izin_operasional",
    "other",
  ]),
  evidence_file_id: optionalUuid,
  issued_at: date.optional(),
  issuer: z.string().trim().max(200).optional(),
});
export const verifyWaqfLegalDocumentSchema = z.object({
  notes,
  status: z.enum(["verified", "rejected"]),
});
export const assignWaqfNazhirSchema = z.object({
  assignment_scope: z.string().trim().min(5).max(1000),
  contact_id: z.string().uuid(),
  start_date: date,
});
export const recordWaqfValuationSchema = z.object({
  amount: money,
  appraiser: z.string().trim().max(200).optional(),
  currency: z.string().trim().length(3).default("IDR"),
  method: z.enum([
    "internal_estimate",
    "market_comparison",
    "independent_appraiser",
    "book_value",
    "other",
  ]),
  notes,
  valuation_date: date,
});
export const recordWaqfUtilizationSchema = z.object({
  beneficiary_contact_id: optionalUuid,
  end_date: date.optional(),
  expected_benefit: notes,
  program_id: optionalUuid,
  start_date: date,
  utilization_type: z.enum([
    "education",
    "dakwah",
    "health",
    "economic",
    "social",
    "rental",
    "other",
  ]),
});
export const recordWaqfMaintenanceSchema = z.object({
  amount: money.default("0"),
  currency: z.string().trim().length(3).default("IDR"),
  description: notes,
  maintenance_type: z.enum([
    "inspection",
    "repair",
    "renovation",
    "tax",
    "security",
    "cleaning",
    "other",
  ]),
  occurred_at: dateTime,
  vendor_contact_id: optionalUuid,
});
export const recordWaqfIncomeSchema = z.object({
  amount: money,
  currency: z.string().trim().length(3).default("IDR"),
  income_type: z.enum([
    "rent",
    "profit_share",
    "harvest",
    "service_fee",
    "donation_return",
    "other",
  ]),
  notes,
  payer_contact_id: optionalUuid,
  received_at: dateTime,
  utilization_id: optionalUuid,
});
export const distributeWaqfBenefitSchema = z.object({
  amount: money,
  beneficiary_contact_id: optionalUuid,
  benefit_type: z.enum([
    "cash",
    "goods",
    "service",
    "scholarship",
    "facility_access",
    "other",
  ]),
  currency: z.string().trim().length(3).default("IDR"),
  distributed_at: dateTime,
  income_record_id: optionalUuid,
  notes,
  program_id: optionalUuid,
});

export type WaqfListQuery = z.infer<typeof waqfListQuerySchema>;
export type CreateWaqfAssetInput = z.infer<typeof createWaqfAssetSchema>;
export type CreateWaqfLegalDocumentInput = z.infer<
  typeof createWaqfLegalDocumentSchema
>;
export type VerifyWaqfLegalDocumentInput = z.infer<
  typeof verifyWaqfLegalDocumentSchema
>;
export type AssignWaqfNazhirInput = z.infer<typeof assignWaqfNazhirSchema>;
export type RecordWaqfValuationInput = z.infer<
  typeof recordWaqfValuationSchema
>;
export type RecordWaqfUtilizationInput = z.infer<
  typeof recordWaqfUtilizationSchema
>;
export type RecordWaqfMaintenanceInput = z.infer<
  typeof recordWaqfMaintenanceSchema
>;
export type RecordWaqfIncomeInput = z.infer<typeof recordWaqfIncomeSchema>;
export type DistributeWaqfBenefitInput = z.infer<
  typeof distributeWaqfBenefitSchema
>;
