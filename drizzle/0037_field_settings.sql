-- Pengaturan kerja lapangan yang dapat diatur admin: aturan organisasi dan
-- template ceklis per jenis tugas (opsional per program). Butir template
-- dapat dibatasi hanya muncul bila tugas menyalurkan dana atau barang.

CREATE TABLE IF NOT EXISTS public.field_settings (
  organization_id uuid PRIMARY KEY NOT NULL,
  require_report_to_complete boolean NOT NULL DEFAULT true,
  handover_min_photos integer NOT NULL DEFAULT 0,
  require_gps_for_handover boolean NOT NULL DEFAULT false,
  officer_can_uncheck boolean NOT NULL DEFAULT true,
  default_due_days integer NOT NULL DEFAULT 3,
  verification_updates_profile boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_settings_photos_check CHECK (handover_min_photos BETWEEN 0 AND 4),
  CONSTRAINT field_settings_due_check CHECK (default_due_days BETWEEN 0 AND 60),
  CONSTRAINT field_settings_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT field_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.field_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  task_type text NOT NULL,
  program_id uuid,
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_checklist_templates_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT field_checklist_templates_name_check CHECK (length(trim(name)) >= 3),
  CONSTRAINT field_checklist_templates_type_check CHECK (task_type IN ('distribution','verification','delivery','monitoring','other')),
  CONSTRAINT field_checklist_templates_status_check CHECK (status IN ('active','archived')),
  CONSTRAINT field_checklist_templates_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT field_checklist_templates_program_fkey FOREIGN KEY (program_id, organization_id) REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_checklist_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT field_checklist_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

-- Satu template bawaan aktif per jenis tugas (dan per program bila diisi).
CREATE UNIQUE INDEX IF NOT EXISTS field_checklist_templates_default_unique
  ON public.field_checklist_templates (organization_id, task_type, coalesce(program_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE is_default AND status = 'active';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.field_checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  template_id uuid NOT NULL,
  sequence_number integer NOT NULL,
  item_kind text NOT NULL,
  label text NOT NULL,
  hint text,
  is_required boolean NOT NULL DEFAULT true,
  applies_to text NOT NULL DEFAULT 'always',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_checklist_template_items_sequence_unique UNIQUE (template_id, sequence_number),
  CONSTRAINT field_checklist_template_items_kind_check CHECK (item_kind IN ('check','handover_cash','handover_goods','confirmation','photo','gps','report')),
  CONSTRAINT field_checklist_template_items_label_check CHECK (length(trim(label)) >= 3),
  CONSTRAINT field_checklist_template_items_applies_check CHECK (applies_to IN ('always','cash','in_kind')),
  CONSTRAINT field_checklist_template_items_template_fkey FOREIGN KEY (template_id, organization_id)
    REFERENCES public.field_checklist_templates(id, organization_id) ON DELETE CASCADE
);
--> statement-breakpoint

ALTER TABLE public.field_tasks ADD COLUMN IF NOT EXISTS template_id uuid;
ALTER TABLE public.field_task_items ADD COLUMN IF NOT EXISTS hint text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'field_tasks_template_fkey') THEN
    ALTER TABLE public.field_tasks
      ADD CONSTRAINT field_tasks_template_fkey FOREIGN KEY (template_id, organization_id)
        REFERENCES public.field_checklist_templates(id, organization_id) ON DELETE RESTRICT;
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_field_checklist_templates_type ON public.field_checklist_templates (organization_id, task_type, status);
CREATE INDEX IF NOT EXISTS idx_field_checklist_template_items_template ON public.field_checklist_template_items (organization_id, template_id, sequence_number);
--> statement-breakpoint

ALTER TABLE public.field_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_checklist_template_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS field_settings_select ON public.field_settings;
CREATE POLICY field_settings_select ON public.field_settings FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'field_settings.read')
    OR private.has_permission(organization_id, 'field_reports.submit')
    OR private.has_permission(organization_id, 'field_tasks.read')
  ));
DROP POLICY IF EXISTS field_settings_insert ON public.field_settings;
CREATE POLICY field_settings_insert ON public.field_settings FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'));
DROP POLICY IF EXISTS field_settings_update ON public.field_settings;
CREATE POLICY field_settings_update ON public.field_settings FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'));
DROP POLICY IF EXISTS field_settings_delete ON public.field_settings;
CREATE POLICY field_settings_delete ON public.field_settings FOR DELETE TO app_runtime USING (false);

DROP POLICY IF EXISTS field_checklist_templates_select ON public.field_checklist_templates;
CREATE POLICY field_checklist_templates_select ON public.field_checklist_templates FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'field_settings.read')
    OR private.has_permission(organization_id, 'field_tasks.manage')
  ));
DROP POLICY IF EXISTS field_checklist_templates_insert ON public.field_checklist_templates;
CREATE POLICY field_checklist_templates_insert ON public.field_checklist_templates FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage') AND created_by = private.current_profile_id());
DROP POLICY IF EXISTS field_checklist_templates_update ON public.field_checklist_templates;
CREATE POLICY field_checklist_templates_update ON public.field_checklist_templates FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'));
DROP POLICY IF EXISTS field_checklist_templates_delete ON public.field_checklist_templates;
CREATE POLICY field_checklist_templates_delete ON public.field_checklist_templates FOR DELETE TO app_runtime USING (false);

DROP POLICY IF EXISTS field_checklist_template_items_select ON public.field_checklist_template_items;
CREATE POLICY field_checklist_template_items_select ON public.field_checklist_template_items FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'field_settings.read')
    OR private.has_permission(organization_id, 'field_tasks.manage')
  ));
DROP POLICY IF EXISTS field_checklist_template_items_insert ON public.field_checklist_template_items;
CREATE POLICY field_checklist_template_items_insert ON public.field_checklist_template_items FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'));
DROP POLICY IF EXISTS field_checklist_template_items_update ON public.field_checklist_template_items;
CREATE POLICY field_checklist_template_items_update ON public.field_checklist_template_items FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'));
-- Butir template diganti utuh saat template disimpan.
DROP POLICY IF EXISTS field_checklist_template_items_delete ON public.field_checklist_template_items;
CREATE POLICY field_checklist_template_items_delete ON public.field_checklist_template_items FOR DELETE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_settings.manage'));
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.field_settings, public.field_checklist_templates TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_checklist_template_items TO app_runtime;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_field_settings_touch ON public.field_settings;
CREATE TRIGGER trg_field_settings_touch BEFORE UPDATE ON public.field_settings
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
DROP TRIGGER IF EXISTS trg_field_checklist_templates_touch ON public.field_checklist_templates;
CREATE TRIGGER trg_field_checklist_templates_touch BEFORE UPDATE ON public.field_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('field_settings.read', 'field_settings', 'read', 'Melihat aturan dan template ceklis kerja lapangan'),
  ('field_settings.manage', 'field_settings', 'manage', 'Mengatur aturan dan template ceklis kerja lapangan')
ON CONFLICT (key) DO UPDATE SET resource = excluded.resource, action = excluded.action, description = excluded.description, updated_at = now();
--> statement-breakpoint

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('field_settings.read','field_settings.manage')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner','organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key = 'field_settings.read'
WHERE role.organization_id IS NULL AND role.key IN ('field_officer','auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
