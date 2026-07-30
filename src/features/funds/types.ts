import type { BaseRecord } from "@refinedev/core";

export type FundRestriction = BaseRecord & {
  available_balance?: string;
  allocated_balance?: string;
  cash_balance?: string;
  code: string;
  currency: string;
  disbursed_total?: string;
  id: string;
  name: string;
  organization_id: string;
  program_id: string | null;
  program_name: string | null;
  restriction_type: "program" | "unrestricted";
  status: "active" | "inactive";
};

export type FundCommitment = BaseRecord & {
  amount: string;
  committed_at: string;
  currency: string;
  donor_contact_id: string | null;
  donor_name: string | null;
  expected_at: string | null;
  id: string;
  reference_number: string;
  restriction_id: string;
  restriction_name: string;
  status: "active" | "cancelled" | "fulfilled" | "partially_received";
};

export type FundReceipt = BaseRecord & {
  amount: string;
  currency: string;
  donor_name: string | null;
  id: string;
  received_at: string;
  reference_number: string;
  restriction_name: string;
  status: "posted" | "reversed";
};

export type FundAllocation = BaseRecord & {
  amount: string;
  approval_request_id?: string | null;
  approval_status?: string | null;
  currency: string;
  id: string;
  program_id: string;
  program_name: string;
  purpose: string;
  reference_number: string;
  remaining_amount?: string;
  restriction_id: string;
  restriction_name: string;
  status: "approved" | "draft" | "reversed";
};

export type FundDisbursement = BaseRecord & {
  allocation_id: string;
  amount: string;
  currency: string;
  disbursed_at: string;
  id: string;
  recipient_reference: string;
  recipient_type: string;
  reference_number: string;
  status: "posted" | "reversed";
};

export type FundReconciliation = BaseRecord & {
  currency: string;
  difference_amount: string;
  id: string;
  period_ended_at: string;
  reference_number: string;
  restriction_name: string;
  statement_balance: string;
  status: "matched" | "variance";
  system_balance: string;
};

export type FundOverviewEnvelope = {
  data: FundRestriction[];
};

export type FundCommandEnvelope<T> = {
  data: T;
};
