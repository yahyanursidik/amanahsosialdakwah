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

export const waqfAssetTypes = [
  "land",
  "building",
  "cash",
  "productive_asset",
  "vehicle",
  "equipment",
  "precious_metal",
  "securities",
  "rights",
  "other",
] as const;

export const createWaqfAssetSchema = z
  .object({
    acquisition_date: date.optional(),
    acquisition_value: money.optional(),
    asset_type: z.enum(waqfAssetTypes),
    collection_scheme: z
      .enum(["direct_asset", "cash_waqf", "cash_for_asset", "productive"])
      .default("direct_asset"),
    currency: z.string().trim().length(3).default("IDR"),
    description: notes,
    designation: z.string().trim().max(240).optional(),
    donor_contact_id: optionalUuid,
    duration_end_date: date.optional().nullable(),
    fundraising_target: money.optional().nullable(),
    location_text: z.string().trim().max(2000).optional(),
    name: z.string().trim().min(3).max(240),
    pledge_date: date.optional().nullable(),
    waqf_duration: z.enum(["permanent", "temporary"]).default("permanent"),
    waqf_purpose: z.enum(["khairi", "ahli", "musytarak"]).default("khairi"),
  })
  .superRefine((value, context) => {
    if (value.waqf_duration === "temporary" && !value.duration_end_date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wakaf berjangka wajib memiliki tanggal berakhir.",
        path: ["duration_end_date"],
      });
    }
    if (value.waqf_duration === "permanent" && value.duration_end_date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wakaf selamanya tidak memiliki tanggal berakhir.",
        path: ["duration_end_date"],
      });
    }
    if (value.collection_scheme === "cash_for_asset" && !value.fundraising_target) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wakaf melalui uang membutuhkan target penghimpunan.",
        path: ["fundraising_target"],
      });
    }
    if (value.collection_scheme === "cash_waqf" && value.asset_type !== "cash") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Skema wakaf uang hanya untuk jenis aset uang.",
        path: ["asset_type"],
      });
    }
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

export const recordWaqfContributionSchema = z
  .object({
    amount: money,
    certificate_number: z.string().trim().max(160).optional(),
    contribution_form: z
      .enum(["cash", "goods", "land", "building", "precious_metal", "other"])
      .default("cash"),
    currency: z.string().trim().length(3).default("IDR"),
    notes: z.string().trim().max(2000).optional(),
    on_behalf_of: z.string().trim().max(240).optional(),
    payment_method: z
      .enum([
        "cash",
        "bank_transfer",
        "qris",
        "e_wallet",
        "payroll",
        "in_kind",
        "other",
      ])
      .default("bank_transfer"),
    pledge_confirmed: z.boolean().default(false),
    received_at: dateTime,
    wakif_contact_id: optionalUuid,
    wakif_name: z.string().trim().min(2).max(240).optional(),
  })
  .superRefine((value, context) => {
    if (!value.wakif_contact_id && !value.wakif_name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih wakif dari kontak atau isi nama wakif.",
        path: ["wakif_name"],
      });
    }
    if (value.contribution_form !== "cash" && value.payment_method !== "in_kind") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Setoran benda dicatat dengan metode serah terima benda.",
        path: ["payment_method"],
      });
    }
  });
export const reverseWaqfContributionSchema = z.object({ reason: notes });

export const waqfProposalListQuerySchema = waqfListQuerySchema.extend({
  proposal_type: z
    .enum(["waqf_project", "benefit_request", "asset_offer"])
    .optional(),
});
export const createWaqfProposalSchema = z
  .object({
    asset_id: optionalUuid,
    beneficiary_estimate: z.coerce.number().int().positive().optional().nullable(),
    currency: z.string().trim().length(3).default("IDR"),
    description: z.string().trim().min(20).max(6000),
    location_text: z.string().trim().max(2000).optional(),
    proposal_type: z.enum(["waqf_project", "benefit_request", "asset_offer"]),
    proposed_asset_type: z.enum(waqfAssetTypes).optional().nullable(),
    proposer_contact_id: z.string().uuid(),
    requested_amount: money.optional().nullable(),
    submit_now: z.boolean().default(false),
    title: z.string().trim().min(5).max(240),
  })
  .superRefine((value, context) => {
    if (value.proposal_type === "benefit_request" && !value.asset_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Permohonan manfaat wajib memilih aset wakaf sumber manfaat.",
        path: ["asset_id"],
      });
    }
    if (value.proposal_type !== "benefit_request" && !value.proposed_asset_type) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih jenis aset wakaf yang diusulkan.",
        path: ["proposed_asset_type"],
      });
    }
  });
export const waqfProposalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes,
});
export const convertWaqfProposalSchema = z.object({
  start_date: date.optional(),
  utilization_type: z
    .enum(["education", "dakwah", "health", "economic", "social", "rental", "other"])
    .default("social"),
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
export type RecordWaqfContributionInput = z.infer<
  typeof recordWaqfContributionSchema
>;
export type ReverseWaqfContributionInput = z.infer<
  typeof reverseWaqfContributionSchema
>;
export type WaqfProposalListQuery = z.infer<typeof waqfProposalListQuerySchema>;
export type CreateWaqfProposalInput = z.infer<typeof createWaqfProposalSchema>;
export type WaqfProposalDecisionInput = z.infer<
  typeof waqfProposalDecisionSchema
>;
export type ConvertWaqfProposalInput = z.infer<typeof convertWaqfProposalSchema>;
