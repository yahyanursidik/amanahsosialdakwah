import { z } from "zod";

const optionalUuid = z.string().uuid().optional().nullable();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const fieldIdParamsSchema = z.object({ id: z.string().uuid() });

export const fieldReportListQuerySchema = z.object({
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  report_type: z
    .enum([
      "distribution",
      "delivery",
      "verification_visit",
      "monitoring",
      "situation",
      "incident",
    ])
    .optional(),
  status: z.enum(["submitted", "reviewed", "follow_up", "rejected"]).optional(),
});

/** Foto dikompres di perangkat; dikirim sebagai data URL base64. */
export const fieldPhotoSchema = z.object({
  caption: optionalText(300),
  data_url: z
    .string()
    .regex(
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
      "Format foto harus JPEG, PNG, atau WebP.",
    )
    .max(820_000, "Foto terlalu besar; kompres di bawah 600 KB."),
  height: z.number().int().positive().max(10000).optional(),
  width: z.number().int().positive().max(10000).optional(),
});

export const verificationChecksSchema = z
  .object({
    address_matched: z.boolean().optional(),
    identity_matched: z.boolean().optional(),
    income_confirmed: z.boolean().optional(),
    living_condition_poor: z.boolean().optional(),
    neighbors_confirmed: z.boolean().optional(),
  })
  .default({});

export const createFieldReportSchema = z
  .object({
    amount_distributed: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional()
      .nullable(),
    application_id: optionalUuid,
    beneficiaries_reached: z.number().int().min(0).max(100000).optional().nullable(),
    beneficiary_contact_id: optionalUuid,
    case_id: optionalUuid,
    client_reference: z
      .string()
      .trim()
      .min(8)
      .max(120)
      .regex(/^[A-Za-z0-9._:-]+$/),
    distribution_plan_id: optionalUuid,
    follow_up_needed: z.boolean().default(false),
    household_size_observed: z.number().int().min(1).max(100).optional().nullable(),
    issues: optionalText(4000),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    location_accuracy_m: z.number().min(0).max(100000).optional().nullable(),
    location_text: optionalText(500),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    occurred_at: z.string().datetime({ offset: true }),
    packages_delivered: z.number().int().min(0).max(100000).optional().nullable(),
    photos: z.array(fieldPhotoSchema).max(4).default([]),
    program_id: optionalUuid,
    report_type: z.enum([
      "distribution",
      "delivery",
      "verification_visit",
      "monitoring",
      "situation",
      "incident",
    ]),
    severity: z.enum(["low", "medium", "high", "critical"]).optional().nullable(),
    shipment_id: optionalUuid,
    summary: z.string().trim().min(10).max(6000),
    task_id: optionalUuid,
    title: z.string().trim().min(5).max(200),
    verification_checks: verificationChecksSchema,
    verification_result: z
      .enum(["eligible", "not_eligible", "needs_review", "not_found", "moved"])
      .optional()
      .nullable(),
    waqf_asset_id: optionalUuid,
  })
  .superRefine((value, context) => {
    if (value.report_type === "verification_visit") {
      if (!value.beneficiary_contact_id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Laporan verifikasi wajib memilih penerima yang dikunjungi.",
          path: ["beneficiary_contact_id"],
        });
      }
      if (!value.verification_result) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilih hasil verifikasi.",
          path: ["verification_result"],
        });
      }
    }
    if (value.report_type === "incident" && !value.severity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Laporan insiden wajib mencantumkan tingkat keparahan.",
        path: ["severity"],
      });
    }
    if ((value.latitude == null) !== (value.longitude == null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Koordinat GPS tidak lengkap.",
        path: ["latitude"],
      });
    }
  });

export const reviewFieldReportSchema = z.object({
  decision: z.enum(["reviewed", "follow_up", "rejected"]),
  notes: z.string().trim().min(10).max(4000),
});

export const assignShipmentSchema = z.object({
  profile_id: z.string().uuid(),
});

export type FieldReportListQuery = z.infer<typeof fieldReportListQuerySchema>;
export type CreateFieldReportInput = z.infer<typeof createFieldReportSchema>;
export type ReviewFieldReportInput = z.infer<typeof reviewFieldReportSchema>;

export const fieldTaskListQuerySchema = z.object({
  assigned_profile_id: z.string().uuid().optional(),
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  program_id: z.string().uuid().optional(),
  q: z.string().trim().max(100).optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled", "open"]).optional(),
});

export const createFieldTasksSchema = z
  .object({
    assigned_profile_id: z.string().uuid(),
    beneficiary_contact_ids: z.array(z.string().uuid()).max(100).default([]),
    case_id: optionalUuid,
    cash_amount: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional()
      .nullable(),
    custom_items: z.array(z.string().trim().max(200)).max(15).default([]),
    distribution_plan_id: optionalUuid,
    due_date: z.string().date().optional().nullable(),
    goods_package_count: z.number().int().min(1).max(10000).optional().nullable(),
    goods_summary: optionalText(300),
    instructions: optionalText(2000),
    priority: z.enum(["normal", "high", "urgent"]).default("normal"),
    program_id: optionalUuid,
    shipment_id: optionalUuid,
    support_modes: z.array(z.enum(["cash", "in_kind"])).max(2).default([]),
    task_type: z.enum(["distribution", "verification", "delivery", "monitoring", "other"]),
    template_id: optionalUuid,
    title: optionalText(200),
  })
  .superRefine((value, context) => {
    if (value.task_type === "distribution") {
      // Tanpa pilihan eksplisit, bentuk bantuan mengikuti Program.
      if (value.support_modes.length === 0 && !value.program_id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilih bentuk bantuan: dana, barang, atau keduanya.",
          path: ["support_modes"],
        });
      }
      if (value.support_modes.includes("cash") && !value.cash_amount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Isi nominal dana per penerima.",
          path: ["cash_amount"],
        });
      }
      if (
        value.support_modes.includes("in_kind") &&
        !value.goods_package_count &&
        !value.goods_summary
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Isi jumlah paket atau rincian barang.",
          path: ["goods_package_count"],
        });
      }
    }
    if (value.task_type === "other" && !value.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tugas lainnya wajib diberi judul.",
        path: ["title"],
      });
    }
  });

export const updateFieldTaskItemSchema = z.object({
  is_done: z.boolean(),
  note: optionalText(500),
});

export const completeFieldTaskSchema = z.object({
  completion_notes: optionalText(2000),
});

export const cancelFieldTaskSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const fieldTaskItemParamsSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
});

export type FieldTaskListQuery = z.infer<typeof fieldTaskListQuerySchema>;
export type CreateFieldTasksInput = z.infer<typeof createFieldTasksSchema>;

const taskTypeSchema = z.enum(["distribution", "verification", "delivery", "monitoring", "other"]);

export const fieldSettingsSchema = z.object({
  default_due_days: z.number().int().min(0).max(60),
  handover_min_photos: z.number().int().min(0).max(4),
  officer_can_uncheck: z.boolean(),
  require_gps_for_handover: z.boolean(),
  require_report_to_complete: z.boolean(),
  verification_updates_profile: z.boolean(),
});

export const fieldTemplateItemSchema = z.object({
  applies_to: z.enum(["always", "cash", "in_kind"]).default("always"),
  hint: optionalText(300),
  is_required: z.boolean().default(true),
  item_kind: z.enum(["check", "handover_cash", "handover_goods", "confirmation", "photo", "gps", "report"]),
  label: z.string().trim().min(3, "Setiap langkah minimal 3 karakter.").max(200),
});

export const fieldTemplateSchema = z.object({
  description: optionalText(500),
  is_default: z.boolean().default(false),
  items: z.array(fieldTemplateItemSchema).min(1, "Template minimal berisi satu langkah.").max(30),
  name: z.string().trim().min(3).max(120),
  program_id: optionalUuid,
  task_type: taskTypeSchema,
});

export const fieldTemplateListQuerySchema = z.object({
  task_type: taskTypeSchema.optional(),
});

export const fieldTaskTypeParamsSchema = z.object({ taskType: taskTypeSchema });

export const checklistPreviewSchema = z.object({
  cash_amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .nullable(),
  custom_items: z.array(z.string().trim().max(200)).max(15).default([]),
  goods_package_count: z.number().int().min(1).max(10000).optional().nullable(),
  goods_summary: optionalText(300),
  program_id: optionalUuid,
  support_modes: z.array(z.enum(["cash", "in_kind"])).max(2).default([]),
  task_type: taskTypeSchema,
  template_id: optionalUuid,
});

export type FieldSettingsInput = z.infer<typeof fieldSettingsSchema>;
export type FieldTemplateInput = z.infer<typeof fieldTemplateSchema>;
export type ChecklistPreviewInput = z.infer<typeof checklistPreviewSchema>;
