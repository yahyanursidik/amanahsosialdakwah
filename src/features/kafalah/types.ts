export type KafalahContactOption = {
  id: string;
  display_name: string;
  primary_email?: string | null;
  primary_phone?: string | null;
};

export type KafalahNeed = {
  id: string;
  reference_number: string;
  beneficiary_contact_id: string;
  beneficiary_name: string;
  need_type: string;
  title: string;
  description: string;
  approved_amount: string;
  matched_amount: string;
  currency: string;
  period_months: number;
  status: string;
  created_at: string;
};

export type KafalahMatch = {
  id: string;
  reference_number: string;
  need_id: string;
  need_reference: string;
  need_title: string;
  sponsor_name: string;
  beneficiary_name: string;
  matched_amount: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
};

export type KafalahSchedule = {
  id: string;
  installment_number: number;
  due_date: string;
  amount: string;
  paid_amount: string;
  distributed_amount: string;
  status: string;
};

export type KafalahPayment = {
  id: string;
  schedule_id: string;
  payment_reference: string;
  amount: string;
  paid_at: string;
  channel: string;
  status: string;
};

export type KafalahDistribution = {
  id: string;
  schedule_id: string;
  payment_id: string;
  amount: string;
  distributed_at: string;
  method: string;
  confirmation_notes: string;
  status: string;
};

export type KafalahMonitoring = {
  id: string;
  period_start: string;
  period_end: string;
  outcome: string;
  summary: string;
  status: string;
};

export type KafalahRenewal = {
  id: string;
  requested_start_date: string;
  requested_end_date: string;
  periodic_amount: string;
  reason: string;
  status: string;
};

export type KafalahContract = {
  id: string;
  reference_number: string;
  match_id: string;
  match_reference: string;
  sponsor_name: string;
  beneficiary_name: string;
  need_title?: string;
  matched_amount?: string;
  frequency: string;
  periodic_amount: string;
  start_date: string;
  end_date: string;
  terms: string;
  status: string;
  created_at: string;
  schedules?: KafalahSchedule[];
  payments?: KafalahPayment[];
  distributions?: KafalahDistribution[];
  monitoring_reports?: KafalahMonitoring[];
  renewals?: KafalahRenewal[];
  events?: Array<{
    id: string;
    event_type: string;
    created_at: string;
  }>;
};
