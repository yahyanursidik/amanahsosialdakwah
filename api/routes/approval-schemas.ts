import { z } from "zod";

export const approvalIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const approvalVersionParamsSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
});

export const approvalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.string().trim().max(32).optional(),
});

const approvalStepSchema = z.object({
  name: z.string().trim().min(2).max(200),
  required_permission: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/),
  minimum_approvals: z.coerce.number().int().min(1).max(20).default(1),
});

export const createApprovalWorkflowSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  resource_type: z.enum(["assessment", "case", "fund_allocation"]),
  steps: z.array(approvalStepSchema).min(1).max(20),
});

export const createApprovalWorkflowVersionSchema = z.object({
  steps: z.array(approvalStepSchema).min(1).max(20),
});

export const publishApprovalWorkflowSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const createApprovalRequestSchema = z.object({
  workflow_version_id: z.string().uuid(),
  subject_type: z.enum(["assessment", "case", "fund_allocation"]),
  subject_id: z.string().uuid(),
  title: z.string().trim().min(3).max(300),
});

export const approvalCommandSchema = z.object({
  comment: z.string().trim().max(4000).optional(),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "revision_requested"]),
  comment: z.string().trim().min(10).max(4000),
});

export type ApprovalListQuery = z.infer<typeof approvalListQuerySchema>;
export type CreateApprovalWorkflowInput = z.infer<
  typeof createApprovalWorkflowSchema
>;
export type CreateApprovalWorkflowVersionInput = z.infer<
  typeof createApprovalWorkflowVersionSchema
>;
export type CreateApprovalRequestInput = z.infer<
  typeof createApprovalRequestSchema
>;
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
export type ApprovalCommandInput = z.infer<typeof approvalCommandSchema>;
