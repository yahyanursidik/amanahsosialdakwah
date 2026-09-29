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
const email = z
  .string()
  .trim()
  .email("Email tidak valid.")
  .max(200)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const donorSegments = ["prospect", "regular", "major", "corporate", "community"] as const;
export const donorInterests = [
  "zakat",
  "infaq",
  "sedekah",
  "wakaf",
  "kafalah",
  "in_kind",
  "emergency",
  "education",
  "health",
  "dakwah",
] as const;

export const donorIdParamsSchema = z.object({ id: z.string().uuid() });
export const donorInteractionParamsSchema = z.object({
  id: z.string().uuid(),
  interactionId: z.string().uuid(),
});

export const donorListQuerySchema = z.object({
  engagement: z.enum(["active", "cooling", "lapsed", "never"]).optional(),
  follow_up: z.enum(["due", "open"]).optional(),
  giving_type: z.enum(["cash", "in_kind", "waqf", "kafalah"]).optional(),
  manager: z.union([z.literal("me"), z.string().uuid()]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  recurring: z.enum(["yes"]).optional(),
  segment: z.enum([...donorSegments, "unprofiled"]).optional(),
  sort: z.enum(["total", "recent", "name"]).default("total"),
});

export const donorProfileSchema = z
  .object({
    acquisition_source: z
      .enum(["referral", "event", "social_media", "website", "walk_in", "partner", "campaign", "other"])
      .optional()
      .nullable(),
    giving_interests: z.array(z.enum(donorInterests)).max(10).default([]),
    notes: optionalText(2000),
    preferred_channel: z.enum(["whatsapp", "phone", "email", "letter", "none"]).default("whatsapp"),
    publish_name: z.boolean().default(true),
    receipt_preference: z.enum(["none", "whatsapp", "email", "print"]).default("whatsapp"),
    recurring_amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Nominal komitmen tidak valid.")
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    recurring_day: z.number().int().min(1).max(31).optional().nullable(),
    recurring_frequency: z.enum(["none", "monthly", "quarterly", "yearly"]).default("none"),
    relationship_manager_id: z.string().uuid().optional().nullable(),
    report_preference: z.enum(["none", "per_gift", "monthly", "quarterly", "yearly"]).default("quarterly"),
    segment: z.enum(donorSegments).default("regular"),
    status: z.enum(["active", "inactive"]).default("active"),
  })
  .superRefine((value, context) => {
    if (value.recurring_frequency !== "none" && !value.recurring_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Isi nominal komitmen donasi rutin.",
        path: ["recurring_amount"],
      });
    }
  });

export const donorContactSchema = z.object({
  address_line: optionalText(300),
  birth_date: z.string().date().optional().nullable().or(z.literal("").transform(() => null)),
  city: optionalText(120),
  contact_type: z.enum(["person", "institution"]).default("person"),
  display_name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(200),
  gender: z.enum(["male", "female", "unknown"]).optional().nullable(),
  primary_email: email,
  primary_phone: phone,
  province: optionalText(120),
  whatsapp_phone: phone,
});

export const createDonorSchema = z
  .object({
    contact: donorContactSchema.optional(),
    contact_id: z.string().uuid().optional(),
    profile: donorProfileSchema,
  })
  .superRefine((value, context) => {
    if (!value.contact && !value.contact_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Isi data donatur baru atau pilih kontak yang sudah ada.",
        path: ["contact"],
      });
    }
  });

export const updateDonorSchema = z.object({
  contact: donorContactSchema.optional(),
  profile: donorProfileSchema,
});

export const donorInteractionSchema = z.object({
  direction: z.enum(["inbound", "outbound", "internal"]).default("outbound"),
  follow_up_assigned_to: z.string().uuid().optional().nullable(),
  follow_up_at: z.string().datetime({ offset: true }).optional().nullable(),
  follow_up_note: optionalText(1000),
  interaction_type: z.enum(["call", "whatsapp", "email", "visit", "meeting", "note"]),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  summary: z.string().trim().min(3, "Ringkasan minimal 3 karakter.").max(4000),
});

export const completeFollowUpSchema = z.object({
  note: optionalText(1000),
});

export type DonorListQuery = z.infer<typeof donorListQuerySchema>;
export type DonorProfileInput = z.infer<typeof donorProfileSchema>;
export type DonorContactInput = z.infer<typeof donorContactSchema>;
export type CreateDonorInput = z.infer<typeof createDonorSchema>;
export type UpdateDonorInput = z.infer<typeof updateDonorSchema>;
export type DonorInteractionInput = z.infer<typeof donorInteractionSchema>;
