CREATE TABLE "approval_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"approval_request_id" uuid NOT NULL,
	"approval_request_step_id" uuid,
	"cycle_number" integer NOT NULL,
	"action" text NOT NULL,
	"actor_profile_id" uuid NOT NULL,
	"comment" text,
	"from_status" text,
	"to_status" text NOT NULL,
	"request_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_actions_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "approval_actions_action_check" CHECK (action = any (array['created', 'submitted', 'approved', 'rejected', 'revision_requested', 'resubmitted', 'cancelled']::text[])),
	CONSTRAINT "approval_actions_cycle_check" CHECK (cycle_number > 0)
);
--> statement-breakpoint
ALTER TABLE "approval_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval_request_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"approval_request_id" uuid NOT NULL,
	"workflow_step_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"required_permission" text NOT NULL,
	"minimum_approvals" integer NOT NULL,
	"approval_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_request_steps_position_unique" UNIQUE("approval_request_id","position"),
	CONSTRAINT "approval_request_steps_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "approval_request_steps_status_check" CHECK (status = any (array['pending', 'in_progress', 'approved', 'rejected', 'revision_requested']::text[])),
	CONSTRAINT "approval_request_steps_values_check" CHECK (position > 0 and minimum_approvals > 0 and approval_count >= 0 and approval_count <= minimum_approvals)
);
--> statement-breakpoint
ALTER TABLE "approval_request_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"workflow_version_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"subject_snapshot" jsonb NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_step_position" integer,
	"cycle_number" integer DEFAULT 1 NOT NULL,
	"requested_by" uuid NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "approval_requests_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "approval_requests_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "approval_requests_status_check" CHECK (status = any (array['draft', 'in_progress', 'approved', 'rejected', 'revision_requested', 'cancelled']::text[])),
	CONSTRAINT "approval_requests_cycle_check" CHECK (cycle_number > 0)
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval_workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"required_permission" text NOT NULL,
	"minimum_approvals" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_workflow_steps_position_unique" UNIQUE("workflow_version_id","position"),
	CONSTRAINT "approval_workflow_steps_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "approval_workflow_steps_values_check" CHECK (position > 0 and minimum_approvals > 0)
);
--> statement-breakpoint
ALTER TABLE "approval_workflow_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval_workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_workflow_versions_number_unique" UNIQUE("workflow_id","version_number"),
	CONSTRAINT "approval_workflow_versions_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "approval_workflow_versions_status_check" CHECK (status = any (array['draft', 'published', 'retired']::text[])),
	CONSTRAINT "approval_workflow_versions_number_check" CHECK (version_number > 0)
);
--> statement-breakpoint
ALTER TABLE "approval_workflow_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approval_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"resource_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_workflows_org_code_unique" UNIQUE("organization_id","code"),
	CONSTRAINT "approval_workflows_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "approval_workflows_status_check" CHECK (status = any (array['draft', 'active', 'retired']::text[]))
);
--> statement-breakpoint
ALTER TABLE "approval_workflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_request_id_fkey" FOREIGN KEY ("approval_request_id","organization_id") REFERENCES "public"."approval_requests"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_request_step_id_fkey" FOREIGN KEY ("approval_request_step_id","organization_id") REFERENCES "public"."approval_request_steps"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_request_id_fkey" FOREIGN KEY ("approval_request_id","organization_id") REFERENCES "public"."approval_requests"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_request_steps" ADD CONSTRAINT "approval_request_steps_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id","organization_id") REFERENCES "public"."approval_workflow_steps"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workflow_version_id_fkey" FOREIGN KEY ("workflow_version_id","organization_id") REFERENCES "public"."approval_workflow_versions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_steps" ADD CONSTRAINT "approval_workflow_steps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_steps" ADD CONSTRAINT "approval_workflow_steps_version_id_fkey" FOREIGN KEY ("workflow_version_id","organization_id") REFERENCES "public"."approval_workflow_versions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_steps" ADD CONSTRAINT "approval_workflow_steps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_versions" ADD CONSTRAINT "approval_workflow_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_versions" ADD CONSTRAINT "approval_workflow_versions_workflow_id_fkey" FOREIGN KEY ("workflow_id","organization_id") REFERENCES "public"."approval_workflows"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_versions" ADD CONSTRAINT "approval_workflow_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_versions" ADD CONSTRAINT "approval_workflow_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approval_actions_request" ON "approval_actions" USING btree ("organization_id","approval_request_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_approval_actions_actor" ON "approval_actions" USING btree ("organization_id","actor_profile_id");--> statement-breakpoint
CREATE INDEX "idx_approval_request_steps_request" ON "approval_request_steps" USING btree ("organization_id","approval_request_id","position");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_org_status" ON "approval_requests" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_subject" ON "approval_requests" USING btree ("organization_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "idx_approval_workflow_steps_version" ON "approval_workflow_steps" USING btree ("organization_id","workflow_version_id","position");--> statement-breakpoint
CREATE INDEX "idx_approval_workflow_versions_org_status" ON "approval_workflow_versions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_approval_workflows_org_status" ON "approval_workflows" USING btree ("organization_id","status");--> statement-breakpoint
CREATE POLICY "approval_actions_select" ON "approval_actions" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_requests.read'));--> statement-breakpoint
CREATE POLICY "approval_actions_insert" ON "approval_actions" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
));--> statement-breakpoint
CREATE POLICY "approval_actions_update" ON "approval_actions" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "approval_actions_delete" ON "approval_actions" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "approval_request_steps_select" ON "approval_request_steps" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_requests.read'));--> statement-breakpoint
CREATE POLICY "approval_request_steps_insert" ON "approval_request_steps" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
));--> statement-breakpoint
CREATE POLICY "approval_request_steps_update" ON "approval_request_steps" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
));--> statement-breakpoint
CREATE POLICY "approval_request_steps_delete" ON "approval_request_steps" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "approval_requests_select" ON "approval_requests" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_requests.read'));--> statement-breakpoint
CREATE POLICY "approval_requests_insert" ON "approval_requests" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
));--> statement-breakpoint
CREATE POLICY "approval_requests_update" ON "approval_requests" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
));--> statement-breakpoint
CREATE POLICY "approval_requests_delete" ON "approval_requests" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "approval_workflow_steps_select" ON "approval_workflow_steps" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_workflows.read'));--> statement-breakpoint
CREATE POLICY "approval_workflow_steps_insert" ON "approval_workflow_steps" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
));--> statement-breakpoint
CREATE POLICY "approval_workflow_steps_update" ON "approval_workflow_steps" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
));--> statement-breakpoint
CREATE POLICY "approval_workflow_steps_delete" ON "approval_workflow_steps" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "approval_workflow_versions_select" ON "approval_workflow_versions" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_workflows.read'));--> statement-breakpoint
CREATE POLICY "approval_workflow_versions_insert" ON "approval_workflow_versions" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
));--> statement-breakpoint
CREATE POLICY "approval_workflow_versions_update" ON "approval_workflow_versions" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
));--> statement-breakpoint
CREATE POLICY "approval_workflow_versions_delete" ON "approval_workflow_versions" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "approval_workflows_select" ON "approval_workflows" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'approval_workflows.read'));--> statement-breakpoint
CREATE POLICY "approval_workflows_insert" ON "approval_workflows" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
));--> statement-breakpoint
CREATE POLICY "approval_workflows_update" ON "approval_workflows" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
));--> statement-breakpoint
CREATE POLICY "approval_workflows_delete" ON "approval_workflows" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
ALTER POLICY "audit_events_insert" ON "audit_events" TO app_runtime WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
  or private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
  or private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
  or private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
  or private.has_permission(organization_id, 'approval_workflows.manage')
  or private.has_permission(organization_id, 'approval_workflows.publish')
  or private.has_permission(organization_id, 'approval_requests.create')
  or private.has_permission(organization_id, 'approval_requests.submit')
  or private.has_permission(organization_id, 'approval_requests.act')
  or private.has_permission(organization_id, 'approval_requests.cancel')
));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE
  "approval_workflows",
  "approval_workflow_versions",
  "approval_workflow_steps",
  "approval_requests",
  "approval_request_steps",
  "approval_actions"
TO "app_runtime";--> statement-breakpoint
CREATE UNIQUE INDEX "approval_actions_unique_approval_vote"
ON "approval_actions" ("approval_request_step_id", "actor_profile_id", "cycle_number")
WHERE "action" = 'approved';--> statement-breakpoint
ALTER TABLE "approval_workflows"
  ADD CONSTRAINT "approval_workflows_resource_type_check"
  CHECK (resource_type = any (array['assessment', 'case']::text[]));--> statement-breakpoint
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_subject_type_check"
  CHECK (subject_type = any (array['assessment', 'case']::text[]));--> statement-breakpoint
CREATE TRIGGER "trg_approval_workflows_touch_updated_at"
BEFORE UPDATE ON "approval_workflows"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_approval_workflow_versions_touch_updated_at"
BEFORE UPDATE ON "approval_workflow_versions"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_approval_workflow_steps_touch_updated_at"
BEFORE UPDATE ON "approval_workflow_steps"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_approval_requests_touch_updated_at"
BEFORE UPDATE ON "approval_requests"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_approval_request_steps_touch_updated_at"
BEFORE UPDATE ON "approval_request_steps"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_approval_workflow_step()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_version_id uuid;
BEGIN
  target_version_id := COALESCE(NEW.workflow_version_id, OLD.workflow_version_id);
  IF EXISTS (
    SELECT 1
    FROM public.approval_workflow_versions
    WHERE id = target_version_id AND status <> 'draft'
  ) THEN
    RAISE EXCEPTION 'Published or retired approval workflow steps are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_protect_approval_workflow_step"
BEFORE INSERT OR UPDATE OR DELETE ON "approval_workflow_steps"
FOR EACH ROW EXECUTE FUNCTION private.protect_approval_workflow_step();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_final_approval_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('approved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Final approval requests are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_protect_final_approval_request"
BEFORE UPDATE OR DELETE ON "approval_requests"
FOR EACH ROW EXECUTE FUNCTION private.protect_final_approval_request();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.prevent_approval_action_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Approval actions are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_prevent_approval_action_mutation"
BEFORE UPDATE OR DELETE ON "approval_actions"
FOR EACH ROW EXECUTE FUNCTION private.prevent_approval_action_mutation();--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('approval_workflows.read', 'approval_workflows', 'read', 'Melihat workflow approval'),
  ('approval_workflows.manage', 'approval_workflows', 'manage', 'Membuat workflow dan versi approval'),
  ('approval_workflows.publish', 'approval_workflows', 'publish', 'Mempublikasikan versi workflow approval'),
  ('approval_requests.read', 'approval_requests', 'read', 'Melihat permintaan dan timeline approval'),
  ('approval_requests.create', 'approval_requests', 'create', 'Membuat draft permintaan approval'),
  ('approval_requests.submit', 'approval_requests', 'submit', 'Mengirim dan mengirim ulang permintaan approval'),
  ('approval_requests.act', 'approval_requests', 'act', 'Memberi keputusan pada langkah approval'),
  ('approval_requests.cancel', 'approval_requests', 'cancel', 'Membatalkan permintaan approval yang belum final')
ON CONFLICT (key) DO UPDATE
SET resource = excluded.resource,
    action = excluded.action,
    description = excluded.description,
    updated_at = now();--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'approval_workflows.read',
  'approval_workflows.manage',
  'approval_workflows.publish',
  'approval_requests.read',
  'approval_requests.create',
  'approval_requests.submit',
  'approval_requests.act',
  'approval_requests.cancel'
)
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'approval_workflows.read',
  'approval_requests.read',
  'approval_requests.create',
  'approval_requests.submit',
  'approval_requests.cancel'
)
WHERE role.organization_id IS NULL
  AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'approval_workflows.read',
  'approval_requests.read'
)
WHERE role.organization_id IS NULL
  AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
