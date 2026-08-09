export type WaqfAsset = {
  acquisition_date: string | null;
  acquisition_value: string | null;
  asset_type:
    | "building"
    | "cash"
    | "equipment"
    | "land"
    | "other"
    | "productive_asset"
    | "vehicle";
  benefit_distributions?: WaqfBenefitDistribution[];
  created_at: string;
  currency: string;
  description: string;
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
