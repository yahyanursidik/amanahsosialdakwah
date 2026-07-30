import type { BaseRecord } from "@refinedev/core";

export type ApprovalWorkflowStep = {
  id: string;
  minimum_approvals: number;
  name: string;
  position: number;
  required_permission: string;
};

export type ApprovalWorkflowVersion = {
  created_at: string;
  id: string;
  published_at: string | null;
  published_by: string | null;
  status: "draft" | "published" | "retired";
  steps: ApprovalWorkflowStep[];
  version_number: number;
};

export type ApprovalWorkflowRecord = BaseRecord & {
  code: string;
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  organization_id: string;
  published_version_id: string | null;
  published_version_number: number | null;
  resource_type: "assessment" | "case" | "fund_allocation";
  status: "active" | "draft" | "retired";
  step_count: number;
  updated_at: string;
  versions?: ApprovalWorkflowVersion[];
};

export type ApprovalRequestStep = {
  approval_count: number;
  completed_at: string | null;
  id: string;
  minimum_approvals: number;
  name: string;
  position: number;
  required_permission: string;
  status:
    "approved" | "in_progress" | "pending" | "rejected" | "revision_requested";
};

export type ApprovalAction = {
  action:
    | "approved"
    | "cancelled"
    | "created"
    | "rejected"
    | "resubmitted"
    | "revision_requested"
    | "submitted";
  actor_name: string;
  actor_profile_id: string;
  comment: string | null;
  cycle_number: number;
  from_status: string | null;
  id: string;
  occurred_at: string;
  to_status: string;
};

export type ApprovalRequestRecord = BaseRecord & {
  actions?: ApprovalAction[];
  created_at: string;
  current_step_position: number | null;
  cycle_number: number;
  id: string;
  organization_id: string;
  reference_number: string;
  requested_by: string;
  requester_name: string;
  status:
    | "approved"
    | "cancelled"
    | "draft"
    | "in_progress"
    | "rejected"
    | "revision_requested";
  steps?: ApprovalRequestStep[];
  subject_id: string;
  subject_snapshot: Record<string, unknown>;
  subject_type: "assessment" | "case" | "fund_allocation";
  title: string;
  updated_at: string;
  workflow_name: string;
  workflow_version_id: string;
  workflow_version_number: number;
};
