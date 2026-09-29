export type BeneficiaryListItem = {
  address_line: string | null;
  asnaf_category: string | null;
  assessment_status: string | null;
  beneficiary_categories: string[] | null;
  beneficiary_type: string | null;
  birth_date: string | null;
  cash_received: string;
  city: string | null;
  contact_status: string;
  contact_type: string;
  display_name: string;
  district: string | null;
  gender: string | null;
  household_size: number | null;
  id: string;
  identity_last4: string | null;
  last_aid_at: string | null;
  packages_received: number;
  primary_phone: string | null;
  profile_completeness: number;
  profile_id: string | null;
  profile_status: string | null;
  program_count: number;
  program_names: string[];
  sources: string[];
  vulnerability_level: string | null;
  waqf_received: string;
};

export type BeneficiarySummary = {
  high_vulnerability: number;
  kafalah_beneficiaries: number;
  reached: number;
  served_90d: number;
  total: number;
  waqf_beneficiaries: number;
  with_profile: number;
};

type Row = Record<string, string | number | boolean | null>;

export type BeneficiaryProfile = {
  asnaf_category: string | null;
  assessment_status: string;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  beneficiary_categories: string[];
  beneficiary_type: string;
  birth_place: string | null;
  dependents_count: number | null;
  disability_status: string | null;
  education_level: string | null;
  eligibility_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_relation: string | null;
  health_notes: string | null;
  household_size: number | null;
  housing_status: string | null;
  income_range: string;
  marital_status: string | null;
  monthly_income: string | null;
  occupation: string | null;
  referral_partner_contact_id: string | null;
  referral_partner_name: string | null;
  registration_source: string;
  status: string;
  vulnerability_level: string;
};

export type BeneficiaryContact = {
  address_line: string | null;
  birth_date: string | null;
  city: string | null;
  contact_type: string;
  created_at: string;
  display_name: string;
  district: string | null;
  gender: string | null;
  id: string;
  postal_code: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  province: string | null;
  roles: string[];
  status: string;
  village: string | null;
  whatsapp_phone: string | null;
};

export type BeneficiaryDetail = {
  applications: Row[];
  cases: Row[];
  contact: BeneficiaryContact;
  distributions: Row[];
  fulfillments: Row[];
  identities: Array<{
    identity_last4: string | null;
    identity_type: string;
    verification_status: string;
  }>;
  kafalah: Row[];
  profile: BeneficiaryProfile | null;
  profile_completeness: number;
  sensitive_visible: boolean;
  totals: {
    cash_received: string;
    packages_received: number;
    program_count: number;
    waqf_received: string;
  };
  waqf_benefits: Row[];
  waqf_utilizations: Row[];
};
