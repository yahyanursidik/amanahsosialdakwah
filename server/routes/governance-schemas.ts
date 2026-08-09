import { z } from "zod";

const dateTime = z.string().datetime({ offset: true });
const notes = z.string().trim().min(10).max(4000);
const severity = z.enum(["low", "medium", "high", "critical"]);

export const governanceIdParamsSchema = z.object({ id: z.string().uuid() });
export const governanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(40).optional(),
});
export const createRiskFlagSchema = z.object({
  description: notes,
  owner_profile_id: z.string().uuid().optional().nullable(),
  risk_type: z.enum([
    "financial",
    "fraud",
    "operational",
    "safeguarding",
    "privacy",
    "legal",
    "reputation",
    "compliance",
    "other",
  ]),
  severity: severity.default("medium"),
  source: z.enum(["manual", "system", "audit", "incident", "complaint"]).default("manual"),
  subject_id: z.string().uuid().optional().nullable(),
  subject_type: z.string().trim().min(2).max(80),
  title: z.string().trim().min(5).max(240),
});
export const createGovernanceIncidentSchema = z.object({
  category: z.enum(["security", "financial", "safeguarding", "fraud", "privacy", "operational", "legal", "reputation", "other"]),
  description: notes,
  occurred_at: dateTime,
  owner_profile_id: z.string().uuid().optional().nullable(),
  severity: severity.default("medium"),
  title: z.string().trim().min(5).max(240),
});
export const createComplaintSchema = z.object({
  category: z.enum(["service", "distribution", "staff_conduct", "fraud", "safeguarding", "privacy", "discrimination", "other"]),
  channel: z.enum(["web", "email", "phone", "whatsapp", "letter", "in_person", "referral", "other"]),
  classification: z.enum(["internal", "confidential", "restricted"]).default("confidential"),
  complainant_contact_id: z.string().uuid().optional().nullable(),
  description: notes,
  is_anonymous: z.boolean().default(false),
  received_at: dateTime,
  title: z.string().trim().min(5).max(240),
}).superRefine((value, context) => {
  if (value.is_anonymous && value.complainant_contact_id) {
    context.addIssue({ code: "custom", message: "Pengaduan anonim tidak boleh menautkan contact.", path: ["complainant_contact_id"] });
  }
});
export const createCorrectiveActionSchema = z.object({
  description: notes,
  due_at: dateTime,
  owner_profile_id: z.string().uuid().optional().nullable(),
  source_id: z.string().uuid(),
  source_type: z.enum(["risk_flag", "incident", "complaint", "audit_event"]),
  title: z.string().trim().min(5).max(240),
});
export const governanceTransitionSchema = z.object({
  notes,
  status: z.string().trim().min(3).max(40),
});

export type GovernanceListQuery = z.infer<typeof governanceListQuerySchema>;
export type CreateRiskFlagInput = z.infer<typeof createRiskFlagSchema>;
export type CreateGovernanceIncidentInput = z.infer<typeof createGovernanceIncidentSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type CreateCorrectiveActionInput = z.infer<typeof createCorrectiveActionSchema>;
export type GovernanceTransitionInput = z.infer<typeof governanceTransitionSchema>;
