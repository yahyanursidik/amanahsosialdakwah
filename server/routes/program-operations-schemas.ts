import { z } from "zod";

export const programOperationIdempotencyKeySchema = z.string().min(16).max(200);

export const createProgramDeliveryAreaSchema = z.object({
  address_line: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  code: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/),
  district: z.string().trim().max(120).optional(),
  name: z.string().trim().min(3).max(160),
  notes: z.string().trim().max(2_000).optional(),
  postal_code: z.string().trim().max(16).optional(),
  province: z.string().trim().max(120).optional(),
  quota_capacity: z.coerce.number().int().min(0).max(10_000_000),
  village: z.string().trim().max(120).optional(),
});

export const createProgramPartnerAssignmentSchema = z.object({
  assignment_role: z.enum(["lead", "coordinator", "distributor", "monitor"]),
  delivery_area_id: z.string().uuid().optional(),
  notes: z.string().trim().max(2_000).optional(),
  partner_contact_id: z.string().uuid(),
  pic_name: z.string().trim().min(2).max(160).optional(),
  pic_phone: z.string().trim().min(6).max(40).optional(),
  readiness_status: z.enum(["pending", "ready", "accepted", "declined"]).default("pending"),
});

export const createProgramApplicationAllocationSchema = z
  .object({
    application_id: z.string().uuid(),
    delivery_area_id: z.string().uuid().optional(),
    notes: z.string().trim().max(2_000).optional(),
    partner_assignment_id: z.string().uuid().optional(),
    status: z.enum(["waitlisted", "reserved", "allocated"]),
  })
  .superRefine((value, context) => {
    if (value.status !== "waitlisted" && !value.delivery_area_id) {
      context.addIssue({ code: "custom", message: "Area penyaluran wajib dipilih untuk reservasi atau alokasi.", path: ["delivery_area_id"] });
    }
  });

export type CreateProgramDeliveryAreaInput = z.infer<typeof createProgramDeliveryAreaSchema>;
export type CreateProgramPartnerAssignmentInput = z.infer<typeof createProgramPartnerAssignmentSchema>;
export type CreateProgramApplicationAllocationInput = z.infer<typeof createProgramApplicationAllocationSchema>;
