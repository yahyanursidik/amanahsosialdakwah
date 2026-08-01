import { z } from "zod";

const dateTime = z.string().datetime({ offset: true });
const notes = z.string().trim().min(10).max(2000);

export const logisticsIdParamsSchema = z.object({ id: z.string().uuid() });
export const logisticsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});
export const logisticsIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9._:-]+$/);
export const createLogisticsCourierSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Za-z0-9._:-]+$/)
    .transform((value) => value.toUpperCase()),
  contact_name: z.string().trim().max(160).optional(),
  contact_phone: z.string().trim().max(40).optional(),
  courier_type: z.enum(["internal", "external", "partner"]).default("external"),
  name: z.string().trim().min(3).max(200),
  service_notes: z.string().trim().max(1000).optional(),
});
export const createLogisticsShipmentSchema = z.object({
  courier_id: z.string().uuid(),
  destination_address: z.string().trim().min(10).max(2000),
  destination_name: z.string().trim().min(2).max(200),
  destination_phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  packing_id: z.string().uuid(),
  planned_dispatch_at: dateTime.optional(),
  service_level: z.string().trim().max(100).optional(),
  tracking_number: z.string().trim().max(160).optional(),
});
export const logisticsDispatchSchema = z.object({
  dispatched_at: dateTime,
  notes: z.string().trim().max(2000).optional(),
  tracking_number: z.string().trim().max(160).optional(),
});
export const logisticsTrackingSchema = z
  .object({
    event_at: dateTime,
    event_type: z.enum([
      "picked_up",
      "in_transit",
      "arrived_hub",
      "out_for_delivery",
      "delivery_attempt",
      "return_in_transit",
      "note",
    ]),
    external_event_id: z.string().trim().max(160).optional(),
    location: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.event_type === "note" && (value.notes?.length ?? 0) < 5) {
      context.addIssue({
        code: "custom",
        message: "Catatan tracking minimal 5 karakter.",
        path: ["notes"],
      });
    }
  });
export const logisticsDeliverySchema = z.object({
  confirmation_method: z
    .enum(["field_confirmation", "courier_webhook", "manual_verification"])
    .default("field_confirmation"),
  notes: z.string().trim().max(2000).optional(),
  received_at: dateTime,
  recipient_name: z.string().trim().min(2).max(200),
  relationship_to_recipient: z.string().trim().max(160).optional(),
});
export const logisticsReturnRequestSchema = z.object({
  reason_code: z.enum([
    "recipient_unavailable",
    "address_invalid",
    "refused",
    "damaged",
    "delivery_failed",
    "other",
  ]),
  reason_notes: notes,
});
export const logisticsReturnReceiveSchema = z.object({
  condition_on_return: notes,
  received_at: dateTime,
});
export const logisticsIncidentSchema = z.object({
  description: notes,
  incident_type: z.enum(["damage", "loss", "delay", "security", "other"]),
  location: z.string().trim().max(300).optional(),
  occurred_at: dateTime,
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});
export const logisticsIncidentResolutionSchema = z.object({
  resolution_notes: notes,
});
export const logisticsReasonSchema = z.object({ reason: notes });

export type LogisticsListQuery = z.infer<typeof logisticsListQuerySchema>;
export type CreateLogisticsCourierInput = z.infer<
  typeof createLogisticsCourierSchema
>;
export type CreateLogisticsShipmentInput = z.infer<
  typeof createLogisticsShipmentSchema
>;
export type LogisticsDispatchInput = z.infer<typeof logisticsDispatchSchema>;
export type LogisticsTrackingInput = z.infer<typeof logisticsTrackingSchema>;
export type LogisticsDeliveryInput = z.infer<typeof logisticsDeliverySchema>;
export type LogisticsReturnRequestInput = z.infer<
  typeof logisticsReturnRequestSchema
>;
export type LogisticsReturnReceiveInput = z.infer<
  typeof logisticsReturnReceiveSchema
>;
export type LogisticsIncidentInput = z.infer<typeof logisticsIncidentSchema>;
export type LogisticsIncidentResolutionInput = z.infer<
  typeof logisticsIncidentResolutionSchema
>;
