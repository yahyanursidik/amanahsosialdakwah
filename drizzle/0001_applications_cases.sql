CREATE TABLE "aid_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"program_id" uuid NOT NULL,
	"applicant_contact_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"requested_support" text NOT NULL,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"screening_completed_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aid_applications_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "aid_applications_channel_check" CHECK (channel = any (array['walk_in', 'referral', 'partner', 'online', 'field']::text[])),
	CONSTRAINT "aid_applications_urgency_check" CHECK (urgency = any (array['normal', 'urgent', 'emergency']::text[])),
	CONSTRAINT "aid_applications_status_check" CHECK (status = any (array['draft', 'submitted', 'in_screening', 'accepted', 'rejected', 'converted', 'cancelled']::text[]))
);
--> statement-breakpoint
ALTER TABLE "aid_applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "application_case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_profile_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_case_events_entity_type_check" CHECK (entity_type = any (array['application', 'case']::text[]))
);
--> statement-breakpoint
ALTER TABLE "application_case_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "application_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"result" text NOT NULL,
	"notes" text NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"screened_by" uuid NOT NULL,
	"screened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_screenings_sequence_unique" UNIQUE("organization_id","application_id","sequence_number"),
	CONSTRAINT "application_screenings_sequence_check" CHECK (sequence_number > 0),
	CONSTRAINT "application_screenings_result_check" CHECK (result = any (array['pass', 'review', 'reject']::text[]))
);
--> statement-breakpoint
ALTER TABLE "application_screenings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_profile_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "beneficiary_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"application_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"beneficiary_contact_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"summary" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beneficiary_cases_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "beneficiary_cases_application_unique" UNIQUE("application_id"),
	CONSTRAINT "beneficiary_cases_status_check" CHECK (status = any (array['open', 'assigned', 'assessment', 'verified', 'eligible', 'not_eligible', 'closed', 'cancelled']::text[]))
);
--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "aid_applications" ADD CONSTRAINT "aid_applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_applications" ADD CONSTRAINT "aid_applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_applications" ADD CONSTRAINT "aid_applications_applicant_contact_id_fkey" FOREIGN KEY ("applicant_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_applications" ADD CONSTRAINT "aid_applications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_applications" ADD CONSTRAINT "aid_applications_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_case_events" ADD CONSTRAINT "application_case_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_case_events" ADD CONSTRAINT "application_case_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_screenings" ADD CONSTRAINT "application_screenings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_screenings" ADD CONSTRAINT "application_screenings_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."aid_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_screenings" ADD CONSTRAINT "application_screenings_screened_by_fkey" FOREIGN KEY ("screened_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_screenings" ADD CONSTRAINT "application_screenings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."aid_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_beneficiary_contact_id_fkey" FOREIGN KEY ("beneficiary_contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_aid_applications_org_status" ON "aid_applications" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_aid_applications_org_program" ON "aid_applications" USING btree ("organization_id","program_id");--> statement-breakpoint
CREATE INDEX "idx_aid_applications_org_contact" ON "aid_applications" USING btree ("organization_id","applicant_contact_id");--> statement-breakpoint
CREATE INDEX "idx_application_case_events_entity" ON "application_case_events" USING btree ("organization_id","entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_application_screenings_org_application" ON "application_screenings" USING btree ("organization_id","application_id","sequence_number");--> statement-breakpoint
CREATE INDEX "idx_audit_events_org_entity" ON "audit_events" USING btree ("organization_id","entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_request" ON "audit_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_beneficiary_cases_org_status" ON "beneficiary_cases" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_beneficiary_cases_org_assignee" ON "beneficiary_cases" USING btree ("organization_id","assigned_to");--> statement-breakpoint
CREATE POLICY "aid_applications_select" ON "aid_applications" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.read'));--> statement-breakpoint
CREATE POLICY "aid_applications_insert" ON "aid_applications" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.manage'));--> statement-breakpoint
CREATE POLICY "aid_applications_update" ON "aid_applications" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
));--> statement-breakpoint
CREATE POLICY "aid_applications_delete" ON "aid_applications" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "application_case_events_select" ON "application_case_events" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'applications.read')
        or private.has_permission(organization_id, 'cases.read')
      ));--> statement-breakpoint
CREATE POLICY "application_case_events_insert" ON "application_case_events" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id));--> statement-breakpoint
CREATE POLICY "application_case_events_update" ON "application_case_events" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "application_case_events_delete" ON "application_case_events" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "application_screenings_select" ON "application_screenings" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.read'));--> statement-breakpoint
CREATE POLICY "application_screenings_insert" ON "application_screenings" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.screen'));--> statement-breakpoint
CREATE POLICY "application_screenings_update" ON "application_screenings" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "application_screenings_delete" ON "application_screenings" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "audit_events_select" ON "audit_events" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'audit.read'));--> statement-breakpoint
CREATE POLICY "audit_events_insert" ON "audit_events" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id));--> statement-breakpoint
CREATE POLICY "audit_events_update" ON "audit_events" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "audit_events_delete" ON "audit_events" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "beneficiary_cases_select" ON "beneficiary_cases" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'cases.read'));--> statement-breakpoint
CREATE POLICY "beneficiary_cases_insert" ON "beneficiary_cases" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'applications.convert'));--> statement-breakpoint
CREATE POLICY "beneficiary_cases_update" ON "beneficiary_cases" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
));--> statement-breakpoint
CREATE POLICY "beneficiary_cases_delete" ON "beneficiary_cases" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE
  "aid_applications",
  "application_screenings",
  "beneficiary_cases",
  "application_case_events",
  "audit_events"
TO "app_runtime";--> statement-breakpoint
CREATE TRIGGER "trg_aid_applications_touch_updated_at"
BEFORE UPDATE ON "aid_applications"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_application_screenings_touch_updated_at"
BEFORE UPDATE ON "application_screenings"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_beneficiary_cases_touch_updated_at"
BEFORE UPDATE ON "beneficiary_cases"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_application_case_events_touch_updated_at"
BEFORE UPDATE ON "application_case_events"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_audit_events_touch_updated_at"
BEFORE UPDATE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('applications.read', 'applications', 'read', 'Melihat pengajuan bantuan'),
  ('applications.manage', 'applications', 'manage', 'Membuat dan memperbarui draft pengajuan'),
  ('applications.submit', 'applications', 'submit', 'Mengirim pengajuan untuk screening'),
  ('applications.screen', 'applications', 'screen', 'Melakukan screening pengajuan'),
  ('applications.convert', 'applications', 'convert', 'Mengonversi pengajuan diterima menjadi kasus'),
  ('cases.read', 'cases', 'read', 'Melihat kasus penerima manfaat'),
  ('cases.manage', 'cases', 'manage', 'Mengelola kasus penerima manfaat'),
  ('cases.assign', 'cases', 'assign', 'Menugaskan penanggung jawab kasus'),
  ('audit.read', 'audit', 'read', 'Melihat audit trail')
ON CONFLICT (key) DO UPDATE
SET
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = now();--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'applications.read',
  'applications.manage',
  'applications.submit',
  'applications.screen',
  'applications.convert',
  'cases.read',
  'cases.manage',
  'cases.assign',
  'audit.read'
)
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'applications.read',
  'applications.manage',
  'applications.submit',
  'cases.read',
  'cases.manage',
  'cases.assign'
)
WHERE role.organization_id IS NULL
  AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'applications.read',
  'cases.read',
  'audit.read'
)
WHERE role.organization_id IS NULL
  AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
