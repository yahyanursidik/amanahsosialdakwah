// Generated from Neon compatibility models. Do not edit manually.

export interface NeonDocument {
  readonly $id: string;
  readonly $collectionId: string;
  readonly $databaseId: string;
  readonly $createdAt: string;
  readonly $updatedAt: string;
  readonly $permissions: string[];
}

export interface OrganizationsDocument extends NeonDocument {
  name: string;
  slug: string;
  kind: "platform_operator" | "trust_provider" | "manager" | "distribution_partner" | "vendor" | "community";
  status: "active" | "inactive" | "suspended";
  created_by?: string;
}

export interface OrganizationUnitsDocument extends NeonDocument {
  organization_id: string;
  parent_unit_id?: string;
  code: string;
  name: string;
  kind: "head_office" | "branch" | "department" | "region" | "project";
  status: "active" | "inactive";
  created_by?: string;
}

export interface ProfilesDocument extends NeonDocument {
  user_id: string;
  display_name: string;
  phone?: string;
  locale?: string;
  status: "active" | "inactive" | "blocked";
  created_by?: string;
}

export interface MembershipsDocument extends NeonDocument {
  organization_id: string;
  profile_id: string;
  organization_unit_id?: string;
  status: "invited" | "active" | "suspended" | "revoked";
  joined_at?: string;
  ended_at?: string;
  created_by?: string;
}

export interface RolesDocument extends NeonDocument {
  organization_id?: string;
  key: string;
  name: string;
  description?: string;
  scope: "platform" | "organization" | "unit";
  is_system?: boolean;
  status: "active" | "inactive";
  created_by?: string;
}

export interface PermissionsDocument extends NeonDocument {
  key: string;
  name: string;
  description?: string;
  scope: "platform" | "organization" | "unit";
  created_by?: string;
}

export interface RolePermissionsDocument extends NeonDocument {
  organization_id?: string;
  role_id: string;
  permission_id: string;
  created_by?: string;
}

export interface MembershipRolesDocument extends NeonDocument {
  organization_id: string;
  membership_id: string;
  role_id: string;
  organization_unit_id?: string;
  created_by?: string;
}

export interface OrganizationRelationshipsDocument extends NeonDocument {
  source_organization_id: string;
  target_organization_id: string;
  relationship_type: "trust_provider" | "manager" | "distribution_partner" | "vendor" | "funder";
  status: "pending" | "active" | "suspended" | "ended";
  starts_at: string;
  ends_at?: string;
  created_by?: string;
}

export interface ProgramCategoriesDocument extends NeonDocument {
  code: string;
  name: string;
  description?: string;
  organization_id?: string;
  status: "active" | "inactive";
  created_by?: string;
}

export interface ProgramsDocument extends NeonDocument {
  organization_id: string;
  code: string;
  name: string;
  category_id: string;
  description?: string;
  objective?: string;
  target_beneficiary_type: "individual" | "family" | "institution" | "community" | "disaster_area" | "mosque" | "school";
  target_beneficiary_count?: number;
  budget_amount: number;
  allocated_amount: number;
  disbursed_amount: number;
  fund_type: "zakat" | "infaq" | "sedekah" | "waqf" | "humanitarian" | "education" | "health" | "general";
  status: "draft" | "active" | "paused" | "completed" | "archived";
  starts_at?: string;
  ends_at?: string;
  owner_id?: string;
  is_archived: boolean;
  archived_at?: string;
  archived_by?: string;
  created_by?: string;
}

export interface ProgramRevisionsDocument extends NeonDocument {
  organization_id: string;
  program_id: string;
  action_type: "created" | "draft_updated" | "activated" | "controlled_edit" | "paused" | "resumed" | "completed" | "archived" | "restored";
  change_summary: string;
  reason?: string;
  previous_values?: string;
  new_values?: string;
  performed_by: string;
  performed_at: string;
  created_by?: string;
}

export interface CrmContactsDocument extends NeonDocument {
  organization_id: string;
  contact_type: "person" | "institution";
  display_name: string;
  legal_name?: string;
  normalized_name: string;
  primary_email?: string;
  normalized_email?: string;
  primary_phone?: string;
  normalized_phone?: string;
  whatsapp_phone?: string;
  gender?: "male" | "female" | "unknown";
  birth_date?: string;
  address_line?: string;
  village?: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  status: "active" | "inactive" | "deceased" | "archived";
  notes?: string;
  created_by?: string;
}

export interface CrmContactRolesDocument extends NeonDocument {
  organization_id: string;
  contact_id: string;
  role_type: "donor" | "kafil" | "volunteer" | "beneficiary";
  status: "active" | "inactive" | "paused" | "ended";
  started_at?: string;
  ended_at?: string;
  created_by?: string;
}

export interface CrmSensitiveIdentitiesDocument extends NeonDocument {
  organization_id: string;
  contact_id: string;
  identity_type: "nik" | "passport" | "kitab" | "tax_id" | "other";
  identity_ciphertext_ref: string;
  identity_last4?: string;
  identity_hash?: string;
  verification_status: "unverified" | "verified" | "rejected" | "expired";
  verified_at?: string;
  verified_by?: string;
  created_by?: string;
}

export interface CrmBeneficiaryProfilesDocument extends NeonDocument {
  organization_id: string;
  contact_id: string;
  beneficiary_type: "individual" | "family" | "institution" | "community";
  vulnerability_level: "low" | "medium" | "high" | "critical";
  household_size?: number;
  income_range?: "unknown" | "none" | "low" | "middle";
  assessment_status: "not_assessed" | "in_review" | "eligible" | "not_eligible" | "expired";
  status: "active" | "inactive" | "graduated" | "blocked";
  eligibility_notes?: string;
  created_by?: string;
}

export interface CrmInstitutionProfilesDocument extends NeonDocument {
  organization_id: string;
  contact_id: string;
  institution_type: "mosque" | "school" | "foundation" | "company" | "community" | "government" | "other";
  institution_code?: string;
  registration_reference?: string;
  contact_person_name?: string;
  contact_person_phone?: string;
  status: "active" | "inactive" | "unverified" | "archived";
  created_by?: string;
}

export interface CrmTagsDocument extends NeonDocument {
  organization_id: string;
  key: string;
  label: string;
  description?: string;
  color?: string;
  status: "active" | "inactive";
  created_by?: string;
}

export interface CrmContactTagsDocument extends NeonDocument {
  organization_id: string;
  contact_id: string;
  tag_id: string;
  created_by?: string;
}

export interface CrmInteractionsDocument extends NeonDocument {
  organization_id: string;
  contact_id: string;
  interaction_type: "call" | "whatsapp" | "email" | "visit" | "meeting" | "note";
  direction: "inbound" | "outbound" | "internal";
  occurred_at?: string;
  summary: string;
  follow_up_note?: string;
  follow_up_at?: string;
  created_by?: string;
}

export interface CrmConsentsDocument extends NeonDocument {
  organization_id: string;
  contact_id: string;
  consent_type: "data_processing" | "communication" | "documentation" | "media_publication";
  channel: "paper" | "web" | "whatsapp" | "email" | "verbal_recorded";
  status: "granted" | "withdrawn" | "expired";
  consented_at?: string;
  withdrawn_at?: string;
  expires_at?: string;
  evidence_file_id?: string;
  notes?: string;
  created_by?: string;
}

export interface CrmDuplicateCandidatesDocument extends NeonDocument {
  organization_id: string;
  primary_contact_id: string;
  duplicate_contact_id: string;
  match_score?: number;
  match_reasons: string;
  status: "open" | "dismissed" | "merge_requested" | "merged";
  reviewed_by?: string;
  reviewed_at?: string;
  created_by?: string;
}

export interface CrmMergeRequestsDocument extends NeonDocument {
  organization_id: string;
  source_contact_id: string;
  target_contact_id: string;
  status: "draft" | "requested" | "approved" | "rejected" | "applied" | "cancelled";
  reason: string;
  requested_by: string;
  requested_at?: string;
  approved_by?: string;
  approved_at?: string;
  applied_at?: string;
  audit_summary?: string;
  created_by?: string;
}

export interface NeonTableModels {
  "organizations": OrganizationsDocument;
  "organization_units": OrganizationUnitsDocument;
  "profiles": ProfilesDocument;
  "memberships": MembershipsDocument;
  "roles": RolesDocument;
  "permissions": PermissionsDocument;
  "role_permissions": RolePermissionsDocument;
  "membership_roles": MembershipRolesDocument;
  "organization_relationships": OrganizationRelationshipsDocument;
  "program_categories": ProgramCategoriesDocument;
  "programs": ProgramsDocument;
  "program_revisions": ProgramRevisionsDocument;
  "crm_contacts": CrmContactsDocument;
  "crm_contact_roles": CrmContactRolesDocument;
  "crm_sensitive_identities": CrmSensitiveIdentitiesDocument;
  "crm_beneficiary_profiles": CrmBeneficiaryProfilesDocument;
  "crm_institution_profiles": CrmInstitutionProfilesDocument;
  "crm_tags": CrmTagsDocument;
  "crm_contact_tags": CrmContactTagsDocument;
  "crm_interactions": CrmInteractionsDocument;
  "crm_consents": CrmConsentsDocument;
  "crm_duplicate_candidates": CrmDuplicateCandidatesDocument;
  "crm_merge_requests": CrmMergeRequestsDocument;
}

export type NeonTableId = keyof NeonTableModels;
