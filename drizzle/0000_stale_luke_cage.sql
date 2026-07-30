-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "organization_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_organization_id" uuid NOT NULL,
	"target_organization_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_relationships_unique" UNIQUE("relationship_type","source_organization_id","target_organization_id"),
	CONSTRAINT "organization_relationships_not_self" CHECK (source_organization_id <> target_organization_id),
	CONSTRAINT "organization_relationships_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))
);
--> statement-breakpoint
ALTER TABLE "organization_relationships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"version" text PRIMARY KEY NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"type" text DEFAULT 'manager' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_code_key" UNIQUE("code"),
	CONSTRAINT "organizations_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])),
	CONSTRAINT "organizations_type_check" CHECK (type = ANY (ARRAY['grantor'::text, 'manager'::text, 'distribution_partner'::text, 'institution'::text, 'internal'::text]))
);
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_auth_user_id_key" UNIQUE("auth_user_id"),
	CONSTRAINT "profiles_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text]))
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organization_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_units_unique_code_per_org" UNIQUE("code","organization_id"),
	CONSTRAINT "organization_units_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text]))
);
--> statement-breakpoint
ALTER TABLE "organization_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"organization_unit_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_unique_profile_per_org" UNIQUE("organization_id","profile_id"),
	CONSTRAINT "memberships_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'invited'::text, 'suspended'::text]))
);
--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_unique_key_per_scope" UNIQUE("key","organization_id")
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_key" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_unique" UNIQUE("permission_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "membership_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_roles_unique" UNIQUE("membership_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "membership_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "program_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"organization_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_categories_unique_code" UNIQUE("code","organization_id"),
	CONSTRAINT "program_categories_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
);
--> statement-breakpoint
ALTER TABLE "program_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid,
	"description" text,
	"objective" text,
	"target_beneficiary_type" text NOT NULL,
	"target_beneficiary_count" integer,
	"budget_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"allocated_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"disbursed_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"fund_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"owner_id" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programs_unique_org_code" UNIQUE("code","organization_id"),
	CONSTRAINT "programs_fund_type_check" CHECK (fund_type = ANY (ARRAY['zakat'::text, 'infaq'::text, 'sedekah'::text, 'waqf'::text, 'humanitarian'::text, 'education'::text, 'health'::text, 'general'::text])),
	CONSTRAINT "programs_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text, 'archived'::text])),
	CONSTRAINT "programs_target_type_check" CHECK (target_beneficiary_type = ANY (ARRAY['individual'::text, 'family'::text, 'institution'::text, 'community'::text, 'disaster_area'::text, 'mosque'::text, 'school'::text]))
);
--> statement-breakpoint
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "program_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"change_summary" text NOT NULL,
	"reason" text,
	"previous_values" jsonb,
	"new_values" jsonb,
	"performed_by" uuid,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_type" text NOT NULL,
	"display_name" text NOT NULL,
	"legal_name" text,
	"normalized_name" text NOT NULL,
	"primary_email" text,
	"normalized_email" text,
	"primary_phone" text,
	"normalized_phone" text,
	"whatsapp_phone" text,
	"gender" text,
	"birth_date" date,
	"address_line" text,
	"village" text,
	"district" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contacts_contact_type_check" CHECK (contact_type = ANY (ARRAY['person'::text, 'institution'::text])),
	CONSTRAINT "crm_contacts_gender_check" CHECK ((gender IS NULL) OR (gender = ANY (ARRAY['male'::text, 'female'::text, 'unknown'::text]))),
	CONSTRAINT "crm_contacts_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'deceased'::text, 'archived'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_contact_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"role_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contact_roles_unique" UNIQUE("contact_id","organization_id","role_type"),
	CONSTRAINT "crm_contact_roles_role_type_check" CHECK (role_type = ANY (ARRAY['donor'::text, 'kafil'::text, 'volunteer'::text, 'beneficiary'::text])),
	CONSTRAINT "crm_contact_roles_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'paused'::text, 'ended'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_contact_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_sensitive_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"identity_type" text NOT NULL,
	"identity_ciphertext_ref" text NOT NULL,
	"identity_last4" text,
	"identity_hash" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_sensitive_identities_identity_type_check" CHECK (identity_type = ANY (ARRAY['nik'::text, 'passport'::text, 'kitab'::text, 'tax_id'::text, 'other'::text])),
	CONSTRAINT "crm_sensitive_identities_status_check" CHECK (verification_status = ANY (ARRAY['unverified'::text, 'verified'::text, 'rejected'::text, 'expired'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_sensitive_identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_beneficiary_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"beneficiary_type" text NOT NULL,
	"vulnerability_level" text NOT NULL,
	"household_size" integer,
	"income_range" text,
	"assessment_status" text DEFAULT 'not_assessed' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"eligibility_notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_beneficiary_profiles_unique" UNIQUE("contact_id","organization_id"),
	CONSTRAINT "crm_beneficiary_profiles_assessment_check" CHECK (assessment_status = ANY (ARRAY['not_assessed'::text, 'in_review'::text, 'eligible'::text, 'not_eligible'::text, 'expired'::text])),
	CONSTRAINT "crm_beneficiary_profiles_income_check" CHECK ((income_range IS NULL) OR (income_range = ANY (ARRAY['unknown'::text, 'none'::text, 'low'::text, 'middle'::text]))),
	CONSTRAINT "crm_beneficiary_profiles_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'graduated'::text, 'blocked'::text])),
	CONSTRAINT "crm_beneficiary_profiles_type_check" CHECK (beneficiary_type = ANY (ARRAY['individual'::text, 'family'::text, 'institution'::text, 'community'::text])),
	CONSTRAINT "crm_beneficiary_profiles_vulnerability_check" CHECK (vulnerability_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_beneficiary_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_institution_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"institution_type" text NOT NULL,
	"institution_code" text,
	"registration_reference" text,
	"contact_person_name" text,
	"contact_person_phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_institution_profiles_unique" UNIQUE("contact_id","organization_id"),
	CONSTRAINT "crm_institution_profiles_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'unverified'::text, 'archived'::text])),
	CONSTRAINT "crm_institution_profiles_type_check" CHECK (institution_type = ANY (ARRAY['mosque'::text, 'school'::text, 'foundation'::text, 'company'::text, 'community'::text, 'government'::text, 'other'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_institution_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"color" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_tags_unique_key" UNIQUE("key","organization_id"),
	CONSTRAINT "crm_tags_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_contact_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contact_tags_unique" UNIQUE("contact_id","organization_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "crm_contact_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"interaction_type" text NOT NULL,
	"direction" text NOT NULL,
	"occurred_at" timestamp with time zone,
	"summary" text NOT NULL,
	"follow_up_note" text,
	"follow_up_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_interactions_direction_check" CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text, 'internal'::text])),
	CONSTRAINT "crm_interactions_type_check" CHECK (interaction_type = ANY (ARRAY['call'::text, 'whatsapp'::text, 'email'::text, 'visit'::text, 'meeting'::text, 'note'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_interactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"consented_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"evidence_file_id" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_consents_channel_check" CHECK (channel = ANY (ARRAY['paper'::text, 'web'::text, 'whatsapp'::text, 'email'::text, 'verbal_recorded'::text])),
	CONSTRAINT "crm_consents_status_check" CHECK (status = ANY (ARRAY['granted'::text, 'withdrawn'::text, 'expired'::text])),
	CONSTRAINT "crm_consents_type_check" CHECK (consent_type = ANY (ARRAY['data_processing'::text, 'communication'::text, 'documentation'::text, 'media_publication'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_duplicate_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"primary_contact_id" uuid NOT NULL,
	"duplicate_contact_id" uuid NOT NULL,
	"match_score" double precision,
	"match_reasons" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_duplicate_candidates_unique" UNIQUE("duplicate_contact_id","organization_id","primary_contact_id"),
	CONSTRAINT "crm_duplicate_candidates_not_self" CHECK (primary_contact_id <> duplicate_contact_id),
	CONSTRAINT "crm_duplicate_candidates_status_check" CHECK (status = ANY (ARRAY['open'::text, 'dismissed'::text, 'merge_requested'::text, 'merged'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_duplicate_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_merge_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_contact_id" uuid NOT NULL,
	"target_contact_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"reason" text NOT NULL,
	"requested_by" uuid,
	"requested_at" timestamp with time zone,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"audit_summary" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_merge_requests_not_self" CHECK (source_contact_id <> target_contact_id),
	CONSTRAINT "crm_merge_requests_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'requested'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'cancelled'::text]))
);
--> statement-breakpoint
ALTER TABLE "crm_merge_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_source_organization_id_fkey" FOREIGN KEY ("source_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_target_organization_id_fkey" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."organization_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "public"."organization_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_categories" ADD CONSTRAINT "program_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_categories" ADD CONSTRAINT "program_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."program_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_revisions" ADD CONSTRAINT "program_revisions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_roles" ADD CONSTRAINT "crm_contact_roles_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_roles" ADD CONSTRAINT "crm_contact_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_roles" ADD CONSTRAINT "crm_contact_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sensitive_identities" ADD CONSTRAINT "crm_sensitive_identities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sensitive_identities" ADD CONSTRAINT "crm_sensitive_identities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sensitive_identities" ADD CONSTRAINT "crm_sensitive_identities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sensitive_identities" ADD CONSTRAINT "crm_sensitive_identities_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_beneficiary_profiles" ADD CONSTRAINT "crm_beneficiary_profiles_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_beneficiary_profiles" ADD CONSTRAINT "crm_beneficiary_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_beneficiary_profiles" ADD CONSTRAINT "crm_beneficiary_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_institution_profiles" ADD CONSTRAINT "crm_institution_profiles_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_institution_profiles" ADD CONSTRAINT "crm_institution_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_institution_profiles" ADD CONSTRAINT "crm_institution_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_tags" ADD CONSTRAINT "crm_contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_tags" ADD CONSTRAINT "crm_contact_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_tags" ADD CONSTRAINT "crm_contact_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_tags" ADD CONSTRAINT "crm_contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."crm_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_duplicate_candidates" ADD CONSTRAINT "crm_duplicate_candidates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_duplicate_candidates" ADD CONSTRAINT "crm_duplicate_candidates_duplicate_contact_id_fkey" FOREIGN KEY ("duplicate_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_duplicate_candidates" ADD CONSTRAINT "crm_duplicate_candidates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_duplicate_candidates" ADD CONSTRAINT "crm_duplicate_candidates_primary_contact_id_fkey" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_duplicate_candidates" ADD CONSTRAINT "crm_duplicate_candidates_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_merge_requests" ADD CONSTRAINT "crm_merge_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_merge_requests" ADD CONSTRAINT "crm_merge_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_merge_requests" ADD CONSTRAINT "crm_merge_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_merge_requests" ADD CONSTRAINT "crm_merge_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_merge_requests" ADD CONSTRAINT "crm_merge_requests_source_contact_id_fkey" FOREIGN KEY ("source_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_merge_requests" ADD CONSTRAINT "crm_merge_requests_target_contact_id_fkey" FOREIGN KEY ("target_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_org_relationships_source" ON "organization_relationships" USING btree ("source_organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_org_relationships_target" ON "organization_relationships" USING btree ("target_organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_organization_units_org" ON "organization_units" USING btree ("organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_organization_units_parent" ON "organization_units" USING btree ("parent_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_memberships_org_profile_status" ON "memberships" USING btree ("organization_id" text_ops,"profile_id" uuid_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_memberships_profile_status" ON "memberships" USING btree ("profile_id" uuid_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_roles_org_key" ON "roles" USING btree ("organization_id" text_ops,"key" text_ops);--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission" ON "role_permissions" USING btree ("permission_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role" ON "role_permissions" USING btree ("role_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_membership_roles_membership" ON "membership_roles" USING btree ("membership_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_membership_roles_org" ON "membership_roles" USING btree ("organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_program_categories_org_status" ON "program_categories" USING btree ("organization_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_programs_org_status" ON "programs" USING btree ("organization_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_program_revisions_program" ON "program_revisions" USING btree ("program_id" timestamptz_ops,"performed_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_contacts_org_normalized_name" ON "crm_contacts" USING btree ("organization_id" text_ops,"normalized_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_contacts_org_status" ON "crm_contacts" USING btree ("organization_id" text_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_contact_roles_contact" ON "crm_contact_roles" USING btree ("contact_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_sensitive_identities_contact" ON "crm_sensitive_identities" USING btree ("contact_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_beneficiary_profiles_contact" ON "crm_beneficiary_profiles" USING btree ("contact_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_institution_profiles_contact" ON "crm_institution_profiles" USING btree ("contact_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_interactions_contact" ON "crm_interactions" USING btree ("contact_id" timestamptz_ops,"occurred_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_consents_contact" ON "crm_consents" USING btree ("contact_id" timestamptz_ops,"consented_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_duplicate_candidates_primary" ON "crm_duplicate_candidates" USING btree ("primary_contact_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_crm_merge_requests_source" ON "crm_merge_requests" USING btree ("source_contact_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "organization_relationships_delete" ON "organization_relationships" AS PERMISSIVE FOR DELETE TO public USING (private.has_permission(source_organization_id, 'organization_relationships.delete'::text));--> statement-breakpoint
CREATE POLICY "organization_relationships_update" ON "organization_relationships" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "organization_relationships_insert" ON "organization_relationships" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "organization_relationships_select" ON "organization_relationships" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "organizations_delete" ON "organizations" AS PERMISSIVE FOR DELETE TO public USING (private.has_permission(id, 'organizations.delete'::text));--> statement-breakpoint
CREATE POLICY "organizations_update" ON "organizations" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "organizations_insert" ON "organizations" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "organizations_select" ON "organizations" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "profiles_delete" ON "profiles" AS PERMISSIVE FOR DELETE TO public USING (false);--> statement-breakpoint
CREATE POLICY "profiles_update_self" ON "profiles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "profiles_insert" ON "profiles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "profiles_select_same_org" ON "profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "profiles_select_self" ON "profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "organization_units_delete" ON "organization_units" AS PERMISSIVE FOR DELETE TO public USING (private.has_permission(organization_id, 'organization_units.delete'::text));--> statement-breakpoint
CREATE POLICY "organization_units_update" ON "organization_units" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "organization_units_insert" ON "organization_units" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "organization_units_select" ON "organization_units" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "memberships_delete" ON "memberships" AS PERMISSIVE FOR DELETE TO public USING (private.has_permission(organization_id, 'memberships.delete'::text));--> statement-breakpoint
CREATE POLICY "memberships_update" ON "memberships" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "memberships_insert" ON "memberships" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "memberships_select" ON "memberships" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "roles_delete" ON "roles" AS PERMISSIVE FOR DELETE TO public USING (((organization_id IS NOT NULL) AND private.has_permission(organization_id, 'roles.delete'::text)));--> statement-breakpoint
CREATE POLICY "roles_update" ON "roles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "roles_insert" ON "roles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "roles_select" ON "roles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "permissions_delete" ON "permissions" AS PERMISSIVE FOR DELETE TO public USING (false);--> statement-breakpoint
CREATE POLICY "permissions_update" ON "permissions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "permissions_insert" ON "permissions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "permissions_select" ON "permissions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "role_permissions_delete" ON "role_permissions" AS PERMISSIVE FOR DELETE TO public USING (((organization_id IS NOT NULL) AND private.has_permission(organization_id, 'roles.manage'::text)));--> statement-breakpoint
CREATE POLICY "role_permissions_update" ON "role_permissions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "role_permissions_insert" ON "role_permissions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "role_permissions_select" ON "role_permissions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "membership_roles_delete" ON "membership_roles" AS PERMISSIVE FOR DELETE TO public USING (private.has_permission(organization_id, 'memberships.manage'::text));--> statement-breakpoint
CREATE POLICY "membership_roles_update" ON "membership_roles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "membership_roles_insert" ON "membership_roles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "membership_roles_select" ON "membership_roles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "program_categories_delete" ON "program_categories" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'program_categories.delete'::text)));--> statement-breakpoint
CREATE POLICY "program_categories_update" ON "program_categories" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "program_categories_insert" ON "program_categories" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "program_categories_select" ON "program_categories" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "programs_delete" ON "programs" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'programs.delete'::text)));--> statement-breakpoint
CREATE POLICY "programs_update" ON "programs" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "programs_insert" ON "programs" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "programs_select" ON "programs" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "program_revisions_delete" ON "program_revisions" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'program_revisions.delete'::text)));--> statement-breakpoint
CREATE POLICY "program_revisions_update" ON "program_revisions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "program_revisions_insert" ON "program_revisions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "program_revisions_select" ON "program_revisions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_contacts_delete" ON "crm_contacts" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_contacts.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_contacts_update" ON "crm_contacts" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_contacts_insert" ON "crm_contacts" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_contacts_select" ON "crm_contacts" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_contact_roles_delete" ON "crm_contact_roles" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_contact_roles.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_contact_roles_update" ON "crm_contact_roles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_contact_roles_insert" ON "crm_contact_roles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_contact_roles_select" ON "crm_contact_roles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_sensitive_identities_delete" ON "crm_sensitive_identities" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_sensitive_identities.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_sensitive_identities_update" ON "crm_sensitive_identities" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_sensitive_identities_insert" ON "crm_sensitive_identities" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_sensitive_identities_select" ON "crm_sensitive_identities" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_beneficiary_profiles_delete" ON "crm_beneficiary_profiles" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_beneficiary_profiles.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_beneficiary_profiles_update" ON "crm_beneficiary_profiles" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_beneficiary_profiles_insert" ON "crm_beneficiary_profiles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_beneficiary_profiles_select" ON "crm_beneficiary_profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_institution_profiles_update" ON "crm_institution_profiles" AS PERMISSIVE FOR UPDATE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_institution_profiles.manage'::text))) WITH CHECK ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_institution_profiles.manage'::text)));--> statement-breakpoint
CREATE POLICY "crm_institution_profiles_insert" ON "crm_institution_profiles" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_institution_profiles_select" ON "crm_institution_profiles" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_institution_profiles_delete" ON "crm_institution_profiles" AS PERMISSIVE FOR DELETE TO public;--> statement-breakpoint
CREATE POLICY "crm_tags_delete" ON "crm_tags" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_tags.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_tags_update" ON "crm_tags" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_tags_insert" ON "crm_tags" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_tags_select" ON "crm_tags" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_contact_tags_delete" ON "crm_contact_tags" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_contact_tags.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_contact_tags_update" ON "crm_contact_tags" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_contact_tags_insert" ON "crm_contact_tags" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_contact_tags_select" ON "crm_contact_tags" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_interactions_delete" ON "crm_interactions" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_interactions.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_interactions_update" ON "crm_interactions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_interactions_insert" ON "crm_interactions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_interactions_select" ON "crm_interactions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_consents_delete" ON "crm_consents" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_consents.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_consents_update" ON "crm_consents" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_consents_insert" ON "crm_consents" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_consents_select" ON "crm_consents" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_duplicate_candidates_delete" ON "crm_duplicate_candidates" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_duplicate_candidates.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_duplicate_candidates_update" ON "crm_duplicate_candidates" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_duplicate_candidates_insert" ON "crm_duplicate_candidates" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_duplicate_candidates_select" ON "crm_duplicate_candidates" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "crm_merge_requests_delete" ON "crm_merge_requests" AS PERMISSIVE FOR DELETE TO public USING ((private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'crm_merge_requests.delete'::text)));--> statement-breakpoint
CREATE POLICY "crm_merge_requests_update" ON "crm_merge_requests" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "crm_merge_requests_insert" ON "crm_merge_requests" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "crm_merge_requests_select" ON "crm_merge_requests" AS PERMISSIVE FOR SELECT TO public;
*/