import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});

export const createApplicationSchema = z.object({
  applicant_contact_id: z.string().uuid(),
  channel: z.enum(["walk_in", "referral", "partner", "online", "field"]),
  notes: z.string().trim().max(4000).optional(),
  program_id: z.string().uuid(),
  requested_support: z.string().trim().min(10).max(4000),
  urgency: z.enum(["normal", "urgent", "emergency"]).default("normal"),
});

export const submitApplicationSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const screenApplicationSchema = z.object({
  notes: z.string().trim().min(10).max(4000),
  result: z.enum(["pass", "review", "reject"]),
  risk_flags: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
});

export const convertApplicationSchema = z.object({
  summary: z.string().trim().max(4000).optional(),
});

export const assignCaseSchema = z.object({
  assigned_to: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
});

export type AssignCaseInput = z.infer<typeof assignCaseSchema>;
export type ConvertApplicationInput = z.infer<
  typeof convertApplicationSchema
>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type ScreenApplicationInput = z.infer<
  typeof screenApplicationSchema
>;
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
