import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0
        ? undefined
        : value,
    z.string().trim().max(maxLength).optional(),
  );

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().date().optional(),
);

export const initialProgramDeliveryAreaSchema = z.object({
  address_line: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(120),
  client_id: z.string().uuid(),
  district: optionalText(120),
  name: z.string().trim().min(3).max(160),
  notes: optionalText(2_000),
  postal_code: optionalText(16),
  province: z.string().trim().min(2).max(120),
  quota_capacity: z.coerce.number().int().min(0).max(10_000_000),
  village: optionalText(120),
});

export const initialProgramPartnerAssignmentSchema = z
  .object({
    assignment_role: z.enum(["lead", "coordinator", "distributor", "monitor"]),
    delivery_area_client_id: z.string().uuid().optional(),
    notes: optionalText(2_000),
    partner_contact_id: z.string().uuid().optional(),
    partner_organization_id: z.string().uuid().optional(),
    pic_name: optionalText(160),
    pic_phone: optionalText(40),
    readiness_status: z
      .enum(["pending", "ready", "accepted", "declined"])
      .default("pending"),
  })
  .superRefine((value, context) => {
    const partnerCount =
      Number(Boolean(value.partner_contact_id)) +
      Number(Boolean(value.partner_organization_id));
    if (partnerCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Pilih tepat satu mitra terdaftar.",
        path: ["partner_contact_id"],
      });
    }
  });

export const initialProgramGoodsPlanItemSchema = z.object({
  notes: optionalText(1_000),
  product_id: z.string().uuid(),
  quantity: z.coerce.number().positive().max(9_999_999_999.9999),
  unit_value: z.coerce.number().min(0).max(999_999_999_999_999),
});

export const createInitialProgramPlanSchema = z
  .object({
    cash_budget_amount: z.coerce.number().min(0).max(999_999_999_999_999),
    category_id: z.string().uuid(),
    code: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/),
    delivery_areas: z
      .array(initialProgramDeliveryAreaSchema)
      .max(100)
      .default([]),
    description: optionalText(10_000),
    ends_at: optionalDate,
    fund_type: z.enum([
      "zakat",
      "infaq",
      "sedekah",
      "waqf",
      "humanitarian",
      "education",
      "health",
      "general",
    ]),
    goods_budget_amount: z.coerce.number().min(0).max(999_999_999_999_999),
    goods_plan_items: z
      .array(initialProgramGoodsPlanItemSchema)
      .max(100)
      .default([]),
    logistics_budget_amount: z.coerce.number().min(0).max(999_999_999_999_999),
    name: z.string().trim().min(3).max(250),
    objective: optionalText(5_000),
    partner_assignments: z
      .array(initialProgramPartnerAssignmentSchema)
      .max(100)
      .default([]),
    starts_at: optionalDate,
    support_modes: z
      .array(z.enum(["cash", "in_kind", "logistics"]))
      .min(1)
      .max(3),
    target_beneficiary_count: z.coerce.number().int().min(0).max(10_000_000),
    target_beneficiary_type: z.enum([
      "individual",
      "family",
      "institution",
      "community",
      "disaster_area",
      "mosque",
      "school",
    ]),
  })
  .superRefine((value, context) => {
    const supportModes = new Set(value.support_modes);
    const budgets = [
      ["cash", value.cash_budget_amount, "cash_budget_amount"],
      ["in_kind", value.goods_budget_amount, "goods_budget_amount"],
      ["logistics", value.logistics_budget_amount, "logistics_budget_amount"],
    ] as const;

    for (const [mode, amount, path] of budgets) {
      if (amount > 0 && !supportModes.has(mode)) {
        context.addIssue({
          code: "custom",
          message: "Pilih bentuk dukungan yang sesuai dengan nilai rencana.",
          path: [path],
        });
      }
    }

    const goodsPlanTotal = value.goods_plan_items.reduce(
      (total, item) => total + item.quantity * item.unit_value,
      0,
    );
    if (supportModes.has("in_kind") && value.goods_plan_items.length === 0) {
      context.addIssue({
        code: "custom",
        message:
          "Tambahkan minimal satu barang untuk dukungan barang langsung.",
        path: ["goods_plan_items"],
      });
    }
    if (!supportModes.has("in_kind") && value.goods_plan_items.length > 0) {
      context.addIssue({
        code: "custom",
        message:
          "Pilih dukungan barang langsung sebelum menambahkan rencana barang.",
        path: ["support_modes"],
      });
    }
    if (Math.abs(goodsPlanTotal - value.goods_budget_amount) > 0.005) {
      context.addIssue({
        code: "custom",
        message:
          "Valuasi barang harus sama dengan total seluruh rencana barang.",
        path: ["goods_budget_amount"],
      });
    }
    const plannedProducts = new Set<string>();
    for (const [index, item] of value.goods_plan_items.entries()) {
      if (plannedProducts.has(item.product_id)) {
        context.addIssue({
          code: "custom",
          message:
            "Produk hanya boleh dicantumkan satu kali dalam rencana barang.",
          path: ["goods_plan_items", index, "product_id"],
        });
      }
      plannedProducts.add(item.product_id);
    }

    if (
      value.starts_at &&
      value.ends_at &&
      new Date(value.ends_at).getTime() < new Date(value.starts_at).getTime()
    ) {
      context.addIssue({
        code: "custom",
        message: "Tanggal selesai tidak boleh mendahului tanggal mulai.",
        path: ["ends_at"],
      });
    }

    const areaIds = new Set(value.delivery_areas.map((area) => area.client_id));
    const partnerAssignments = new Set<string>();
    for (const [index, assignment] of value.partner_assignments.entries()) {
      if (
        assignment.delivery_area_client_id &&
        !areaIds.has(assignment.delivery_area_client_id)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Area yang dipilih untuk mitra tidak ditemukan pada rencana penyaluran.",
          path: ["partner_assignments", index, "delivery_area_client_id"],
        });
      }

      const partnerId =
        assignment.partner_contact_id ?? assignment.partner_organization_id;
      const assignmentKey = `${partnerId}:${assignment.delivery_area_client_id ?? "all"}`;
      if (partnerAssignments.has(assignmentKey)) {
        context.addIssue({
          code: "custom",
          message: "Mitra yang sama sudah ditugaskan pada cakupan area ini.",
          path: ["partner_assignments", index, "partner_contact_id"],
        });
      }
      partnerAssignments.add(assignmentKey);
    }
  });

export type CreateInitialProgramPlanInput = z.infer<
  typeof createInitialProgramPlanSchema
>;
