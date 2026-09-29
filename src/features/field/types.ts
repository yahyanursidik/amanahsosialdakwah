export type FieldDelivery = {
  courier_name: string;
  destination_address: string;
  destination_name: string;
  destination_phone: string | null;
  dispatched_at: string | null;
  id: string;
  package_count: number | null;
  packing_reference: string | null;
  planned_dispatch_at: string | null;
  reference_number: string;
  status: string;
  tracking_number: string | null;
};

export type FieldDistribution = {
  amount: string;
  beneficiary_address: string | null;
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_phone: string | null;
  currency: string;
  distribution_method: string;
  id: string;
  planned_at: string;
  program_name: string;
  purpose: string;
  reference_number: string;
  requires_confirmation: boolean;
  status: string;
};

export type FieldCase = {
  beneficiary_address: string | null;
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_phone: string | null;
  id: string;
  opened_at: string;
  program_name: string;
  reference_number: string;
  status: string;
};

export type FieldBeneficiaryToVerify = {
  address: string | null;
  assessment_status: string;
  display_name: string;
  id: string;
  last_visit_at: string | null;
  primary_phone: string | null;
  vulnerability_level: string;
};

export type FieldReportSummary = {
  follow_up_needed: boolean;
  id: string;
  occurred_at: string;
  reference_number: string;
  report_type: string;
  status: string;
  title: string;
  verification_result: string | null;
};

export type FieldWorkspace = {
  assignedCases: FieldCase[];
  beneficiariesToVerify: FieldBeneficiaryToVerify[];
  deliveries: FieldDelivery[];
  distributions: FieldDistribution[];
  distributionsToVerify: Array<{
    amount: string;
    beneficiary_name: string;
    currency: string;
    id: string;
    program_name: string;
    reference_number: string;
    status: string;
  }>;
  pendingReview: number | null;
  recentReports: FieldReportSummary[];
  summary: { deliver: number; distribute: number; tasks: number; verify: number };
  tasks: FieldTask[];
};

export type FieldTaskType = "delivery" | "distribution" | "monitoring" | "other" | "verification";
export type FieldTaskStatus = "cancelled" | "done" | "in_progress" | "todo";
export type FieldTaskItemKind =
  | "check"
  | "confirmation"
  | "gps"
  | "handover_cash"
  | "handover_goods"
  | "photo"
  | "report";

export type FieldTask = {
  assigned_profile_id: string;
  assignee_name: string;
  beneficiary_contact_id: string | null;
  beneficiary_name: string | null;
  beneficiary_phone: string | null;
  cancelled_reason: string | null;
  case_id: string | null;
  case_reference: string | null;
  cash_amount: string | null;
  completed_at: string | null;
  completed_report_id: string | null;
  completion_notes: string | null;
  distribution_plan_id: string | null;
  distribution_reference: string | null;
  due_date: string | null;
  goods_package_count: number | null;
  goods_summary: string | null;
  id: string;
  instructions: string | null;
  items_done: number;
  items_total: number;
  location_text: string | null;
  priority: "high" | "normal" | "urgent";
  program_id: string | null;
  program_name: string | null;
  reference_number: string;
  required_done: number;
  required_total: number;
  shipment_id: string | null;
  shipment_reference: string | null;
  started_at: string | null;
  status: FieldTaskStatus;
  support_modes: Array<"cash" | "in_kind">;
  task_type: FieldTaskType;
  title: string;
};

export type FieldTaskItem = {
  done_at: string | null;
  done_by_name: string | null;
  id: string;
  is_done: boolean;
  is_required: boolean;
  item_kind: FieldTaskItemKind;
  label: string;
  note: string | null;
  sequence_number: number;
};

export type FieldTaskDetail = FieldTask & {
  beneficiary: {
    address: string | null;
    display_name: string;
    id: string;
    primary_phone: string | null;
    whatsapp_phone: string | null;
  } | null;
  items: FieldTaskItem[];
  program_goods: Array<{ name: string; quantity: string; unit: string }>;
  reports: Array<{
    id: string;
    occurred_at: string;
    reference_number: string;
    report_type: string;
    status: string;
  }>;
};

export type FieldReport = FieldReportSummary & {
  amount_distributed: string | null;
  beneficiaries_reached: number | null;
  beneficiary_contact_id: string | null;
  beneficiary_name: string | null;
  case_reference: string | null;
  created_by: string;
  distribution_plan_id: string | null;
  distribution_reference: string | null;
  household_size_observed: number | null;
  issues: string | null;
  latitude: string | null;
  location_accuracy_m: string | null;
  location_text: string | null;
  longitude: string | null;
  packages_delivered: number | null;
  photo_count: number;
  photos?: Array<{
    caption: string | null;
    data_url: string;
    id: string;
    sequence_number: number;
  }>;
  program_name: string | null;
  reporter_name: string;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
  severity: string | null;
  shipment_id: string | null;
  shipment_reference: string | null;
  summary: string;
  verification_checks: Record<string, boolean>;
  waqf_asset_name: string | null;
};
