import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));
const phone = z
  .string()
  .trim()
  .regex(/^[0-9+()\s-]{6,24}$/, "Nomor telepon tidak valid.")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const beneficiaryCategories = [
  "yatim",
  "piatu",
  "yatim_piatu",
  "dhuafa",
  "lansia",
  "disabilitas",
  "janda",
  "santri",
  "pelajar",
  "mahasiswa",
  "guru_ngaji",
  "dai",
  "mualaf",
  "korban_bencana",
  "pasien",
  "ibnu_sabil",
  "lainnya",
] as const;

export const beneficiaryIdParamsSchema = z.object({ id: z.string().uuid() });

export const beneficiaryListQuerySchema = z.object({
  category: z.enum(beneficiaryCategories).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  program_id: z.string().uuid().optional(),
  q: z.string().trim().max(100).optional(),
  source: z.enum(["program", "waqf", "kafalah", "registered"]).optional(),
  status: z.string().trim().max(40).optional(),
  vulnerability: z.enum(["low", "medium", "high", "critical"]).optional(),
});

const profileFields = {
  asnaf_category: z
    .enum([
      "fakir",
      "miskin",
      "amil",
      "muallaf",
      "riqab",
      "gharimin",
      "fisabilillah",
      "ibnu_sabil",
    ])
    .optional()
    .nullable(),
  assessment_status: z
    .enum(["not_assessed", "in_review", "eligible", "not_eligible", "expired"])
    .default("not_assessed"),
  bank_account_holder: optionalText(160),
  bank_account_number: z
    .string()
    .trim()
    .regex(/^[0-9-\s]{5,34}$/, "Nomor rekening hanya angka.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bank_name: optionalText(120),
  beneficiary_categories: z.array(z.enum(beneficiaryCategories)).max(10).default([]),
  beneficiary_type: z
    .enum(["individual", "family", "institution", "community"])
    .default("individual"),
  birth_place: optionalText(120),
  dependents_count: z.coerce.number().int().min(0).max(100).optional().nullable(),
  disability_status: z
    .enum(["none", "physical", "sensory", "intellectual", "mental", "multiple"])
    .optional()
    .nullable(),
  education_level: z
    .enum(["none", "sd", "smp", "sma", "diploma", "s1", "s2_plus"])
    .optional()
    .nullable(),
  eligibility_notes: optionalText(4000),
  emergency_contact_name: optionalText(160),
  emergency_contact_phone: phone,
  guardian_name: optionalText(160),
  guardian_phone: phone,
  guardian_relation: optionalText(80),
  health_notes: optionalText(2000),
  household_size: z.coerce.number().int().min(1).max(100).optional().nullable(),
  housing_status: z
    .enum(["own", "rent", "family", "official", "free_use", "none"])
    .optional()
    .nullable(),
  income_range: z.enum(["unknown", "none", "low", "middle"]).default("unknown"),
  marital_status: z
    .enum(["single", "married", "divorced", "widowed"])
    .optional()
    .nullable(),
  monthly_income: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  occupation: optionalText(160),
  referral_partner_contact_id: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "inactive", "graduated", "blocked"]).default("active"),
  vulnerability_level: z
    .enum(["low", "medium", "high", "critical"])
    .default("medium"),
};

const contactFields = {
  address_line: optionalText(500),
  birth_date: z.string().date().optional().nullable(),
  city: optionalText(120),
  contact_type: z.enum(["person", "institution"]).default("person"),
  display_name: z.string().trim().min(2).max(200),
  district: optionalText(120),
  gender: z.enum(["male", "female", "unknown"]).default("unknown"),
  postal_code: optionalText(10),
  primary_email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  primary_phone: phone,
  province: optionalText(120),
  village: optionalText(120),
  whatsapp_phone: phone,
};

const identity = z
  .object({
    identity_number: z
      .string()
      .trim()
      .regex(/^[0-9A-Za-z]{6,32}$/, "Nomor identitas hanya huruf/angka."),
    identity_type: z.enum(["nik", "family_card", "passport", "kitab", "other"]),
  })
  .superRefine((value, context) => {
    if (
      ["nik", "family_card"].includes(value.identity_type) &&
      !/^\d{16}$/.test(value.identity_number)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NIK / nomor KK harus 16 digit angka.",
        path: ["identity_number"],
      });
    }
  });

export const createBeneficiarySchema = z
  .object({
    ...contactFields,
    ...profileFields,
    enrollment: z
      .object({
        program_id: z.string().uuid(),
        requested_support: z.string().trim().min(10).max(4000),
      })
      .optional()
      .nullable(),
    identities: z.array(identity).max(3).default([]),
    registration_source: z
      .enum(["admin", "application", "partner", "program", "import"])
      .default("admin"),
  })
  .superRefine((value, context) => {
    const types = value.identities.map((item) => item.identity_type);
    if (new Set(types).size !== types.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Setiap jenis identitas hanya boleh satu.",
        path: ["identities"],
      });
    }
  });

export const updateBeneficiarySchema = z.object({
  ...contactFields,
  ...profileFields,
  identities: z.array(identity).max(3).default([]),
});

export type BeneficiaryListQuery = z.infer<typeof beneficiaryListQuerySchema>;
export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;
export type UpdateBeneficiaryInput = z.infer<typeof updateBeneficiarySchema>;
