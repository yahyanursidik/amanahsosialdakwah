export type DistributionStatus =
  | "draft"
  | "ready"
  | "assigned"
  | "in_progress"
  | "executed"
  | "confirmed"
  | "revision_required"
  | "verified"
  | "completed"
  | "cancelled";

export type DistributionEvent = {
  id: string;
  actor_name?: string;
  cycle_number: number;
  event_type: string;
  from_status?: string | null;
  notes?: string | null;
  occurred_at: string;
  to_status: string;
};

export type DistributionEvidence = {
  id: string;
  captured_at: string;
  creator_name?: string;
  cycle_number: number;
  description: string;
  evidence_kind: "field_note" | "beneficiary_statement" | "receipt_reference";
  sequence_number: number;
};

export type DistributionPlan = {
  id: string;
  reference_number: string;
  allocation_id: string;
  allocation_reference?: string;
  amount: string;
  assignee_name?: string | null;
  beneficiary_contact_id: string;
  beneficiary_name: string;
  cancelled_reason?: string | null;
  case_id: string;
  case_reference: string;
  completed_at?: string | null;
  currency: string;
  cycle_number: number;
  disbursement_id: string;
  disbursement_reference: string;
  distribution_method: string;
  planned_at: string;
  program_id: string;
  program_name: string;
  purpose: string;
  requires_confirmation: boolean;
  status: DistributionStatus;
  updated_at: string;
  active_assignment?: {
    assignee_name?: string;
    membership_id: string;
  } | null;
  current_confirmation?: {
    confirmation_method: string;
    confirmed_at: string;
    confirmed_by_name: string;
  } | null;
  current_execution?: {
    amount: string;
    executed_at: string;
    executor_name?: string;
    outcome: "delivered" | "failed";
  } | null;
  current_verification?: {
    decision: "verified" | "revision_required";
    notes: string;
    verifier_name?: string;
    verified_at: string;
  } | null;
  events?: DistributionEvent[];
  evidence?: DistributionEvidence[];
};

export type DistributionAssignee = {
  id: string;
  display_name: string;
  email: string;
  profile_id: string;
};

export type DistributionOption = {
  id: string;
  reference_number: string;
  amount?: string;
  currency?: string;
};

export type EligibleCaseOption = {
  id: string;
  beneficiary_name?: string;
  reference_number: string;
};
