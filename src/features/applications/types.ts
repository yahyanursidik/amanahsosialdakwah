import type { BaseRecord } from "@refinedev/core";

export type ApplicationStatus =
  | "accepted"
  | "cancelled"
  | "converted"
  | "draft"
  | "in_screening"
  | "rejected"
  | "submitted";

export type ApplicationEvent = {
  actor_profile_id: string;
  event_type: string;
  from_status: string | null;
  id: string;
  note: string | null;
  occurred_at: string;
  to_status: string | null;
};

export type ApplicationScreening = {
  id: string;
  notes: string;
  result: "pass" | "reject" | "review";
  risk_flags: unknown;
  screened_at: string;
  screened_by: string;
  sequence_number: number;
};

export type ApplicationRecord = BaseRecord & {
  applicant_contact_id: string;
  applicant_name: string | null;
  channel: "field" | "online" | "partner" | "referral" | "walk_in";
  created_at: string;
  created_by: string | null;
  events?: ApplicationEvent[];
  id: string;
  linked_case_id?: string | null;
  notes: string | null;
  organization_id: string;
  program_id: string;
  program_name: string | null;
  reference_number: string;
  requested_support: string;
  screening_completed_at: string | null;
  screenings?: ApplicationScreening[];
  status: ApplicationStatus;
  submitted_at: string | null;
  updated_at: string;
  updated_by: string | null;
  urgency: "emergency" | "normal" | "urgent";
};

export type CaseStatus =
  | "assessment"
  | "assigned"
  | "cancelled"
  | "closed"
  | "eligible"
  | "not_eligible"
  | "open"
  | "verified";

export type CaseRecord = BaseRecord & {
  application_id: string;
  assigned_to: string | null;
  assignee_name: string | null;
  beneficiary_contact_id: string;
  beneficiary_name: string | null;
  closed_at: string | null;
  created_at: string;
  events?: ApplicationEvent[];
  id: string;
  opened_at: string;
  organization_id: string;
  program_id: string;
  program_name: string | null;
  reference_number: string;
  status: CaseStatus;
  summary: string | null;
  updated_at: string;
};
