CREATE TABLE "inventory_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "sku" text NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "base_unit" text NOT NULL,
  "track_batch" boolean DEFAULT false NOT NULL,
  "track_expiry" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_products_org_sku_unique" UNIQUE("organization_id","sku"),
  CONSTRAINT "inventory_products_id_org_unique" UNIQUE("id","organization_id"),
  CONSTRAINT "inventory_products_sku_check" CHECK (sku ~ '^[A-Z0-9._:-]{2,80}$'),
  CONSTRAINT "inventory_products_name_check" CHECK (length(trim(name)) >= 3),
  CONSTRAINT "inventory_products_unit_check" CHECK (length(trim(base_unit)) >= 1),
  CONSTRAINT "inventory_products_status_check" CHECK (status in ('active', 'inactive', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "inventory_products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "inventory_warehouses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "type" text DEFAULT 'central' NOT NULL,
  "address_notes" text,
  "status" text DEFAULT 'active' NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_warehouses_org_code_unique" UNIQUE("organization_id","code"),
  CONSTRAINT "inventory_warehouses_id_org_unique" UNIQUE("id","organization_id"),
  CONSTRAINT "inventory_warehouses_code_check" CHECK (code ~ '^[A-Z0-9._:-]{2,80}$'),
  CONSTRAINT "inventory_warehouses_name_check" CHECK (length(trim(name)) >= 3),
  CONSTRAINT "inventory_warehouses_type_check" CHECK (type in ('central', 'field', 'partner', 'virtual')),
  CONSTRAINT "inventory_warehouses_status_check" CHECK (status in ('active', 'inactive', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "inventory_warehouses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "batch_number" text NOT NULL,
  "manufactured_at" date,
  "expires_at" date,
  "status" text DEFAULT 'active' NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_batches_org_product_number_unique" UNIQUE("organization_id","product_id","batch_number"),
  CONSTRAINT "inventory_batches_id_org_unique" UNIQUE("id","organization_id"),
  CONSTRAINT "inventory_batches_number_check" CHECK (length(trim(batch_number)) >= 1),
  CONSTRAINT "inventory_batches_status_check" CHECK (status in ('active', 'expired', 'blocked', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "inventory_batches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "batch_id" uuid,
  "quantity_on_hand" numeric(20, 4) DEFAULT 0 NOT NULL,
  "quantity_reserved" numeric(20, 4) DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_balances_unique" UNIQUE NULLS NOT DISTINCT("organization_id","product_id","warehouse_id","batch_id"),
  CONSTRAINT "inventory_balances_quantity_check" CHECK (quantity_on_hand >= 0 and quantity_reserved >= 0 and quantity_on_hand >= quantity_reserved)
);
--> statement-breakpoint
ALTER TABLE "inventory_balances" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "batch_id" uuid,
  "movement_type" text NOT NULL,
  "direction" text NOT NULL,
  "quantity" numeric(20, 4) NOT NULL,
  "unit" text NOT NULL,
  "source_type" text NOT NULL,
  "source_id" uuid NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "notes" text,
  "request_id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_movements_quantity_check" CHECK (quantity > 0),
  CONSTRAINT "inventory_movements_direction_check" CHECK (direction in ('in', 'out')),
  CONSTRAINT "inventory_movements_type_check" CHECK (movement_type in ('receipt_in', 'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out', 'distribution_out', 'reservation_in', 'reservation_out')),
  CONSTRAINT "inventory_movements_source_check" CHECK (source_type in ('goods_receipt', 'inventory_adjustment', 'stock_transfer', 'distribution', 'reservation'))
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "inventory_adjustment_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "reference_number" text NOT NULL,
  "product_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "batch_number" text,
  "expires_at" date,
  "adjustment_type" text NOT NULL,
  "expected_delta" numeric(20, 4) NOT NULL,
  "unit" text NOT NULL,
  "notes" text NOT NULL,
  "decision_notes" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "posted_by" uuid,
  "posted_at" timestamp with time zone,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_adjustments_org_reference_unique" UNIQUE("organization_id","reference_number"),
  CONSTRAINT "inventory_adjustments_id_org_unique" UNIQUE("id","organization_id"),
  CONSTRAINT "inventory_adjustments_delta_check" CHECK (expected_delta <> 0),
  CONSTRAINT "inventory_adjustments_notes_check" CHECK (length(trim(notes)) >= 10),
  CONSTRAINT "inventory_adjustments_type_check" CHECK (adjustment_type in ('stocktake_gain', 'stocktake_loss', 'damage', 'loss', 'correction')),
  CONSTRAINT "inventory_adjustments_status_check" CHECK (status in ('draft', 'submitted', 'approved', 'rejected', 'posted', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "inventory_adjustment_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "inventory_idempotency_records" (
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
  CONSTRAINT "inventory_idempotency_org_key_unique" UNIQUE("organization_id","idempotency_key"),
  CONSTRAINT "inventory_idempotency_values_check" CHECK (status in ('processing', 'completed') and length(idempotency_key) between 16 and 200)
);
--> statement-breakpoint
ALTER TABLE "inventory_idempotency_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_products" ADD CONSTRAINT "inventory_products_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_warehouses" ADD CONSTRAINT "inventory_warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_warehouses" ADD CONSTRAINT "inventory_warehouses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_warehouses" ADD CONSTRAINT "inventory_warehouses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_fkey" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."inventory_products"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_fkey" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."inventory_products"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id","organization_id") REFERENCES "public"."inventory_warehouses"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_batch_id_fkey" FOREIGN KEY ("batch_id","organization_id") REFERENCES "public"."inventory_batches"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."inventory_products"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id","organization_id") REFERENCES "public"."inventory_warehouses"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_batch_id_fkey" FOREIGN KEY ("batch_id","organization_id") REFERENCES "public"."inventory_batches"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_adjustment_requests" ADD CONSTRAINT "inventory_adjustments_product_id_fkey" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."inventory_products"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_adjustment_requests" ADD CONSTRAINT "inventory_adjustments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id","organization_id") REFERENCES "public"."inventory_warehouses"("id","organization_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_adjustment_requests" ADD CONSTRAINT "inventory_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_adjustment_requests" ADD CONSTRAINT "inventory_adjustments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_adjustment_requests" ADD CONSTRAINT "inventory_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_adjustment_requests" ADD CONSTRAINT "inventory_adjustments_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_idempotency_records" ADD CONSTRAINT "inventory_idempotency_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_idempotency_records" ADD CONSTRAINT "inventory_idempotency_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_inventory_products_org_status" ON "inventory_products" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "idx_inventory_warehouses_org_status" ON "inventory_warehouses" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "idx_inventory_batches_product_expiry" ON "inventory_batches" USING btree ("organization_id","product_id","expires_at");
--> statement-breakpoint
CREATE INDEX "idx_inventory_balances_product" ON "inventory_balances" USING btree ("organization_id","product_id","warehouse_id");
--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_product_time" ON "inventory_movements" USING btree ("organization_id","product_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_source" ON "inventory_movements" USING btree ("organization_id","source_type","source_id");
--> statement-breakpoint
CREATE INDEX "idx_inventory_adjustments_org_status" ON "inventory_adjustment_requests" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX "idx_inventory_idempotency_created" ON "inventory_idempotency_records" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE POLICY "inventory_products_select" ON "inventory_products" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_products.read'));
--> statement-breakpoint
CREATE POLICY "inventory_products_insert" ON "inventory_products" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_products.manage') and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "inventory_products_update" ON "inventory_products" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_products.manage')) WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_products.manage'));
--> statement-breakpoint
CREATE POLICY "inventory_products_delete" ON "inventory_products" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "inventory_warehouses_select" ON "inventory_warehouses" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_warehouses.read'));
--> statement-breakpoint
CREATE POLICY "inventory_warehouses_insert" ON "inventory_warehouses" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_warehouses.manage') and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "inventory_warehouses_update" ON "inventory_warehouses" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_warehouses.manage')) WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_warehouses.manage'));
--> statement-breakpoint
CREATE POLICY "inventory_warehouses_delete" ON "inventory_warehouses" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "inventory_batches_select" ON "inventory_batches" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_batches.read'));
--> statement-breakpoint
CREATE POLICY "inventory_batches_insert" ON "inventory_batches" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')) and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "inventory_batches_update" ON "inventory_batches" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post'))) WITH CHECK (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')));
--> statement-breakpoint
CREATE POLICY "inventory_batches_delete" ON "inventory_batches" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "inventory_balances_select" ON "inventory_balances" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_balances.read'));
--> statement-breakpoint
CREATE POLICY "inventory_balances_insert" ON "inventory_balances" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')));
--> statement-breakpoint
CREATE POLICY "inventory_balances_update" ON "inventory_balances" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post'))) WITH CHECK (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')));
--> statement-breakpoint
CREATE POLICY "inventory_balances_delete" ON "inventory_balances" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "inventory_movements_select" ON "inventory_movements" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_movements.read'));
--> statement-breakpoint
CREATE POLICY "inventory_movements_insert" ON "inventory_movements" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')) and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "inventory_movements_update" ON "inventory_movements" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "inventory_movements_delete" ON "inventory_movements" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "inventory_adjustments_select" ON "inventory_adjustment_requests" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_adjustments.read'));
--> statement-breakpoint
CREATE POLICY "inventory_adjustments_insert" ON "inventory_adjustment_requests" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'inventory_adjustments.manage') and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "inventory_adjustments_update" ON "inventory_adjustment_requests" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'inventory_adjustments.manage')
  or private.has_permission(organization_id, 'inventory_adjustments.submit')
  or private.has_permission(organization_id, 'inventory_adjustments.approve')
  or private.has_permission(organization_id, 'inventory_adjustments.post')
  or private.has_permission(organization_id, 'inventory_adjustments.cancel')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  (status = 'draft' and private.has_permission(organization_id, 'inventory_adjustments.manage'))
  or (status = 'submitted' and private.has_permission(organization_id, 'inventory_adjustments.submit'))
  or (status in ('approved', 'rejected') and private.has_permission(organization_id, 'inventory_adjustments.approve'))
  or (status = 'posted' and private.has_permission(organization_id, 'inventory_adjustments.post'))
  or (status = 'cancelled' and private.has_permission(organization_id, 'inventory_adjustments.cancel'))
));
--> statement-breakpoint
CREATE POLICY "inventory_adjustments_delete" ON "inventory_adjustment_requests" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "inventory_idempotency_select" ON "inventory_idempotency_records" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')));
--> statement-breakpoint
CREATE POLICY "inventory_idempotency_insert" ON "inventory_idempotency_records" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')) and created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY "inventory_idempotency_update" ON "inventory_idempotency_records" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post'))) WITH CHECK (private.has_active_membership(organization_id) and (private.has_permission(organization_id, 'inventory_movements.post') or private.has_permission(organization_id, 'inventory_adjustments.post')));
--> statement-breakpoint
CREATE POLICY "inventory_idempotency_delete" ON "inventory_idempotency_records" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);
--> statement-breakpoint
CREATE POLICY "audit_events_insert_inventory" ON "audit_events" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'inventory_products.manage')
  or private.has_permission(organization_id, 'inventory_warehouses.manage')
  or private.has_permission(organization_id, 'inventory_movements.post')
  or private.has_permission(organization_id, 'inventory_adjustments.manage')
  or private.has_permission(organization_id, 'inventory_adjustments.submit')
  or private.has_permission(organization_id, 'inventory_adjustments.approve')
  or private.has_permission(organization_id, 'inventory_adjustments.post')
  or private.has_permission(organization_id, 'inventory_adjustments.cancel')
));
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE
  "inventory_products",
  "inventory_warehouses",
  "inventory_batches",
  "inventory_balances",
  "inventory_movements",
  "inventory_adjustment_requests",
  "inventory_idempotency_records"
TO "app_runtime";
--> statement-breakpoint
CREATE TRIGGER "trg_inventory_products_touch_updated_at"
BEFORE UPDATE ON "inventory_products"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "trg_inventory_warehouses_touch_updated_at"
BEFORE UPDATE ON "inventory_warehouses"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "trg_inventory_batches_touch_updated_at"
BEFORE UPDATE ON "inventory_batches"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER "trg_inventory_adjustments_touch_updated_at"
BEFORE UPDATE ON "inventory_adjustment_requests"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.prevent_inventory_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Inventory movements are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_prevent_inventory_movement_mutation"
BEFORE UPDATE OR DELETE ON "inventory_movements"
FOR EACH ROW EXECUTE FUNCTION private.prevent_inventory_append_only_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_inventory_adjustment_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Inventory adjustments cannot be deleted';
  END IF;
  IF OLD.status IN ('posted', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'Final inventory adjustments are immutable';
  END IF;
  IF (NEW.organization_id, NEW.reference_number, NEW.product_id,
      NEW.warehouse_id, NEW.batch_number, NEW.expires_at,
      NEW.adjustment_type, NEW.expected_delta, NEW.unit,
      NEW.notes, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.organization_id, OLD.reference_number, OLD.product_id,
      OLD.warehouse_id, OLD.batch_number, OLD.expires_at,
      OLD.adjustment_type, OLD.expected_delta, OLD.unit,
      OLD.notes, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Inventory adjustment context is immutable; cancel and create a new request';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('submitted', 'cancelled'))
    OR (OLD.status = 'submitted' AND NEW.status IN ('approved', 'rejected', 'cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('posted', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid inventory adjustment state transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_protect_inventory_adjustment_state"
BEFORE UPDATE OR DELETE ON "inventory_adjustment_requests"
FOR EACH ROW EXECUTE FUNCTION private.protect_inventory_adjustment_state();
--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('inventory_products.read', 'inventory_products', 'read', 'Melihat master produk inventory'),
  ('inventory_products.manage', 'inventory_products', 'manage', 'Mengelola master produk inventory'),
  ('inventory_warehouses.read', 'inventory_warehouses', 'read', 'Melihat gudang inventory'),
  ('inventory_warehouses.manage', 'inventory_warehouses', 'manage', 'Mengelola gudang inventory'),
  ('inventory_batches.read', 'inventory_batches', 'read', 'Melihat batch inventory'),
  ('inventory_balances.read', 'inventory_balances', 'read', 'Melihat saldo stok inventory'),
  ('inventory_movements.read', 'inventory_movements', 'read', 'Melihat movement stok append-only'),
  ('inventory_movements.post', 'inventory_movements', 'post', 'Membukukan movement stok dari sumber resmi'),
  ('inventory_adjustments.read', 'inventory_adjustments', 'read', 'Melihat permintaan adjustment inventory'),
  ('inventory_adjustments.manage', 'inventory_adjustments', 'manage', 'Membuat draft adjustment inventory'),
  ('inventory_adjustments.submit', 'inventory_adjustments', 'submit', 'Mengirim adjustment inventory untuk approval'),
  ('inventory_adjustments.approve', 'inventory_adjustments', 'approve', 'Menyetujui atau menolak adjustment inventory'),
  ('inventory_adjustments.post', 'inventory_adjustments', 'post', 'Membukukan adjustment inventory yang approved'),
  ('inventory_adjustments.cancel', 'inventory_adjustments', 'cancel', 'Membatalkan adjustment inventory')
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
  ON permission.resource IN ('inventory_products', 'inventory_warehouses', 'inventory_batches', 'inventory_balances', 'inventory_movements', 'inventory_adjustments')
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.key IN (
    'inventory_products.read',
    'inventory_warehouses.read',
    'inventory_batches.read',
    'inventory_balances.read',
    'inventory_movements.read',
    'inventory_adjustments.read'
  )
WHERE role.organization_id IS NULL
  AND role.key IN ('field_officer', 'auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission
  ON permission.key IN (
    'inventory_movements.post',
    'inventory_adjustments.manage',
    'inventory_adjustments.submit'
  )
WHERE role.organization_id IS NULL
  AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
