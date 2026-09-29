export type WaqfAsset = {
  acquisition_date: string | null;
  acquisition_value: string | null;
  asset_type: string;
  benefit_distributions?: WaqfBenefitDistribution[];
  collection_scheme: string;
  contributions?: WaqfContribution[];
  created_at: string;
  currency: string;
  description: string;
  designation: string | null;
  duration_end_date: string | null;
  fundraising_target: string | null;
  pledge_date: string | null;
  proposals?: Array<{
    id: string;
    proposal_type: string;
    proposer_name: string;
    reference_number: string;
    status: string;
    title: string;
  }>;
  total_contributions?: string;
  wakif_count?: number;
  waqf_duration: string;
  waqf_purpose: string;
  donor_contact_id: string | null;
  donor_name?: string | null;
  events?: WaqfEvent[];
  id: string;
  income_records?: WaqfIncomeRecord[];
  latest_valuation?: string | null;
  legal_documents?: WaqfLegalDocument[];
  legal_status: "disputed" | "incomplete" | "pending_review" | "verified";
  location_text: string | null;
  maintenance_records?: WaqfMaintenanceRecord[];
  name: string;
  nazhir_assignments?: WaqfNazhirAssignment[];
  operational_status:
    | "active"
    | "draft"
    | "retired"
    | "suspended"
    | "under_maintenance";
  reference_number: string;
  total_benefit?: string;
  total_income?: string;
  utilizations?: WaqfUtilization[];
  valuations?: WaqfValuation[];
};

export type WaqfContactOption = {
  contact_type: string;
  display_name: string;
  id: string;
  primary_email: string | null;
  primary_phone: string | null;
};

export type WaqfLegalDocument = {
  created_at: string;
  document_number: string;
  document_type: string;
  id: string;
  issuer: string | null;
  issued_at: string | null;
  verification_notes: string | null;
  verification_status: "pending" | "rejected" | "verified";
};

export type WaqfNazhirAssignment = {
  assignment_scope: string;
  contact_name: string;
  id: string;
  start_date: string;
  status: string;
};

export type WaqfValuation = {
  amount: string;
  created_at: string;
  currency: string;
  id: string;
  method: string;
  valuation_date: string;
};

export type WaqfUtilization = {
  beneficiary_name: string | null;
  expected_benefit: string;
  id: string;
  program_name: string | null;
  start_date: string;
  status: string;
  utilization_type: string;
};

export type WaqfMaintenanceRecord = {
  amount: string;
  currency: string;
  description: string;
  id: string;
  maintenance_type: string;
  occurred_at: string;
  vendor_name: string | null;
};

export type WaqfIncomeRecord = {
  amount: string;
  currency: string;
  id: string;
  income_reference: string;
  income_type: string;
  notes: string;
  payer_name: string | null;
  received_at: string;
};

export type WaqfBenefitDistribution = {
  amount: string;
  beneficiary_name: string | null;
  benefit_type: string;
  currency: string;
  distributed_at: string;
  distribution_reference: string;
  id: string;
  notes: string;
  program_name: string | null;
};

export type WaqfEvent = {
  created_at: string;
  event_type: string;
  id: string;
};

export type WaqfContribution = {
  amount: string;
  asset_id: string;
  certificate_number: string | null;
  contribution_form: string;
  created_at: string;
  currency: string;
  id: string;
  notes: string | null;
  on_behalf_of: string | null;
  payment_method: string;
  pledge_confirmed: boolean;
  received_at: string;
  reference_number: string;
  reversal_reason: string | null;
  status: "received" | "reversed";
  wakif_contact_id: string | null;
  wakif_name: string;
};

export type WaqfProposal = {
  asset_id: string | null;
  asset_name: string | null;
  asset_reference: string | null;
  beneficiary_estimate: number | null;
  converted_asset_id: string | null;
  converted_asset_name: string | null;
  converted_utilization_id: string | null;
  created_at: string;
  created_by: string;
  currency: string;
  description: string;
  events?: WaqfEvent[];
  id: string;
  location_text: string | null;
  proposal_type: "asset_offer" | "benefit_request" | "waqf_project";
  proposed_asset_type: string | null;
  proposer_contact_id: string;
  proposer_name: string;
  proposer_phone: string | null;
  proposer_type: "individual" | "institution";
  reference_number: string;
  requested_amount: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  status:
    | "approved"
    | "cancelled"
    | "converted"
    | "draft"
    | "rejected"
    | "submitted"
    | "under_review";
  submitted_at: string | null;
  title: string;
};
