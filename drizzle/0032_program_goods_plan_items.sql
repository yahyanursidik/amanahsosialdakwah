-- Master kategori produk dan rencana barang Program.
-- Rencana bukan stok: saldo resmi tetap berasal dari inventory_movements.

CREATE TABLE public.inventory_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_product_categories_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT inventory_product_categories_org_code_unique UNIQUE (organization_id, code),
  CONSTRAINT inventory_product_categories_code_check CHECK (code ~ '^[A-Z0-9._:-]{2,80}$'),
  CONSTRAINT inventory_product_categories_name_check CHECK (length(trim(name)) >= 2),
  CONSTRAINT inventory_product_categories_status_check CHECK (status IN ('active', 'inactive', 'archived')),
  CONSTRAINT inventory_product_categories_org_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT inventory_product_categories_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT inventory_product_categories_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

ALTER TABLE public.inventory_products
  ADD COLUMN category_id uuid;
--> statement-breakpoint

ALTER TABLE public.inventory_products
  ADD CONSTRAINT inventory_products_category_id_org_fkey
  FOREIGN KEY (category_id, organization_id)
  REFERENCES public.inventory_product_categories(id, organization_id)
  ON DELETE RESTRICT;
--> statement-breakpoint

-- Kategori teks lama dipertahankan sebagai snapshot kompatibilitas, lalu
-- dimaterialkan ke master kategori agar data yang sudah ada tidak hilang.
INSERT INTO public.inventory_product_categories (
  organization_id, code, name, description, status, created_by, updated_by
)
SELECT
  product.organization_id,
  'LEGACY-' || upper(substr(md5(lower(trim(product.category))), 1, 12)),
  trim(product.category),
  'Dimigrasikan dari kategori produk lama.',
  'active',
  (array_agg(product.created_by ORDER BY product.created_at))[1],
  (array_agg(product.updated_by ORDER BY product.updated_at))[1]
FROM public.inventory_products product
WHERE product.category IS NOT NULL AND trim(product.category) <> ''
GROUP BY product.organization_id, trim(product.category)
ON CONFLICT (organization_id, code) DO NOTHING;
--> statement-breakpoint

UPDATE public.inventory_products product
SET category_id = category.id
FROM public.inventory_product_categories category
WHERE category.organization_id = product.organization_id
  AND category.code = 'LEGACY-' || upper(substr(md5(lower(trim(product.category))), 1, 12))
  AND product.category IS NOT NULL
  AND trim(product.category) <> '';
--> statement-breakpoint

CREATE TABLE public.program_goods_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric(18, 4) NOT NULL,
  unit text NOT NULL,
  unit_value numeric(18, 2) NOT NULL,
  total_value numeric(18, 2) GENERATED ALWAYS AS (round(quantity * unit_value, 2)) STORED,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_goods_plan_items_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT program_goods_plan_items_program_product_unique UNIQUE (program_id, product_id),
  CONSTRAINT program_goods_plan_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT program_goods_plan_items_unit_check CHECK (length(trim(unit)) >= 1),
  CONSTRAINT program_goods_plan_items_unit_value_check CHECK (unit_value >= 0),
  CONSTRAINT program_goods_plan_items_status_check CHECK (status IN ('planned', 'cancelled')),
  CONSTRAINT program_goods_plan_items_program_fkey FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_goods_plan_items_product_fkey FOREIGN KEY (product_id, organization_id)
    REFERENCES public.inventory_products(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT program_goods_plan_items_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT program_goods_plan_items_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE INDEX idx_inventory_product_categories_org_status
  ON public.inventory_product_categories (organization_id, status, name);
CREATE INDEX idx_inventory_products_org_category_status
  ON public.inventory_products (organization_id, category_id, status);
CREATE INDEX idx_program_goods_plan_items_program_status
  ON public.program_goods_plan_items (organization_id, program_id, status, sort_order);
--> statement-breakpoint

ALTER TABLE public.inventory_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_goods_plan_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY inventory_product_categories_select ON public.inventory_product_categories
  FOR SELECT TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'inventory_product_categories.read')
  );
CREATE POLICY inventory_product_categories_insert ON public.inventory_product_categories
  FOR INSERT TO app_runtime WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'inventory_product_categories.manage')
    AND created_by = private.current_profile_id()
  );
CREATE POLICY inventory_product_categories_update ON public.inventory_product_categories
  FOR UPDATE TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'inventory_product_categories.manage')
  ) WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'inventory_product_categories.manage')
  );
CREATE POLICY inventory_product_categories_delete ON public.inventory_product_categories
  FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

CREATE POLICY program_goods_plan_items_select ON public.program_goods_plan_items
  FOR SELECT TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.read')
    AND private.has_permission(organization_id, 'program_goods_plan.read')
  );
CREATE POLICY program_goods_plan_items_insert ON public.program_goods_plan_items
  FOR INSERT TO app_runtime WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND private.has_permission(organization_id, 'program_goods_plan.manage')
    AND created_by = private.current_profile_id()
  );
CREATE POLICY program_goods_plan_items_update ON public.program_goods_plan_items
  FOR UPDATE TO app_runtime USING (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND private.has_permission(organization_id, 'program_goods_plan.manage')
  ) WITH CHECK (
    private.has_active_membership(organization_id)
    AND private.has_permission(organization_id, 'programs.manage')
    AND private.has_permission(organization_id, 'program_goods_plan.manage')
  );
CREATE POLICY program_goods_plan_items_delete ON public.program_goods_plan_items
  FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.inventory_product_categories TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON public.program_goods_plan_items TO app_runtime;
--> statement-breakpoint

CREATE TRIGGER trg_inventory_product_categories_touch_updated_at
  BEFORE UPDATE ON public.inventory_product_categories
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_program_goods_plan_items_touch_updated_at
  BEFORE UPDATE ON public.program_goods_plan_items
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('inventory_product_categories.read', 'inventory_product_categories', 'read', 'Melihat kategori produk inventory'),
  ('inventory_product_categories.manage', 'inventory_product_categories', 'manage', 'Mengelola kategori produk inventory'),
  ('program_goods_plan.read', 'program_goods_plan', 'read', 'Melihat rencana barang Program'),
  ('program_goods_plan.manage', 'program_goods_plan', 'manage', 'Mengelola rencana barang Program')
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint

INSERT INTO public.role_permissions (organization_id, role_id, permission_id, created_by)
SELECT role.organization_id, role.id, permission.id, role.created_by
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'inventory_product_categories.read',
  'inventory_product_categories.manage',
  'program_goods_plan.read',
  'program_goods_plan.manage'
)
WHERE role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
