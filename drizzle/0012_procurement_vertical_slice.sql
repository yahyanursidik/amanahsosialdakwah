CREATE TABLE "procurement_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "reference_number" text NOT NULL,
  "program_id" uuid,
  "vendor_contact_id" uuid,
  "title" text NOT NULL,
  "purpose" text NOT NULL,
  "items" jsonb NOT NULL,
  "currency" text DEFAULT 'IDR' NOT NULL,
  "quote_amount" numeric(20, 2),
  "quote_currency" text,
  "expected_at" timestamp with time zone,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "procurement_requests_org_reference_unique" UNIQUE("organization_id","reference_number"),
  CONSTRAINT "procurement_requests_id_org_unique" UNIQUE("id","organization_id"),
  CONSTRAINT "procurement_requests_title_check" CHECK (length(trim(title)) >= 3),
  CONSTRAINT "procurement_requests_purpose_check" CHECK (length(trim(purpose)) >= 10),
  CONSTRAINT "procurement_requests_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT "procurement_requests_quote_currency_check" CHECK (quote_currency is null or quote_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT "procurement_requests_quote_amount_check" CHECK (quote_amount is null or quote_amount > 0),
  CONSTRAINT "procurement_requests_items_check" CHECK (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  CONSTRAINT "procurement_requests_status_check" CHECK (status in ('draft', 'submitted', 'approved', 'ordered', 'goods_received', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "procurement_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "procurement_request_id" uuid NOT NULL,
  "reference_number" text NOT NULL,
  "vendor_contact_id" uuid NOT NULL,
  "amount" numeric(20, 2) NOT NULL,
  "currency" text NOT NULL,
  "expected_delivery_at" timestamp with time zone,
  "payment_terms" text,
  "issued_at" timestamp with time zone,
  "issued_by" uuid,
  "status" text DEFAULT 'draft' NOT NULL,
  "cancelled_reason" text,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "purchase_orders_org_reference_unique" UNIQUE("organization_id","reference_number"),
  CONSTRAINT "purchase_orders_one_per_request_unique" UNIQUE("organization_id","procurement_request_id"),
  CONSTRAINT "purchase_orders_id_org_unique" UNIQUE("id","organization_id"),
  CONSTRAINT "purchase_orders_amount_check" CHECK (amount > 0),
  CONSTRAINT "purchase_orders_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT "purchase_orders_status_check" CHECK (status in ('draft', 'issued', 'partially_received', 'received', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "purchase_order_id" uuid NOT NULL,
  "receipt_number" text NOT NULL,
  "received_status" text NOT NULL,
  "items_received" jsonb NOT NULL,
  "condition_summary" text NOT NULL,
  "received_at" timestamp with time zone NOT NULL,
  "received_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "goods_receipts_org_receipt_unique" UNIQUE("organization_id","receipt_number"),
  CONSTRAINT "goods_receipts_items_check" CHECK (jsonb_typeof(items_received) = 'array' and jsonb_array_length(items_received) > 0),
  CONSTRAINT "goods_receipts_condition_check" CHECK (length(trim(condition_summary)) >= 10),
  CONSTRAINT "goods_receipts_status_check" CHECK (received_status in ('partially_received', 'received'))
);
--> statement-breakpoint
ALTER TABLE "goods_receipts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "vendor_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "purchase_order_id" uuid NOT NULL,
  "invoice_number" text NOT NULL,
  "invoice_date" timestamp with time zone NOT NULL,
  "amount" numeric(20, 2) NOT NULL,
  "currency" text NOT NULL,
  "payment_reference" text,
  "status" text DEFAULT 'recorded' NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vendor_invoices_org_number_unique" UNIQUE("organization_id","invoice_number"),
  CONSTRAINT "vendor_invoices_amount_check" CHECK (amount > 0),
  CONSTRAINT "vendor_invoices_currency_check" CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT "vendor_invoices_status_check" CHECK (status in ('recorded', 'paid', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "vendor_invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "procurement_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "from_status" text,
  "to_status" text NOT NULL,
  "actor_profile_id" uuid NOT NULL,
  "notes" text,
  "request_id" uuid NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "procurement_events_request_unique" UNIQUE("organization_id","request_id"),
  CONSTRAINT "procurement_events_entity_check" CHECK (entity_type in ('procurement_request', 'purchase_order'))
);
--> statement-breakpoint
ALTER TABLE "procurement_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "procurement_idempotency_records" (
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
  CONSTRAINT "procurement_idempotency_org_key_unique" UNIQUE("organization_id","idempotency_key"),
  CONSTRAINT "procurement_idempotency_values_check" CHECK (status in ('processing', 'completed') and length(idempotency_key) between 16 and 200)
);
--> statement-breakpoint
ALTER TABLE "procurement_idempotency_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_program_id_fkey" FOREIGN KEY ("program_id","organization_id") REFERENCES "public"."programs"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_vendor_contact_id_fkey" FOREIGN KEY ("vendor_contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_request_id_fkey" FOREIGN KEY ("procurement_request_id","organization_id") REFERENCES "public"."procurement_requests"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_contact_id_fkey" FOREIGN KEY ("vendor_contact_id","organization_id") REFERENCES "public"."crm_contacts"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id","organization_id") REFERENCES "public"."purchase_orders"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id","organization_id") REFERENCES "public"."purchase_orders"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_events" ADD CONSTRAINT "procurement_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_events" ADD CONSTRAINT "procurement_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_idempotency_records" ADD CONSTRAINT "procurement_idempotency_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "procurement_idempotency_records" ADD CONSTRAINT "procurement_idempotency_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_procurement_requests_org_status" ON "procurement_requests" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "idx_procurement_requests_vendor" ON "procurement_requests" USING btree ("organization_id","vendor_contact_id");
--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_org_status" ON "purchase_orders" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_request" ON "purchase_orders" USING btree ("organization_id","procurement_request_id");
--> statement-breakpoint
CREATE INDEX "idx_goods_receipts_po" ON "goods_receipts" USING btree ("organization_id","purchase_order_id","received_at");
--> statement-breakpoint
CREATE INDEX "idx_vendor_invoices_po" ON "vendor_invoices" USING btree ("organization_id","purchase_order_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_procurement_events_entity" ON "procurement_events" USING btree ("organization_id","entity_type","entity_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "idx_procurement_idempotency_created" ON "procurement_idempotency_records" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE POLICY "procurement_requests_select" ON "procurement_requests" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'procurement_requests.read'));
--> statement-breakpoint
CREATE POLICY "procurement_requests_insert" ON "procurement_requests" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'procurement_requests.manage') and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "procurement_requests_update" ON "procurement_requests" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'procurement_requests.manage')
  or private.has_permission(organization_id, 'procurement_requests.submit')
  or private.has_permission(organization_id, 'procurement_requests.approve')
  or private.has_permission(organization_id, 'procurement_requests.cancel')
  or private.has_permission(organization_id, 'purchase_orders.manage')
  or private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'goods_receipts.receive')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  (status = 'draft' and private.has_permission(organization_id, 'procurement_requests.manage'))
  or (status = 'submitted' and private.has_permission(organization_id, 'procurement_requests.submit'))
  or (status = 'approved' and private.has_permission(organization_id, 'procurement_requests.approve'))
  or (status = 'ordered' and private.has_permission(organization_id, 'purchase_orders.issue'))
  or (status = 'goods_received' and private.has_permission(organization_id, 'goods_receipts.receive'))
  or (status = 'cancelled' and private.has_permission(organization_id, 'procurement_requests.cancel'))
));
--> statement-breakpoint
CREATE POLICY "procurement_requests_delete" ON "procurement_requests" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "purchase_orders_select" ON "purchase_orders" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'purchase_orders.read'));
--> statement-breakpoint
CREATE POLICY "purchase_orders_insert" ON "purchase_orders" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'purchase_orders.manage') and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "purchase_orders_update" ON "purchase_orders" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'purchase_orders.manage')
  or private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'purchase_orders.cancel')
  or private.has_permission(organization_id, 'goods_receipts.receive')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  (status = 'draft' and private.has_permission(organization_id, 'purchase_orders.manage'))
  or (status = 'issued' and private.has_permission(organization_id, 'purchase_orders.issue'))
  or (status in ('partially_received', 'received') and private.has_permission(organization_id, 'goods_receipts.receive'))
  or (status = 'cancelled' and private.has_permission(organization_id, 'purchase_orders.cancel'))
));
--> statement-breakpoint
CREATE POLICY "purchase_orders_delete" ON "purchase_orders" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "goods_receipts_select" ON "goods_receipts" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'goods_receipts.read'));
--> statement-breakpoint
CREATE POLICY "goods_receipts_insert" ON "goods_receipts" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'goods_receipts.receive') and received_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "goods_receipts_update" ON "goods_receipts" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "goods_receipts_delete" ON "goods_receipts" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "vendor_invoices_select" ON "vendor_invoices" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'vendor_invoices.read'));
--> statement-breakpoint
CREATE POLICY "vendor_invoices_insert" ON "vendor_invoices" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'vendor_invoices.manage') and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "vendor_invoices_update" ON "vendor_invoices" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "vendor_invoices_delete" ON "vendor_invoices" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "procurement_events_select" ON "procurement_events" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'procurement_requests.read'));
--> statement-breakpoint
CREATE POLICY "procurement_events_insert" ON "procurement_events" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and actor_profile_id = private.current_profile_id() and (
  private.has_permission(organization_id, 'procurement_requests.manage')
  or private.has_permission(organization_id, 'procurement_requests.submit')
  or private.has_permission(organization_id, 'procurement_requests.approve')
  or private.has_permission(organization_id, 'procurement_requests.cancel')
  or private.has_permission(organization_id, 'purchase_orders.manage')
  or private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'purchase_orders.cancel')
  or private.has_permission(organization_id, 'goods_receipts.receive')
  or private.has_permission(organization_id, 'vendor_invoices.manage')
));
--> statement-breakpoint
CREATE POLICY "procurement_events_update" ON "procurement_events" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "procurement_events_delete" ON "procurement_events" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "procurement_idempotency_select" ON "procurement_idempotency_records" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'goods_receipts.receive')
));
--> statement-breakpoint
CREATE POLICY "procurement_idempotency_insert" ON "procurement_idempotency_records" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'goods_receipts.receive')
) and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "procurement_idempotency_update" ON "procurement_idempotency_records" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'goods_receipts.receive')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'goods_receipts.receive')
));
--> statement-breakpoint
CREATE POLICY "procurement_idempotency_delete" ON "procurement_idempotency_records" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE
  "procurement_requests",
  "purchase_orders",
  "goods_receipts",
  "vendor_invoices",
  "procurement_events",
  "procurement_idempotency_records"
TO "app_runtime";
--> statement-breakpoint
CREATE TRIGGER "trg_procurement_requests_touch_updated_at"
BEFORE UPDATE ON "procurement_requests"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "trg_purchase_orders_touch_updated_at"
BEFORE UPDATE ON "purchase_orders"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.prevent_procurement_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Procurement receipt, invoice, and event records are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_prevent_goods_receipt_mutation"
BEFORE UPDATE OR DELETE ON "goods_receipts"
FOR EACH ROW EXECUTE FUNCTION private.prevent_procurement_append_only_mutation();
--> statement-breakpoint
CREATE TRIGGER "trg_prevent_vendor_invoice_mutation"
BEFORE UPDATE OR DELETE ON "vendor_invoices"
FOR EACH ROW EXECUTE FUNCTION private.prevent_procurement_append_only_mutation();
--> statement-breakpoint
CREATE TRIGGER "trg_prevent_procurement_event_mutation"
BEFORE UPDATE OR DELETE ON "procurement_events"
FOR EACH ROW EXECUTE FUNCTION private.prevent_procurement_append_only_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_procurement_request_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Procurement requests cannot be deleted';
  END IF;
  IF OLD.status IN ('goods_received', 'cancelled') THEN
    RAISE EXCEPTION 'Final procurement requests are immutable';
  END IF;
  IF (NEW.organization_id, NEW.reference_number, NEW.program_id, NEW.title,
      NEW.purpose, NEW.items, NEW.currency, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.organization_id, OLD.reference_number, OLD.program_id, OLD.title,
      OLD.purpose, OLD.items, OLD.currency, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Procurement request context is immutable; cancel and create a new request';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('submitted', 'cancelled'))
    OR (OLD.status = 'submitted' AND NEW.status IN ('approved', 'cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('ordered', 'cancelled'))
    OR (OLD.status = 'ordered' AND NEW.status IN ('goods_received', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid procurement request state transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_protect_procurement_request_state"
BEFORE UPDATE OR DELETE ON "procurement_requests"
FOR EACH ROW EXECUTE FUNCTION private.protect_procurement_request_state();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_purchase_order_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Purchase orders cannot be deleted';
  END IF;
  IF OLD.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Final purchase orders are immutable';
  END IF;
  IF (NEW.organization_id, NEW.procurement_request_id, NEW.reference_number,
      NEW.vendor_contact_id, NEW.amount, NEW.currency, NEW.expected_delivery_at,
      NEW.payment_terms, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.organization_id, OLD.procurement_request_id, OLD.reference_number,
      OLD.vendor_contact_id, OLD.amount, OLD.currency, OLD.expected_delivery_at,
      OLD.payment_terms, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Purchase order context is immutable; cancel and create a new PO';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('issued', 'cancelled'))
    OR (OLD.status = 'issued' AND NEW.status IN ('partially_received', 'received', 'cancelled'))
    OR (OLD.status = 'partially_received' AND NEW.status IN ('received', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid purchase order state transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_protect_purchase_order_state"
BEFORE UPDATE OR DELETE ON "purchase_orders"
FOR EACH ROW EXECUTE FUNCTION private.protect_purchase_order_state();
--> statement-breakpoint
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
  or private.has_permission(organization_id, 'procurement_requests.manage')
  or private.has_permission(organization_id, 'procurement_requests.submit')
  or private.has_permission(organization_id, 'procurement_requests.approve')
  or private.has_permission(organization_id, 'procurement_requests.cancel')
  or private.has_permission(organization_id, 'purchase_orders.manage')
  or private.has_permission(organization_id, 'purchase_orders.issue')
  or private.has_permission(organization_id, 'purchase_orders.cancel')
  or private.has_permission(organization_id, 'goods_receipts.receive')
  or private.has_permission(organization_id, 'vendor_invoices.manage')
));
--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('procurement_requests.read', 'procurement_requests', 'read', 'Melihat permintaan pengadaan'),
  ('procurement_requests.manage', 'procurement_requests', 'manage', 'Membuat permintaan pengadaan draft'),
  ('procurement_requests.submit', 'procurement_requests', 'submit', 'Mengirim permintaan pengadaan untuk approval'),
  ('procurement_requests.approve', 'procurement_requests', 'approve', 'Menyetujui permintaan pengadaan'),
  ('procurement_requests.cancel', 'procurement_requests', 'cancel', 'Membatalkan permintaan pengadaan'),
  ('purchase_orders.read', 'purchase_orders', 'read', 'Melihat purchase order'),
  ('purchase_orders.manage', 'purchase_orders', 'manage', 'Membuat purchase order'),
  ('purchase_orders.issue', 'purchase_orders', 'issue', 'Menerbitkan purchase order'),
  ('purchase_orders.cancel', 'purchase_orders', 'cancel', 'Membatalkan purchase order'),
  ('goods_receipts.read', 'goods_receipts', 'read', 'Melihat penerimaan barang pengadaan'),
  ('goods_receipts.receive', 'goods_receipts', 'receive', 'Mencatat penerimaan barang pengadaan'),
  ('vendor_invoices.read', 'vendor_invoices', 'read', 'Melihat invoice vendor'),
  ('vendor_invoices.manage', 'vendor_invoices', 'manage', 'Mencatat invoice dan referensi pembayaran vendor')
ON CONFLICT (key) DO UPDATE
SET resource = excluded.resource,
    action = excluded.action,
    description = excluded.description,
    updated_at = now();
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.resource IN ('procurement_requests', 'purchase_orders', 'goods_receipts', 'vendor_invoices')
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.key IN (
    'procurement_requests.read',
    'purchase_orders.read',
    'goods_receipts.read',
    'vendor_invoices.read'
  )
WHERE role.organization_id IS NULL
  AND role.key IN ('field_officer', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.key IN ('goods_receipts.receive')
WHERE role.organization_id IS NULL
  AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
