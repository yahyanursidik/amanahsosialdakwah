CREATE TABLE "fund_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"restriction_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"activated_at" timestamp with time zone,
	"activated_by" uuid,
	"reversed_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_allocations_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "fund_allocations_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "fund_allocations_amount_check" CHECK (amount > 0),
	CONSTRAINT "fund_allocations_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fund_allocations_status_check" CHECK (status in ('draft', 'approved', 'reversed'))
);
--> statement-breakpoint
ALTER TABLE "fund_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"donor_contact_id" uuid,
	"restriction_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"committed_at" timestamp with time zone NOT NULL,
	"expected_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_commitments_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "fund_commitments_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "fund_commitments_amount_check" CHECK (amount > 0),
	CONSTRAINT "fund_commitments_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fund_commitments_status_check" CHECK (status in ('active', 'partially_received', 'fulfilled', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "fund_commitments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_disbursements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"allocation_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_reference" text NOT NULL,
	"payment_method" text NOT NULL,
	"external_reference" text,
	"disbursed_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'posted' NOT NULL,
	"reversed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_disbursements_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "fund_disbursements_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "fund_disbursements_amount_check" CHECK (amount > 0),
	CONSTRAINT "fund_disbursements_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fund_disbursements_status_check" CHECK (status in ('posted', 'reversed'))
);
--> statement-breakpoint
ALTER TABLE "fund_disbursements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_idempotency_records" (
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
	CONSTRAINT "fund_idempotency_records_org_key_unique" UNIQUE("organization_id","idempotency_key"),
	CONSTRAINT "fund_idempotency_records_status_check" CHECK (status in ('processing', 'completed')),
	CONSTRAINT "fund_idempotency_records_key_check" CHECK (length(idempotency_key) between 16 and 200)
);
--> statement-breakpoint
ALTER TABLE "fund_idempotency_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entry_number" text NOT NULL,
	"entry_type" text NOT NULL,
	"restriction_id" uuid NOT NULL,
	"program_id" uuid,
	"allocation_id" uuid,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"available_delta" numeric(20, 2) DEFAULT '0' NOT NULL,
	"allocated_delta" numeric(20, 2) DEFAULT '0' NOT NULL,
	"disbursed_delta" numeric(20, 2) DEFAULT '0' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_profile_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_ledger_entries_org_entry_unique" UNIQUE("organization_id","entry_number"),
	CONSTRAINT "fund_ledger_entries_request_unique" UNIQUE("organization_id","request_id"),
	CONSTRAINT "fund_ledger_entries_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fund_ledger_entries_entry_type_check" CHECK (entry_type in (
        'receipt_posted', 'receipt_reversed',
        'allocation_approved', 'allocation_reversed',
        'disbursement_posted', 'disbursement_reversed'
      )),
	CONSTRAINT "fund_ledger_entries_source_type_check" CHECK (source_type in ('receipt', 'allocation', 'disbursement', 'reversal')),
	CONSTRAINT "fund_ledger_entries_delta_check" CHECK (available_delta <> 0 or allocated_delta <> 0 or disbursed_delta <> 0)
);
--> statement-breakpoint
ALTER TABLE "fund_ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"commitment_id" uuid,
	"restriction_id" uuid NOT NULL,
	"donor_contact_id" uuid,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"payment_method" text NOT NULL,
	"external_reference" text,
	"status" text DEFAULT 'posted' NOT NULL,
	"reversed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_receipts_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "fund_receipts_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "fund_receipts_amount_check" CHECK (amount > 0),
	CONSTRAINT "fund_receipts_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fund_receipts_status_check" CHECK (status in ('posted', 'reversed'))
);
--> statement-breakpoint
ALTER TABLE "fund_receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"restriction_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"period_ended_at" timestamp with time zone NOT NULL,
	"system_balance" numeric(20, 2) NOT NULL,
	"statement_balance" numeric(20, 2) NOT NULL,
	"difference_amount" numeric(20, 2) NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"reconciled_by" uuid NOT NULL,
	"reconciled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_reconciliations_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "fund_reconciliations_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fund_reconciliations_status_check" CHECK (status in ('matched', 'variance'))
);
--> statement-breakpoint
ALTER TABLE "fund_reconciliations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_restrictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"restriction_type" text NOT NULL,
	"program_id" uuid,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_restrictions_org_code_unique" UNIQUE("organization_id","code"),
	CONSTRAINT "fund_restrictions_id_org_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "fund_restrictions_type_check" CHECK (restriction_type in ('unrestricted', 'program')),
	CONSTRAINT "fund_restrictions_program_check" CHECK ((restriction_type = 'unrestricted' and program_id is null)
        or (restriction_type = 'program' and program_id is not null)),
	CONSTRAINT "fund_restrictions_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
	CONSTRAINT "fund_restrictions_status_check" CHECK (status in ('active', 'inactive'))
);
--> statement-breakpoint
ALTER TABLE "fund_restrictions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fund_reversals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"currency" text NOT NULL,
	"reason" text NOT NULL,
	"reversed_by" uuid NOT NULL,
	"reversed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_reversals_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "fund_reversals_source_unique" UNIQUE("organization_id","source_type","source_id"),
	CONSTRAINT "fund_reversals_source_type_check" CHECK (source_type in ('receipt', 'allocation', 'disbursement')),
	CONSTRAINT "fund_reversals_amount_check" CHECK (amount > 0),
	CONSTRAINT "fund_reversals_currency_check" CHECK (currency ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "fund_reversals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_restriction_id_fkey" FOREIGN KEY ("restriction_id","organization_id") REFERENCES "public"."fund_restrictions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_program_id_fkey" FOREIGN KEY ("program_id","organization_id") REFERENCES "public"."programs"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_commitments" ADD CONSTRAINT "fund_commitments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_commitments" ADD CONSTRAINT "fund_commitments_donor_contact_id_fkey" FOREIGN KEY ("donor_contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_commitments" ADD CONSTRAINT "fund_commitments_restriction_id_fkey" FOREIGN KEY ("restriction_id","organization_id") REFERENCES "public"."fund_restrictions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_commitments" ADD CONSTRAINT "fund_commitments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_commitments" ADD CONSTRAINT "fund_commitments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_disbursements" ADD CONSTRAINT "fund_disbursements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_disbursements" ADD CONSTRAINT "fund_disbursements_allocation_id_fkey" FOREIGN KEY ("allocation_id","organization_id") REFERENCES "public"."fund_allocations"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_disbursements" ADD CONSTRAINT "fund_disbursements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_idempotency_records" ADD CONSTRAINT "fund_idempotency_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_idempotency_records" ADD CONSTRAINT "fund_idempotency_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_ledger_entries" ADD CONSTRAINT "fund_ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_ledger_entries" ADD CONSTRAINT "fund_ledger_entries_restriction_id_fkey" FOREIGN KEY ("restriction_id","organization_id") REFERENCES "public"."fund_restrictions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_ledger_entries" ADD CONSTRAINT "fund_ledger_entries_program_id_fkey" FOREIGN KEY ("program_id","organization_id") REFERENCES "public"."programs"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_ledger_entries" ADD CONSTRAINT "fund_ledger_entries_allocation_id_fkey" FOREIGN KEY ("allocation_id","organization_id") REFERENCES "public"."fund_allocations"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_ledger_entries" ADD CONSTRAINT "fund_ledger_entries_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_receipts" ADD CONSTRAINT "fund_receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_receipts" ADD CONSTRAINT "fund_receipts_commitment_id_fkey" FOREIGN KEY ("commitment_id","organization_id") REFERENCES "public"."fund_commitments"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_receipts" ADD CONSTRAINT "fund_receipts_restriction_id_fkey" FOREIGN KEY ("restriction_id","organization_id") REFERENCES "public"."fund_restrictions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_receipts" ADD CONSTRAINT "fund_receipts_donor_contact_id_fkey" FOREIGN KEY ("donor_contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_receipts" ADD CONSTRAINT "fund_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_reconciliations" ADD CONSTRAINT "fund_reconciliations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_reconciliations" ADD CONSTRAINT "fund_reconciliations_restriction_id_fkey" FOREIGN KEY ("restriction_id","organization_id") REFERENCES "public"."fund_restrictions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_reconciliations" ADD CONSTRAINT "fund_reconciliations_reconciled_by_fkey" FOREIGN KEY ("reconciled_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_restrictions" ADD CONSTRAINT "fund_restrictions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_restrictions" ADD CONSTRAINT "fund_restrictions_program_id_fkey" FOREIGN KEY ("program_id","organization_id") REFERENCES "public"."programs"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_restrictions" ADD CONSTRAINT "fund_restrictions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_restrictions" ADD CONSTRAINT "fund_restrictions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_reversals" ADD CONSTRAINT "fund_reversals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_reversals" ADD CONSTRAINT "fund_reversals_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fund_allocations_org_status" ON "fund_allocations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_fund_allocations_restriction" ON "fund_allocations" USING btree ("organization_id","restriction_id");--> statement-breakpoint
CREATE INDEX "idx_fund_commitments_org_status" ON "fund_commitments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_fund_commitments_restriction" ON "fund_commitments" USING btree ("organization_id","restriction_id");--> statement-breakpoint
CREATE INDEX "idx_fund_disbursements_org_status" ON "fund_disbursements" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_fund_disbursements_allocation" ON "fund_disbursements" USING btree ("organization_id","allocation_id");--> statement-breakpoint
CREATE INDEX "idx_fund_idempotency_created" ON "fund_idempotency_records" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_fund_ledger_restriction" ON "fund_ledger_entries" USING btree ("organization_id","restriction_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_fund_ledger_allocation" ON "fund_ledger_entries" USING btree ("organization_id","allocation_id");--> statement-breakpoint
CREATE INDEX "idx_fund_receipts_org_status" ON "fund_receipts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_fund_receipts_restriction" ON "fund_receipts" USING btree ("organization_id","restriction_id");--> statement-breakpoint
CREATE INDEX "idx_fund_reconciliations_restriction" ON "fund_reconciliations" USING btree ("organization_id","restriction_id","period_ended_at");--> statement-breakpoint
CREATE INDEX "idx_fund_restrictions_org_status" ON "fund_restrictions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_fund_reversals_source" ON "fund_reversals" USING btree ("organization_id","source_type","source_id");--> statement-breakpoint
ALTER TABLE "approval_requests" DROP CONSTRAINT IF EXISTS "approval_requests_subject_type_check";--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_subject_type_check" CHECK (subject_type = any (array['assessment', 'case', 'fund_allocation']::text[]));--> statement-breakpoint
ALTER TABLE "approval_workflows" DROP CONSTRAINT IF EXISTS "approval_workflows_resource_type_check";--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_resource_type_check" CHECK (resource_type = any (array['assessment', 'case', 'fund_allocation']::text[]));--> statement-breakpoint
CREATE POLICY "fund_allocations_select" ON "fund_allocations" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_allocations.read'));--> statement-breakpoint
CREATE POLICY "fund_allocations_insert" ON "fund_allocations" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_allocations.manage'));--> statement-breakpoint
CREATE POLICY "fund_allocations_update" ON "fund_allocations" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'fund_allocations.manage')
        or private.has_permission(organization_id, 'fund_allocations.activate')
        or private.has_permission(organization_id, 'fund_allocations.reverse')
      )) WITH CHECK (private.has_active_membership(organization_id) and (
        (status = 'draft' and private.has_permission(organization_id, 'fund_allocations.manage'))
        or (status = 'approved' and private.has_permission(organization_id, 'fund_allocations.activate'))
        or (status = 'reversed' and private.has_permission(organization_id, 'fund_allocations.reverse'))
      ));--> statement-breakpoint
CREATE POLICY "fund_allocations_delete" ON "fund_allocations" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_commitments_select" ON "fund_commitments" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_commitments.read'));--> statement-breakpoint
CREATE POLICY "fund_commitments_insert" ON "fund_commitments" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_commitments.manage'));--> statement-breakpoint
CREATE POLICY "fund_commitments_update" ON "fund_commitments" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_commitments.manage')) WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_commitments.manage'));--> statement-breakpoint
CREATE POLICY "fund_commitments_delete" ON "fund_commitments" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_disbursements_select" ON "fund_disbursements" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_disbursements.read'));--> statement-breakpoint
CREATE POLICY "fund_disbursements_insert" ON "fund_disbursements" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_disbursements.post'));--> statement-breakpoint
CREATE POLICY "fund_disbursements_update" ON "fund_disbursements" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_disbursements.reverse')) WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_disbursements.reverse'));--> statement-breakpoint
CREATE POLICY "fund_disbursements_delete" ON "fund_disbursements" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_idempotency_records_select" ON "fund_idempotency_records" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
  or private.has_permission(organization_id, 'fund_reconciliations.manage')
));--> statement-breakpoint
CREATE POLICY "fund_idempotency_records_insert" ON "fund_idempotency_records" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
  or private.has_permission(organization_id, 'fund_reconciliations.manage')
));--> statement-breakpoint
CREATE POLICY "fund_idempotency_records_update" ON "fund_idempotency_records" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
  or private.has_permission(organization_id, 'fund_reconciliations.manage')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
  or private.has_permission(organization_id, 'fund_reconciliations.manage')
));--> statement-breakpoint
CREATE POLICY "fund_idempotency_records_delete" ON "fund_idempotency_records" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_ledger_entries_select" ON "fund_ledger_entries" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_ledger.read'));--> statement-breakpoint
CREATE POLICY "fund_ledger_entries_insert" ON "fund_ledger_entries" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
));--> statement-breakpoint
CREATE POLICY "fund_ledger_entries_update" ON "fund_ledger_entries" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "fund_ledger_entries_delete" ON "fund_ledger_entries" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_receipts_select" ON "fund_receipts" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_receipts.read'));--> statement-breakpoint
CREATE POLICY "fund_receipts_insert" ON "fund_receipts" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_receipts.post'));--> statement-breakpoint
CREATE POLICY "fund_receipts_update" ON "fund_receipts" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_receipts.reverse')) WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_receipts.reverse'));--> statement-breakpoint
CREATE POLICY "fund_receipts_delete" ON "fund_receipts" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_reconciliations_select" ON "fund_reconciliations" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_reconciliations.read'));--> statement-breakpoint
CREATE POLICY "fund_reconciliations_insert" ON "fund_reconciliations" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_reconciliations.manage'));--> statement-breakpoint
CREATE POLICY "fund_reconciliations_update" ON "fund_reconciliations" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "fund_reconciliations_delete" ON "fund_reconciliations" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_restrictions_select" ON "fund_restrictions" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_restrictions.read'));--> statement-breakpoint
CREATE POLICY "fund_restrictions_insert" ON "fund_restrictions" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_restrictions.manage'));--> statement-breakpoint
CREATE POLICY "fund_restrictions_update" ON "fund_restrictions" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_restrictions.manage')) WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_restrictions.manage'));--> statement-breakpoint
CREATE POLICY "fund_restrictions_delete" ON "fund_restrictions" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "fund_reversals_select" ON "fund_reversals" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'fund_ledger.read'));--> statement-breakpoint
CREATE POLICY "fund_reversals_insert" ON "fund_reversals" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'fund_receipts.post')
  or private.has_permission(organization_id, 'fund_receipts.reverse')
  or private.has_permission(organization_id, 'fund_allocations.activate')
  or private.has_permission(organization_id, 'fund_allocations.reverse')
  or private.has_permission(organization_id, 'fund_disbursements.post')
  or private.has_permission(organization_id, 'fund_disbursements.reverse')
));--> statement-breakpoint
CREATE POLICY "fund_reversals_update" ON "fund_reversals" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "fund_reversals_delete" ON "fund_reversals" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
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
));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE
  "fund_restrictions",
  "fund_commitments",
  "fund_receipts",
  "fund_allocations",
  "fund_disbursements",
  "fund_reversals",
  "fund_ledger_entries",
  "fund_reconciliations",
  "fund_idempotency_records"
TO "app_runtime";--> statement-breakpoint
CREATE TRIGGER "trg_fund_restrictions_touch_updated_at"
BEFORE UPDATE ON "fund_restrictions"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_fund_commitments_touch_updated_at"
BEFORE UPDATE ON "fund_commitments"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_fund_receipts_touch_updated_at"
BEFORE UPDATE ON "fund_receipts"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_fund_allocations_touch_updated_at"
BEFORE UPDATE ON "fund_allocations"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_fund_disbursements_touch_updated_at"
BEFORE UPDATE ON "fund_disbursements"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.prevent_fund_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Fund ledger, reversal, and reconciliation records are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_prevent_fund_ledger_mutation"
BEFORE UPDATE OR DELETE ON "fund_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION private.prevent_fund_record_mutation();--> statement-breakpoint
CREATE TRIGGER "trg_prevent_fund_reversal_mutation"
BEFORE UPDATE OR DELETE ON "fund_reversals"
FOR EACH ROW EXECUTE FUNCTION private.prevent_fund_record_mutation();--> statement-breakpoint
CREATE TRIGGER "trg_prevent_fund_reconciliation_mutation"
BEFORE UPDATE OR DELETE ON "fund_reconciliations"
FOR EACH ROW EXECUTE FUNCTION private.prevent_fund_record_mutation();--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_fund_transaction_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Fund transaction records cannot be deleted';
  END IF;

  IF TG_TABLE_NAME = 'fund_receipts' THEN
    IF OLD.status <> 'posted'
       OR NEW.status <> 'reversed'
       OR NEW.reversed_at IS NULL
       OR (NEW.organization_id, NEW.reference_number, NEW.commitment_id,
           NEW.restriction_id, NEW.donor_contact_id, NEW.amount, NEW.currency,
           NEW.received_at, NEW.payment_method, NEW.external_reference, NEW.created_by,
           NEW.created_at)
          IS DISTINCT FROM
          (OLD.organization_id, OLD.reference_number, OLD.commitment_id,
           OLD.restriction_id, OLD.donor_contact_id, OLD.amount, OLD.currency,
           OLD.received_at, OLD.payment_method, OLD.external_reference, OLD.created_by,
           OLD.created_at) THEN
      RAISE EXCEPTION 'Posted receipts can only transition once to reversed';
    END IF;
  ELSIF TG_TABLE_NAME = 'fund_disbursements' THEN
    IF OLD.status <> 'posted'
       OR NEW.status <> 'reversed'
       OR NEW.reversed_at IS NULL
       OR (NEW.organization_id, NEW.reference_number, NEW.allocation_id,
           NEW.amount, NEW.currency, NEW.recipient_type, NEW.recipient_reference,
           NEW.payment_method, NEW.external_reference, NEW.disbursed_at,
           NEW.created_by, NEW.created_at)
          IS DISTINCT FROM
          (OLD.organization_id, OLD.reference_number, OLD.allocation_id,
           OLD.amount, OLD.currency, OLD.recipient_type, OLD.recipient_reference,
           OLD.payment_method, OLD.external_reference, OLD.disbursed_at,
           OLD.created_by, OLD.created_at) THEN
      RAISE EXCEPTION 'Posted disbursements can only transition once to reversed';
    END IF;
  ELSIF TG_TABLE_NAME = 'fund_allocations' THEN
    IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
      RETURN NEW;
    END IF;
    IF OLD.status NOT IN ('draft', 'approved')
       OR (OLD.status = 'draft' AND (NEW.status <> 'approved' OR NEW.activated_at IS NULL))
       OR (OLD.status = 'approved' AND (NEW.status <> 'reversed' OR NEW.reversed_at IS NULL))
       OR (NEW.organization_id, NEW.reference_number, NEW.restriction_id,
           NEW.program_id, NEW.amount, NEW.currency, NEW.purpose, NEW.created_by,
           NEW.created_at)
          IS DISTINCT FROM
          (OLD.organization_id, OLD.reference_number, OLD.restriction_id,
           OLD.program_id, OLD.amount, OLD.currency, OLD.purpose, OLD.created_by,
           OLD.created_at) THEN
      RAISE EXCEPTION 'Allocation state transition is invalid or changes immutable financial data';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_protect_fund_receipt_state"
BEFORE UPDATE OR DELETE ON "fund_receipts"
FOR EACH ROW EXECUTE FUNCTION private.protect_fund_transaction_state();--> statement-breakpoint
CREATE TRIGGER "trg_protect_fund_allocation_state"
BEFORE UPDATE OR DELETE ON "fund_allocations"
FOR EACH ROW EXECUTE FUNCTION private.protect_fund_transaction_state();--> statement-breakpoint
CREATE TRIGGER "trg_protect_fund_disbursement_state"
BEFORE UPDATE OR DELETE ON "fund_disbursements"
FOR EACH ROW EXECUTE FUNCTION private.protect_fund_transaction_state();--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('fund_restrictions.read', 'fund_restrictions', 'read', 'Melihat klasifikasi pembatasan dana'),
  ('fund_restrictions.manage', 'fund_restrictions', 'manage', 'Mengelola klasifikasi pembatasan dana'),
  ('fund_commitments.read', 'fund_commitments', 'read', 'Melihat komitmen dana'),
  ('fund_commitments.manage', 'fund_commitments', 'manage', 'Mencatat komitmen dana'),
  ('fund_receipts.read', 'fund_receipts', 'read', 'Melihat penerimaan dana'),
  ('fund_receipts.post', 'fund_receipts', 'post', 'Membukukan penerimaan dana'),
  ('fund_receipts.reverse', 'fund_receipts', 'reverse', 'Membalik penerimaan dana secara tercatat'),
  ('fund_allocations.read', 'fund_allocations', 'read', 'Melihat alokasi dana'),
  ('fund_allocations.manage', 'fund_allocations', 'manage', 'Membuat draft alokasi dana'),
  ('fund_allocations.activate', 'fund_allocations', 'activate', 'Mengaktifkan alokasi yang telah disetujui'),
  ('fund_allocations.reverse', 'fund_allocations', 'reverse', 'Membalik alokasi dana secara tercatat'),
  ('fund_disbursements.read', 'fund_disbursements', 'read', 'Melihat penyaluran dana'),
  ('fund_disbursements.post', 'fund_disbursements', 'post', 'Membukukan penyaluran dana'),
  ('fund_disbursements.reverse', 'fund_disbursements', 'reverse', 'Membalik penyaluran dana secara tercatat'),
  ('fund_reconciliations.read', 'fund_reconciliations', 'read', 'Melihat rekonsiliasi dana'),
  ('fund_reconciliations.manage', 'fund_reconciliations', 'manage', 'Mencatat rekonsiliasi dana'),
  ('fund_ledger.read', 'fund_ledger', 'read', 'Melihat jurnal dana yang append-only')
ON CONFLICT (key) DO UPDATE
SET resource = excluded.resource,
    action = excluded.action,
    description = excluded.description,
    updated_at = now();--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.resource IN (
  'fund_restrictions', 'fund_commitments', 'fund_receipts', 'fund_allocations',
  'fund_disbursements', 'fund_reconciliations', 'fund_ledger'
)
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'fund_restrictions.read', 'fund_commitments.read', 'fund_receipts.read',
  'fund_allocations.read', 'fund_disbursements.read',
  'fund_reconciliations.read', 'fund_ledger.read'
)
WHERE role.organization_id IS NULL
  AND role.key IN ('field_officer', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
