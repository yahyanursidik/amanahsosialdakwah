CREATE TABLE "distribution_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"distribution_plan_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"assignee_profile_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_assignments_sequence_unique" UNIQUE("distribution_plan_id","sequence_number"),
	CONSTRAINT "distribution_assignments_status_check" CHECK (status in ('active', 'revoked')),
	CONSTRAINT "distribution_assignments_sequence_check" CHECK (sequence_number > 0)
);
--> statement-breakpoint
ALTER TABLE "distribution_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "distribution_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"distribution_plan_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"confirmation_method" text NOT NULL,
	"confirmed_by_name" text NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_confirmations_cycle_unique" UNIQUE("distribution_plan_id","cycle_number"),
	CONSTRAINT "distribution_confirmations_cycle_check" CHECK (cycle_number > 0),
	CONSTRAINT "distribution_confirmations_name_check" CHECK (length(trim(confirmed_by_name)) >= 2),
	CONSTRAINT "distribution_confirmations_method_check" CHECK (confirmation_method in ('beneficiary_statement', 'witness', 'phone_call', 'otp'))
);
--> statement-breakpoint
ALTER TABLE "distribution_confirmations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "distribution_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"distribution_plan_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_profile_id" uuid NOT NULL,
	"notes" text,
	"request_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_events_request_unique" UNIQUE("organization_id","request_id"),
	CONSTRAINT "distribution_events_cycle_check" CHECK (cycle_number > 0)
);
--> statement-breakpoint
ALTER TABLE "distribution_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "distribution_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"distribution_plan_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"sequence_number" integer NOT NULL,
	"evidence_kind" text NOT NULL,
	"description" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"classification" text DEFAULT 'private' NOT NULL,
	"storage_status" text DEFAULT 'not_applicable' NOT NULL,
	"file_metadata" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_evidence_sequence_unique" UNIQUE("distribution_plan_id","cycle_number","sequence_number"),
	CONSTRAINT "distribution_evidence_values_check" CHECK (cycle_number > 0 and sequence_number > 0
        and evidence_kind in ('field_note', 'beneficiary_statement', 'receipt_reference')
        and length(trim(description)) >= 10
        and classification = 'private'
        and storage_status = 'not_applicable')
);
--> statement-breakpoint
ALTER TABLE "distribution_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "distribution_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"distribution_plan_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"execution_number" integer NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"outcome" text NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"location_notes" text,
	"notes" text,
	"executed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_executions_cycle_number_unique" UNIQUE("distribution_plan_id","cycle_number","execution_number"),
	CONSTRAINT "distribution_executions_amount_check" CHECK (amount > 0),
	CONSTRAINT "distribution_executions_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "distribution_executions_values_check" CHECK (cycle_number > 0 and execution_number > 0 and outcome in ('delivered', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "distribution_executions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "distribution_idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"command_type" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"response_snapshot" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "distribution_idempotency_org_key_unique" UNIQUE("organization_id","idempotency_key"),
	CONSTRAINT "distribution_idempotency_values_check" CHECK (status in ('processing', 'completed') and length(idempotency_key) between 16 and 200)
);
--> statement-breakpoint
ALTER TABLE "distribution_idempotency_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "distribution_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"disbursement_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"beneficiary_contact_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"distribution_method" text NOT NULL,
	"purpose" text NOT NULL,
	"planned_at" timestamp with time zone NOT NULL,
	"requires_confirmation" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"cycle_number" integer DEFAULT 1 NOT NULL,
	"cancelled_reason" text,
	"completed_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_plans_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "distribution_plans_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "distribution_plans_amount_check" CHECK (amount > 0),
	CONSTRAINT "distribution_plans_purpose_check" CHECK (length(trim(purpose)) >= 10),
	CONSTRAINT "distribution_plans_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "distribution_plans_cycle_check" CHECK (cycle_number > 0),
	CONSTRAINT "distribution_plans_method_check" CHECK (distribution_method in ('cash', 'bank_transfer', 'voucher', 'vendor_payment', 'reimbursement')),
	CONSTRAINT "distribution_plans_status_check" CHECK (status in ('draft', 'ready', 'assigned', 'in_progress', 'executed', 'confirmed', 'revision_required', 'verified', 'completed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "distribution_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "distribution_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"distribution_plan_id" uuid NOT NULL,
	"cycle_number" integer NOT NULL,
	"decision" text NOT NULL,
	"notes" text NOT NULL,
	"verified_by" uuid NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_verifications_cycle_unique" UNIQUE("distribution_plan_id","cycle_number"),
	CONSTRAINT "distribution_verifications_cycle_check" CHECK (cycle_number > 0),
	CONSTRAINT "distribution_verifications_notes_check" CHECK (length(trim(notes)) >= 10),
	CONSTRAINT "distribution_verifications_decision_check" CHECK (decision in ('verified', 'revision_required'))
);
--> statement-breakpoint
ALTER TABLE "distribution_verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "distribution_assignments" ADD CONSTRAINT "distribution_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_assignments" ADD CONSTRAINT "distribution_assignments_plan_id_fkey" FOREIGN KEY ("distribution_plan_id","organization_id") REFERENCES "public"."distribution_plans"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_assignments" ADD CONSTRAINT "distribution_assignments_membership_id_fkey" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_assignments" ADD CONSTRAINT "distribution_assignments_assignee_profile_id_fkey" FOREIGN KEY ("assignee_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_assignments" ADD CONSTRAINT "distribution_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_confirmations" ADD CONSTRAINT "distribution_confirmations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_confirmations" ADD CONSTRAINT "distribution_confirmations_plan_id_fkey" FOREIGN KEY ("distribution_plan_id","organization_id") REFERENCES "public"."distribution_plans"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_confirmations" ADD CONSTRAINT "distribution_confirmations_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_events" ADD CONSTRAINT "distribution_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_events" ADD CONSTRAINT "distribution_events_plan_id_fkey" FOREIGN KEY ("distribution_plan_id","organization_id") REFERENCES "public"."distribution_plans"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_events" ADD CONSTRAINT "distribution_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_evidence" ADD CONSTRAINT "distribution_evidence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_evidence" ADD CONSTRAINT "distribution_evidence_plan_id_fkey" FOREIGN KEY ("distribution_plan_id","organization_id") REFERENCES "public"."distribution_plans"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_evidence" ADD CONSTRAINT "distribution_evidence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_executions" ADD CONSTRAINT "distribution_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_executions" ADD CONSTRAINT "distribution_executions_plan_id_fkey" FOREIGN KEY ("distribution_plan_id","organization_id") REFERENCES "public"."distribution_plans"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_executions" ADD CONSTRAINT "distribution_executions_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_idempotency_records" ADD CONSTRAINT "distribution_idempotency_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_idempotency_records" ADD CONSTRAINT "distribution_idempotency_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_disbursement_id_fkey" FOREIGN KEY ("disbursement_id","organization_id") REFERENCES "public"."fund_disbursements"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_allocation_id_fkey" FOREIGN KEY ("allocation_id","organization_id") REFERENCES "public"."fund_allocations"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_program_id_fkey" FOREIGN KEY ("program_id","organization_id") REFERENCES "public"."programs"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_case_id_fkey" FOREIGN KEY ("case_id","organization_id") REFERENCES "public"."beneficiary_cases"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_beneficiary_contact_id_fkey" FOREIGN KEY ("beneficiary_contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_plans" ADD CONSTRAINT "distribution_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_verifications" ADD CONSTRAINT "distribution_verifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_verifications" ADD CONSTRAINT "distribution_verifications_plan_id_fkey" FOREIGN KEY ("distribution_plan_id","organization_id") REFERENCES "public"."distribution_plans"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_verifications" ADD CONSTRAINT "distribution_verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_distribution_assignments_plan" ON "distribution_assignments" USING btree ("organization_id","distribution_plan_id","status");--> statement-breakpoint
CREATE INDEX "idx_distribution_confirmations_plan" ON "distribution_confirmations" USING btree ("organization_id","distribution_plan_id");--> statement-breakpoint
CREATE INDEX "idx_distribution_events_plan" ON "distribution_events" USING btree ("organization_id","distribution_plan_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_distribution_evidence_plan" ON "distribution_evidence" USING btree ("organization_id","distribution_plan_id","cycle_number");--> statement-breakpoint
CREATE INDEX "idx_distribution_executions_plan" ON "distribution_executions" USING btree ("organization_id","distribution_plan_id","cycle_number");--> statement-breakpoint
CREATE INDEX "idx_distribution_idempotency_created" ON "distribution_idempotency_records" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_distribution_plans_org_status" ON "distribution_plans" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_distribution_plans_disbursement" ON "distribution_plans" USING btree ("organization_id","disbursement_id");--> statement-breakpoint
CREATE INDEX "idx_distribution_plans_case" ON "distribution_plans" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE INDEX "idx_distribution_verifications_plan" ON "distribution_verifications" USING btree ("organization_id","distribution_plan_id","cycle_number");--> statement-breakpoint
CREATE POLICY "distribution_assignments_select" ON "distribution_assignments" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.read'));--> statement-breakpoint
CREATE POLICY "distribution_assignments_insert" ON "distribution_assignments" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.assign'));--> statement-breakpoint
CREATE POLICY "distribution_assignments_update" ON "distribution_assignments" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.assign')) WITH CHECK (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.assign'));--> statement-breakpoint
CREATE POLICY "distribution_assignments_delete" ON "distribution_assignments" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "distribution_confirmations_select" ON "distribution_confirmations" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.read'));--> statement-breakpoint
CREATE POLICY "distribution_confirmations_insert" ON "distribution_confirmations" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.confirm')
        and recorded_by = private.current_profile_id());--> statement-breakpoint
CREATE POLICY "distribution_confirmations_update" ON "distribution_confirmations" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "distribution_confirmations_delete" ON "distribution_confirmations" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "distribution_events_select" ON "distribution_events" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.read'));--> statement-breakpoint
CREATE POLICY "distribution_events_insert" ON "distribution_events" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and actor_profile_id = private.current_profile_id() and (
  private.has_permission(organization_id, 'distributions.manage')
  or private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
));--> statement-breakpoint
CREATE POLICY "distribution_events_update" ON "distribution_events" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "distribution_events_delete" ON "distribution_events" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "distribution_evidence_select" ON "distribution_evidence" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distribution_evidence.read'));--> statement-breakpoint
CREATE POLICY "distribution_evidence_insert" ON "distribution_evidence" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distribution_evidence.manage')
        and created_by = private.current_profile_id());--> statement-breakpoint
CREATE POLICY "distribution_evidence_update" ON "distribution_evidence" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "distribution_evidence_delete" ON "distribution_evidence" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "distribution_executions_select" ON "distribution_executions" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.read'));--> statement-breakpoint
CREATE POLICY "distribution_executions_insert" ON "distribution_executions" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.execute')
        and executed_by = private.current_profile_id());--> statement-breakpoint
CREATE POLICY "distribution_executions_update" ON "distribution_executions" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "distribution_executions_delete" ON "distribution_executions" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "distribution_idempotency_select" ON "distribution_idempotency_records" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
));--> statement-breakpoint
CREATE POLICY "distribution_idempotency_insert" ON "distribution_idempotency_records" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
));--> statement-breakpoint
CREATE POLICY "distribution_idempotency_update" ON "distribution_idempotency_records" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
));--> statement-breakpoint
CREATE POLICY "distribution_idempotency_delete" ON "distribution_idempotency_records" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "distribution_plans_select" ON "distribution_plans" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.read'));--> statement-breakpoint
CREATE POLICY "distribution_plans_insert" ON "distribution_plans" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.manage'));--> statement-breakpoint
CREATE POLICY "distribution_plans_update" ON "distribution_plans" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  (status = 'draft' and private.has_permission(organization_id, 'distributions.manage'))
  or (status = 'ready' and private.has_permission(organization_id, 'distributions.ready'))
  or (status = 'assigned' and private.has_permission(organization_id, 'distributions.assign'))
  or (status = 'in_progress' and private.has_permission(organization_id, 'distributions.execute'))
  or (status = 'executed' and private.has_permission(organization_id, 'distributions.execute'))
  or (status = 'confirmed' and private.has_permission(organization_id, 'distributions.confirm'))
  or (status in ('verified', 'revision_required') and private.has_permission(organization_id, 'distributions.verify'))
  or (status = 'completed' and private.has_permission(organization_id, 'distributions.complete'))
  or (status = 'cancelled' and private.has_permission(organization_id, 'distributions.cancel'))
));--> statement-breakpoint
CREATE POLICY "distribution_plans_delete" ON "distribution_plans" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "distribution_verifications_select" ON "distribution_verifications" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id)
  and private.has_permission(organization_id, 'distributions.read'));--> statement-breakpoint
CREATE POLICY "distribution_verifications_insert" ON "distribution_verifications" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id)
        and private.has_permission(organization_id, 'distributions.verify')
        and verified_by = private.current_profile_id());--> statement-breakpoint
CREATE POLICY "distribution_verifications_update" ON "distribution_verifications" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "distribution_verifications_delete" ON "distribution_verifications" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
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
  or private.has_permission(organization_id, 'fund_restrictions.manage')
  or private.has_permission(organization_id, 'fund_commitments.manage')
  or private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.manage')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
  or private.has_permission(organization_id, 'fund_reconciliations.manage')
  or private.has_permission(organization_id, 'distributions.manage')
  or private.has_permission(organization_id, 'distributions.ready')
  or private.has_permission(organization_id, 'distributions.assign')
  or private.has_permission(organization_id, 'distributions.execute')
  or private.has_permission(organization_id, 'distributions.confirm')
  or private.has_permission(organization_id, 'distributions.verify')
  or private.has_permission(organization_id, 'distributions.complete')
  or private.has_permission(organization_id, 'distributions.cancel')
  or private.has_permission(organization_id, 'distribution_evidence.manage')
));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE
  "distribution_plans",
  "distribution_assignments",
  "distribution_executions",
  "distribution_confirmations",
  "distribution_evidence",
  "distribution_verifications",
  "distribution_events",
  "distribution_idempotency_records"
TO "app_runtime";--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_assignments_one_active_per_plan"
ON "distribution_assignments" ("distribution_plan_id")
WHERE "status" = 'active';--> statement-breakpoint
CREATE TRIGGER "trg_distribution_plans_touch_updated_at"
BEFORE UPDATE ON "distribution_plans"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_distribution_assignments_touch_updated_at"
BEFORE UPDATE ON "distribution_assignments"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.prevent_distribution_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Distribution execution, confirmation, evidence, verification, and event records are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_prevent_distribution_execution_mutation"
BEFORE UPDATE OR DELETE ON "distribution_executions"
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();--> statement-breakpoint
CREATE TRIGGER "trg_prevent_distribution_confirmation_mutation"
BEFORE UPDATE OR DELETE ON "distribution_confirmations"
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();--> statement-breakpoint
CREATE TRIGGER "trg_prevent_distribution_evidence_mutation"
BEFORE UPDATE OR DELETE ON "distribution_evidence"
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();--> statement-breakpoint
CREATE TRIGGER "trg_prevent_distribution_verification_mutation"
BEFORE UPDATE OR DELETE ON "distribution_verifications"
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();--> statement-breakpoint
CREATE TRIGGER "trg_prevent_distribution_event_mutation"
BEFORE UPDATE OR DELETE ON "distribution_events"
FOR EACH ROW EXECUTE FUNCTION private.prevent_distribution_record_mutation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_distribution_plan_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Distribution plans cannot be deleted';
  END IF;

  IF OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Completed or cancelled distribution plans are immutable';
  END IF;

  IF (NEW.organization_id, NEW.reference_number, NEW.disbursement_id,
      NEW.allocation_id, NEW.program_id, NEW.case_id,
      NEW.beneficiary_contact_id, NEW.amount, NEW.currency,
      NEW.distribution_method, NEW.purpose, NEW.planned_at,
      NEW.requires_confirmation, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.organization_id, OLD.reference_number, OLD.disbursement_id,
      OLD.allocation_id, OLD.program_id, OLD.case_id,
      OLD.beneficiary_contact_id, OLD.amount, OLD.currency,
      OLD.distribution_method, OLD.purpose, OLD.planned_at,
      OLD.requires_confirmation, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Distribution context and amount are immutable; cancel and create a new plan';
  END IF;

  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('ready', 'cancelled'))
    OR (OLD.status = 'ready' AND NEW.status IN ('assigned', 'cancelled'))
    OR (OLD.status = 'assigned' AND NEW.status IN ('assigned', 'in_progress', 'cancelled'))
    OR (OLD.status = 'in_progress' AND NEW.status IN ('executed', 'revision_required'))
    OR (OLD.status = 'executed' AND NEW.status IN ('confirmed', 'verified', 'revision_required'))
    OR (OLD.status = 'confirmed' AND NEW.status IN ('verified', 'revision_required'))
    OR (OLD.status = 'revision_required' AND NEW.status = 'in_progress')
    OR (OLD.status = 'verified' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid distribution state transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_protect_distribution_plan_state"
BEFORE UPDATE OR DELETE ON "distribution_plans"
FOR EACH ROW EXECUTE FUNCTION private.protect_distribution_plan_state();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_distribution_assignment_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Distribution assignments cannot be deleted';
  END IF;
  IF OLD.status <> 'active' OR NEW.status <> 'revoked'
     OR NEW.revoked_at IS NULL
     OR (NEW.organization_id, NEW.distribution_plan_id, NEW.membership_id,
         NEW.assignee_profile_id, NEW.sequence_number, NEW.assigned_by,
         NEW.assigned_at, NEW.notes, NEW.created_at)
        IS DISTINCT FROM
        (OLD.organization_id, OLD.distribution_plan_id, OLD.membership_id,
         OLD.assignee_profile_id, OLD.sequence_number, OLD.assigned_by,
         OLD.assigned_at, OLD.notes, OLD.created_at) THEN
    RAISE EXCEPTION 'Distribution assignment may only transition from active to revoked';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_protect_distribution_assignment_state"
BEFORE UPDATE OR DELETE ON "distribution_assignments"
FOR EACH ROW EXECUTE FUNCTION private.protect_distribution_assignment_state();--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('distributions.read', 'distributions', 'read', 'Melihat rencana dan pelaksanaan distribusi'),
  ('distributions.manage', 'distributions', 'manage', 'Membuat rencana distribusi'),
  ('distributions.ready', 'distributions', 'ready', 'Menandai rencana distribusi siap ditugaskan'),
  ('distributions.assign', 'distributions', 'assign', 'Menugaskan petugas distribusi'),
  ('distributions.execute', 'distributions', 'execute', 'Melaksanakan distribusi yang ditugaskan'),
  ('distributions.confirm', 'distributions', 'confirm', 'Mencatat konfirmasi penerima manfaat'),
  ('distributions.verify', 'distributions', 'verify', 'Memverifikasi distribusi secara independen'),
  ('distributions.complete', 'distributions', 'complete', 'Menutup distribusi yang telah terverifikasi'),
  ('distributions.cancel', 'distributions', 'cancel', 'Membatalkan rencana distribusi secara tercatat'),
  ('distribution_evidence.read', 'distribution_evidence', 'read', 'Melihat metadata bukti distribusi privat'),
  ('distribution_evidence.manage', 'distribution_evidence', 'manage', 'Mencatat metadata bukti distribusi privat')
ON CONFLICT (key) DO UPDATE
SET resource = excluded.resource,
    action = excluded.action,
    description = excluded.description,
    updated_at = now();--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.resource IN ('distributions', 'distribution_evidence')
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.key IN ('distributions.read', 'distribution_evidence.read')
WHERE role.organization_id IS NULL
  AND role.key IN ('field_officer', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.key IN (
    'distributions.execute',
    'distributions.confirm',
    'distribution_evidence.manage'
  )
WHERE role.organization_id IS NULL
  AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.key IN ('distributions.verify', 'distributions.complete')
WHERE role.organization_id IS NULL
  AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
