export type GovernanceBaseRecord = {
  created_at: string;
  id: string;
  reference_number: string;
  resolution_due_at?: string;
  status: string;
  title: string;
};

export type RiskFlag = GovernanceBaseRecord & {
  description: string;
  risk_type: string;
  severity: string;
  source: string;
  subject_type: string;
};

export type GovernanceIncident = GovernanceBaseRecord & {
  category: string;
  description: string;
  occurred_at: string;
  severity: string;
};

export type Complaint = GovernanceBaseRecord & {
  category: string;
  channel: string;
  classification: string;
  is_anonymous: boolean;
  received_at: string;
};

export type CorrectiveAction = GovernanceBaseRecord & {
  due_at: string;
  owner_profile_id: string;
  source_id: string;
  source_type: string;
};

export type AuditEventSummary = {
  action: string;
  actor_profile_id: string;
  entity_id: string;
  entity_type: string;
  id: string;
  occurred_at: string;
  request_id: string;
};
