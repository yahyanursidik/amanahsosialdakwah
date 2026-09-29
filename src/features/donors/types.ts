export type DonorEngagement = "active" | "cooling" | "lapsed" | "never";

export type DonorListItem = {
  cash_total: string;
  city: string | null;
  contact_type: "institution" | "person";
  display_name: string;
  donated_waqf_asset: boolean;
  donor_status: string;
  engagement: DonorEngagement;
  first_gift_at: string | null;
  gift_count: number;
  goods_total: string;
  grand_total: string;
  id: string;
  kafalah_total: string;
  last_gift_at: string | null;
  manager_name: string | null;
  next_follow_up_at: string | null;
  open_follow_ups: number;
  preferred_channel: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  profile_id: string | null;
  recurring_amount: string | null;
  recurring_frequency: string | null;
  relationship_manager_id: string | null;
  segment: string | null;
  this_year_total: string;
  waqf_total: string;
  whatsapp_phone: string | null;
};

export type DonorFollowUp = {
  assignee_name: string | null;
  contact_id: string;
  display_name: string;
  follow_up_at: string | null;
  follow_up_note: string | null;
  id: string;
  interaction_type: string;
  summary: string;
};

export type DonorSummary = {
  active: number;
  cooling: number;
  followUps: DonorFollowUp[];
  follow_ups_due: number;
  lapsed: number;
  never: number;
  new_this_year: number;
  recurring: number;
  this_year_total: string;
  total: number;
  wakif: number;
};

export type DonorProfile = {
  acquisition_source: string | null;
  giving_interests: string[];
  manager_name: string | null;
  notes: string | null;
  preferred_channel: string;
  publish_name: boolean;
  receipt_preference: string;
  recurring_amount: string | null;
  recurring_day: number | null;
  recurring_frequency: string;
  relationship_manager_id: string | null;
  report_preference: string;
  segment: string;
  status: string;
  updated_at: string;
};

export type DonorContact = {
  address_line: string | null;
  birth_date: string | null;
  city: string | null;
  contact_type: "institution" | "person";
  display_name: string;
  gender: string | null;
  id: string;
  primary_email: string | null;
  primary_phone: string | null;
  province: string | null;
  roles: string[];
  whatsapp_phone: string | null;
};

export type DonorGift = {
  amount: string;
  detail: string | null;
  gift_at: string;
  href: string;
  id: string;
  kind: "cash" | "in_kind" | "kafalah" | "waqf";
  purpose: string | null;
  reference_number: string;
  status: string;
};

export type DonorInteraction = {
  assignee_name: string | null;
  author_name: string | null;
  direction: string;
  follow_up_at: string | null;
  follow_up_done_at: string | null;
  follow_up_note: string | null;
  follow_up_status: "done" | "none" | "open";
  id: string;
  interaction_type: string;
  occurred_at: string | null;
  summary: string;
};

export type DonorDetail = {
  commitments: Array<{
    amount: string;
    committed_at: string;
    expected_at: string | null;
    id: string;
    notes: string | null;
    received_amount: string;
    reference_number: string;
    restriction_name: string;
    status: string;
  }>;
  consents: Array<{ channel: string; consent_type: string; id: string; status: string }>;
  contact: DonorContact;
  interactions: DonorInteraction[];
  permissions: { canManage: boolean; canManageInteractions: boolean };
  profile: DonorProfile | null;
  programs: Array<{ id: string; name: string; status: string }>;
  sponsorships: Array<{
    end_date: string;
    id: string;
    matched_amount: string;
    reference_number: string;
    start_date: string;
    status: string;
  }>;
  timeline: DonorGift[];
  totals: Pick<
    DonorListItem,
    | "cash_total"
    | "engagement"
    | "first_gift_at"
    | "gift_count"
    | "goods_total"
    | "grand_total"
    | "kafalah_total"
    | "last_gift_at"
    | "this_year_total"
    | "waqf_total"
  >;
  waqfAssets: Array<{
    acquisition_value: string | null;
    asset_type: string;
    id: string;
    name: string;
    operational_status: string;
    reference_number: string;
  }>;
  yearly: Array<{ amount: string; gifts: number; kind: string; year: number }>;
};
