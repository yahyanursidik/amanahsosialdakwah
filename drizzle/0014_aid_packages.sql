ALTER TABLE public.inventory_movements
  DROP CONSTRAINT inventory_movements_type_check;
--> statement-breakpoint
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_type_check CHECK (
    movement_type IN (
      'receipt_in', 'adjustment_in', 'adjustment_out', 'transfer_in',
      'transfer_out', 'distribution_out', 'reservation_in', 'reservation_out',
      'packing_out', 'unpack_in'
    )
  );
--> statement-breakpoint
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT inventory_movements_source_check;
--> statement-breakpoint
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_source_check CHECK (
    source_type IN (
      'goods_receipt', 'inventory_adjustment', 'stock_transfer',
      'distribution', 'reservation', 'aid_package_packing'
    )
  );
--> statement-breakpoint

CREATE TABLE public.aid_package_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft' NOT NULL,
  published_by uuid,
  published_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT aid_package_templates_org_code_unique UNIQUE (organization_id, code),
  CONSTRAINT aid_package_templates_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT aid_package_templates_code_check CHECK (code ~ '^[A-Z0-9._:-]{2,80}$'),
  CONSTRAINT aid_package_templates_name_check CHECK (length(trim(name)) >= 3),
  CONSTRAINT aid_package_templates_status_check CHECK (status IN ('draft', 'active', 'archived'))
);
--> statement-breakpoint
ALTER TABLE public.aid_package_templates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.aid_package_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  template_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric(20, 4) NOT NULL,
  unit text NOT NULL,
  allow_substitution boolean DEFAULT false NOT NULL,
  substitution_notes text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT aid_package_template_items_unique UNIQUE (template_id, product_id),
  CONSTRAINT aid_package_template_items_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT aid_package_template_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT aid_package_template_items_sort_check CHECK (sort_order >= 0)
);
--> statement-breakpoint
ALTER TABLE public.aid_package_template_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.aid_package_packings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  template_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  package_count integer NOT NULL,
  recipient_label text,
  notes text,
  status text DEFAULT 'draft' NOT NULL,
  packed_by uuid,
  packed_at timestamptz,
  reversed_by uuid,
  reversed_at timestamptz,
  reversal_reason text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT aid_package_packings_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT aid_package_packings_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT aid_package_packings_count_check CHECK (package_count > 0 AND package_count <= 100000),
  CONSTRAINT aid_package_packings_status_check CHECK (status IN ('draft', 'packed', 'cancelled', 'reversed'))
);
--> statement-breakpoint
ALTER TABLE public.aid_package_packings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.aid_package_packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  packing_id uuid NOT NULL,
  template_item_id uuid NOT NULL,
  requested_product_id uuid NOT NULL,
  actual_product_id uuid NOT NULL,
  batch_id uuid,
  quantity numeric(20, 4) NOT NULL,
  unit text NOT NULL,
  is_substitution boolean DEFAULT false NOT NULL,
  substitution_reason text,
  movement_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT aid_package_packing_items_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT aid_package_packing_items_movement_unique UNIQUE (movement_id),
  CONSTRAINT aid_package_packing_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT aid_package_packing_items_substitution_check CHECK (
    (is_substitution = false AND requested_product_id = actual_product_id AND substitution_reason IS NULL)
    OR (is_substitution = true AND requested_product_id <> actual_product_id AND length(trim(substitution_reason)) >= 10)
  )
);
--> statement-breakpoint
ALTER TABLE public.aid_package_packing_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.aid_package_unpack_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  packing_id uuid NOT NULL,
  packing_item_id uuid NOT NULL,
  movement_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT aid_package_unpack_items_packing_item_unique UNIQUE (packing_item_id),
  CONSTRAINT aid_package_unpack_items_movement_unique UNIQUE (movement_id)
);
--> statement-breakpoint
ALTER TABLE public.aid_package_unpack_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE public.aid_package_idempotency_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  command_type text NOT NULL,
  request_hash text NOT NULL,
  status text DEFAULT 'processing' NOT NULL,
  response_snapshot jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  CONSTRAINT aid_package_idempotency_org_key_unique UNIQUE (organization_id, idempotency_key),
  CONSTRAINT aid_package_idempotency_values_check CHECK (
    status IN ('processing', 'completed') AND length(idempotency_key) BETWEEN 16 AND 200
  )
);
--> statement-breakpoint
ALTER TABLE public.aid_package_idempotency_records ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.aid_package_templates
  ADD CONSTRAINT aid_package_templates_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_templates_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE public.aid_package_template_items
  ADD CONSTRAINT aid_package_template_items_template_fkey FOREIGN KEY (template_id, organization_id) REFERENCES public.aid_package_templates(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_template_items_product_fkey FOREIGN KEY (product_id, organization_id) REFERENCES public.inventory_products(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_template_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE public.aid_package_packings
  ADD CONSTRAINT aid_package_packings_template_fkey FOREIGN KEY (template_id, organization_id) REFERENCES public.aid_package_templates(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packings_warehouse_fkey FOREIGN KEY (warehouse_id, organization_id) REFERENCES public.inventory_warehouses(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT aid_package_packings_packed_by_fkey FOREIGN KEY (packed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packings_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE public.aid_package_packing_items
  ADD CONSTRAINT aid_package_packing_items_packing_fkey FOREIGN KEY (packing_id, organization_id) REFERENCES public.aid_package_packings(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packing_items_template_item_fkey FOREIGN KEY (template_item_id, organization_id) REFERENCES public.aid_package_template_items(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packing_items_requested_product_fkey FOREIGN KEY (requested_product_id, organization_id) REFERENCES public.inventory_products(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packing_items_actual_product_fkey FOREIGN KEY (actual_product_id, organization_id) REFERENCES public.inventory_products(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packing_items_batch_fkey FOREIGN KEY (batch_id, organization_id) REFERENCES public.inventory_batches(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packing_items_movement_fkey FOREIGN KEY (movement_id) REFERENCES public.inventory_movements(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_packing_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE public.aid_package_unpack_items
  ADD CONSTRAINT aid_package_unpack_items_packing_fkey FOREIGN KEY (packing_id, organization_id) REFERENCES public.aid_package_packings(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_unpack_items_packing_item_fkey FOREIGN KEY (packing_item_id, organization_id) REFERENCES public.aid_package_packing_items(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_unpack_items_movement_fkey FOREIGN KEY (movement_id) REFERENCES public.inventory_movements(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_unpack_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE public.aid_package_idempotency_records
  ADD CONSTRAINT aid_package_idempotency_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD CONSTRAINT aid_package_idempotency_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint

CREATE INDEX idx_aid_package_templates_org_status ON public.aid_package_templates (organization_id, status);
CREATE INDEX idx_aid_package_template_items_template ON public.aid_package_template_items (organization_id, template_id, sort_order);
CREATE INDEX idx_aid_package_packings_org_status ON public.aid_package_packings (organization_id, status, created_at DESC);
CREATE INDEX idx_aid_package_packing_items_packing ON public.aid_package_packing_items (organization_id, packing_id);
CREATE INDEX idx_aid_package_unpack_items_packing ON public.aid_package_unpack_items (organization_id, packing_id);
CREATE INDEX idx_aid_package_idempotency_created ON public.aid_package_idempotency_records (organization_id, created_at);
--> statement-breakpoint

CREATE POLICY aid_package_templates_select ON public.aid_package_templates FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_templates.read'));
CREATE POLICY aid_package_templates_insert ON public.aid_package_templates FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_templates.manage') AND created_by = private.current_profile_id());
CREATE POLICY aid_package_templates_update ON public.aid_package_templates FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_templates.manage') OR private.has_permission(organization_id, 'aid_package_templates.publish')))
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_templates.manage') OR private.has_permission(organization_id, 'aid_package_templates.publish')));
CREATE POLICY aid_package_templates_delete ON public.aid_package_templates FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY aid_package_template_items_select ON public.aid_package_template_items FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_templates.read'));
CREATE POLICY aid_package_template_items_insert ON public.aid_package_template_items FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_templates.manage') AND created_by = private.current_profile_id());
CREATE POLICY aid_package_template_items_update ON public.aid_package_template_items FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_templates.manage'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_templates.manage'));
CREATE POLICY aid_package_template_items_delete ON public.aid_package_template_items FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY aid_package_packings_select ON public.aid_package_packings FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_packings.read'));
CREATE POLICY aid_package_packings_insert ON public.aid_package_packings FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_packings.manage') AND created_by = private.current_profile_id());
CREATE POLICY aid_package_packings_update ON public.aid_package_packings FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack') OR private.has_permission(organization_id, 'aid_package_packings.cancel')))
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack') OR private.has_permission(organization_id, 'aid_package_packings.cancel')));
CREATE POLICY aid_package_packings_delete ON public.aid_package_packings FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY aid_package_packing_items_select ON public.aid_package_packing_items FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_packings.read'));
CREATE POLICY aid_package_packing_items_insert ON public.aid_package_packing_items FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_packings.pack') AND created_by = private.current_profile_id());
CREATE POLICY aid_package_packing_items_update ON public.aid_package_packing_items FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY aid_package_packing_items_delete ON public.aid_package_packing_items FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY aid_package_unpack_items_select ON public.aid_package_unpack_items FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_packings.read'));
CREATE POLICY aid_package_unpack_items_insert ON public.aid_package_unpack_items FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'aid_package_packings.unpack') AND created_by = private.current_profile_id());
CREATE POLICY aid_package_unpack_items_update ON public.aid_package_unpack_items FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY aid_package_unpack_items_delete ON public.aid_package_unpack_items FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint
CREATE POLICY aid_package_idempotency_select ON public.aid_package_idempotency_records FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')));
CREATE POLICY aid_package_idempotency_insert ON public.aid_package_idempotency_records FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')) AND created_by = private.current_profile_id());
CREATE POLICY aid_package_idempotency_update ON public.aid_package_idempotency_records FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')))
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')));
CREATE POLICY aid_package_idempotency_delete ON public.aid_package_idempotency_records FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

DROP POLICY IF EXISTS inventory_balances_insert ON public.inventory_balances;
DROP POLICY IF EXISTS inventory_balances_update ON public.inventory_balances;
DROP POLICY IF EXISTS inventory_movements_insert ON public.inventory_movements;
CREATE POLICY inventory_balances_insert ON public.inventory_balances FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'inventory_movements.post') OR private.has_permission(organization_id, 'inventory_adjustments.post') OR private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')));
CREATE POLICY inventory_balances_update ON public.inventory_balances FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'inventory_movements.post') OR private.has_permission(organization_id, 'inventory_adjustments.post') OR private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')))
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'inventory_movements.post') OR private.has_permission(organization_id, 'inventory_adjustments.post') OR private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')));
CREATE POLICY inventory_movements_insert ON public.inventory_movements FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'inventory_movements.post') OR private.has_permission(organization_id, 'inventory_adjustments.post') OR private.has_permission(organization_id, 'aid_package_packings.pack') OR private.has_permission(organization_id, 'aid_package_packings.unpack')) AND created_by = private.current_profile_id());
--> statement-breakpoint
CREATE POLICY audit_events_insert_aid_packages ON public.audit_events FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'aid_package_templates.manage') OR
    private.has_permission(organization_id, 'aid_package_templates.publish') OR
    private.has_permission(organization_id, 'aid_package_packings.manage') OR
    private.has_permission(organization_id, 'aid_package_packings.pack') OR
    private.has_permission(organization_id, 'aid_package_packings.unpack') OR
    private.has_permission(organization_id, 'aid_package_packings.cancel')
  ));
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.aid_package_templates,
  public.aid_package_template_items,
  public.aid_package_packings,
  public.aid_package_packing_items,
  public.aid_package_unpack_items,
  public.aid_package_idempotency_records
TO app_runtime;
--> statement-breakpoint

CREATE TRIGGER trg_aid_package_templates_touch_updated_at
BEFORE UPDATE ON public.aid_package_templates
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_aid_package_packings_touch_updated_at
BEFORE UPDATE ON public.aid_package_packings
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_aid_package_records()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Aid package records cannot be deleted';
  END IF;
  IF TG_TABLE_NAME IN ('aid_package_packing_items', 'aid_package_unpack_items') THEN
    RAISE EXCEPTION 'Aid package movement details are append-only';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_aid_package_template_items
BEFORE DELETE ON public.aid_package_template_items
FOR EACH ROW EXECUTE FUNCTION private.protect_aid_package_records();
CREATE TRIGGER trg_protect_aid_package_packing_items
BEFORE UPDATE OR DELETE ON public.aid_package_packing_items
FOR EACH ROW EXECUTE FUNCTION private.protect_aid_package_records();
CREATE TRIGGER trg_protect_aid_package_unpack_items
BEFORE UPDATE OR DELETE ON public.aid_package_unpack_items
FOR EACH ROW EXECUTE FUNCTION private.protect_aid_package_records();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_published_aid_package_items()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE template_status text;
BEGIN
  SELECT status INTO template_status
  FROM public.aid_package_templates
  WHERE id = OLD.template_id AND organization_id = OLD.organization_id;
  IF template_status <> 'draft' THEN
    RAISE EXCEPTION 'Published package template items are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_published_aid_package_items
BEFORE UPDATE ON public.aid_package_template_items
FOR EACH ROW EXECUTE FUNCTION private.protect_published_aid_package_items();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_aid_package_template_state()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'active' AND (NEW.code, NEW.name, NEW.description) IS DISTINCT FROM (OLD.code, OLD.name, OLD.description) THEN
    RAISE EXCEPTION 'Published package templates are immutable';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status = 'active') OR
    (OLD.status = 'active' AND NEW.status = 'archived')
  ) THEN
    RAISE EXCEPTION 'Invalid aid package template transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_aid_package_template_state
BEFORE UPDATE ON public.aid_package_templates
FOR EACH ROW EXECUTE FUNCTION private.protect_aid_package_template_state();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_aid_package_packing_state()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Aid package packing cannot be deleted';
  END IF;
  IF OLD.status IN ('cancelled', 'reversed') THEN
    RAISE EXCEPTION 'Final aid package packing is immutable';
  END IF;
  IF (NEW.organization_id, NEW.reference_number, NEW.template_id, NEW.warehouse_id, NEW.package_count, NEW.recipient_label, NEW.notes, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.organization_id, OLD.reference_number, OLD.template_id, OLD.warehouse_id, OLD.package_count, OLD.recipient_label, OLD.notes, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Aid package packing context is immutable';
  END IF;
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'draft' AND NEW.status IN ('packed', 'cancelled')) OR
    (OLD.status = 'packed' AND NEW.status = 'reversed')
  ) THEN
    RAISE EXCEPTION 'Invalid aid package packing transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_aid_package_packing_state
BEFORE UPDATE OR DELETE ON public.aid_package_packings
FOR EACH ROW EXECUTE FUNCTION private.protect_aid_package_packing_state();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('aid_package_templates.read', 'aid_package_templates', 'read', 'Melihat template paket bantuan'),
  ('aid_package_templates.manage', 'aid_package_templates', 'manage', 'Membuat template paket bantuan'),
  ('aid_package_templates.publish', 'aid_package_templates', 'publish', 'Menerbitkan template paket bantuan'),
  ('aid_package_packings.read', 'aid_package_packings', 'read', 'Melihat proses packing paket bantuan'),
  ('aid_package_packings.manage', 'aid_package_packings', 'manage', 'Membuat rencana packing paket bantuan'),
  ('aid_package_packings.pack', 'aid_package_packings', 'pack', 'Membukukan packing paket dari stok FEFO'),
  ('aid_package_packings.unpack', 'aid_package_packings', 'unpack', 'Membalik packing paket ke stok'),
  ('aid_package_packings.cancel', 'aid_package_packings', 'cancel', 'Membatalkan rencana packing')
ON CONFLICT (key) DO UPDATE SET
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = now();
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.resource IN ('aid_package_templates', 'aid_package_packings')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'aid_package_templates.read', 'aid_package_packings.read',
  'aid_package_packings.manage', 'aid_package_packings.pack'
)
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('aid_package_templates.read', 'aid_package_packings.read')
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
