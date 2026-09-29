-- To-do list tugas lapangan dengan ceklis. Satu tugas penyaluran dapat
-- sekaligus mencakup dana dan barang sesuai bentuk dukungan Program.

CREATE TABLE IF NOT EXISTS public.field_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  task_type text NOT NULL,
  title text NOT NULL,
  instructions text,
  priority text NOT NULL DEFAULT 'normal',
  due_date date,
  status text NOT NULL DEFAULT 'todo',
  program_id uuid,
  beneficiary_contact_id uuid,
  distribution_plan_id uuid,
  shipment_id uuid,
  case_id uuid,
  support_modes text[] NOT NULL DEFAULT '{}'::text[],
  cash_amount numeric(20,2),
  goods_package_count integer,
  goods_summary text,
  location_text text,
  assigned_profile_id uuid NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  completion_notes text,
  completed_report_id uuid,
  cancelled_reason text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_tasks_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT field_tasks_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT field_tasks_type_check CHECK (task_type IN ('distribution','verification','delivery','monitoring','other')),
  CONSTRAINT field_tasks_title_check CHECK (length(trim(title)) >= 5),
  CONSTRAINT field_tasks_priority_check CHECK (priority IN ('normal','high','urgent')),
  CONSTRAINT field_tasks_status_check CHECK (status IN ('todo','in_progress','done','cancelled')),
  CONSTRAINT field_tasks_modes_check CHECK (support_modes <@ ARRAY['cash','in_kind']::text[]),
  CONSTRAINT field_tasks_distribution_modes_check CHECK (task_type <> 'distribution' OR cardinality(support_modes) >= 1),
  CONSTRAINT field_tasks_cash_check CHECK (
    (cash_amount IS NULL OR cash_amount > 0)
    AND ('cash' <> ALL(support_modes) OR cash_amount IS NOT NULL)
  ),
  CONSTRAINT field_tasks_goods_check CHECK (
    (goods_package_count IS NULL OR goods_package_count > 0)
    AND ('in_kind' <> ALL(support_modes) OR goods_package_count IS NOT NULL OR length(trim(coalesce(goods_summary, ''))) > 0)
  ),
  CONSTRAINT field_tasks_done_check CHECK (status <> 'done' OR completed_at IS NOT NULL),
  CONSTRAINT field_tasks_cancel_check CHECK (status <> 'cancelled' OR length(trim(coalesce(cancelled_reason, ''))) >= 5),
  CONSTRAINT field_tasks_org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_program_fkey FOREIGN KEY (program_id, organization_id) REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_beneficiary_fkey FOREIGN KEY (beneficiary_contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_distribution_fkey FOREIGN KEY (distribution_plan_id, organization_id) REFERENCES public.distribution_plans(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_shipment_fkey FOREIGN KEY (shipment_id, organization_id) REFERENCES public.logistics_shipments(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_case_fkey FOREIGN KEY (case_id, organization_id) REFERENCES public.beneficiary_cases(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_report_fkey FOREIGN KEY (completed_report_id, organization_id) REFERENCES public.field_reports(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_assignee_fkey FOREIGN KEY (assigned_profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT field_tasks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.field_task_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  task_id uuid NOT NULL,
  sequence_number integer NOT NULL,
  item_kind text NOT NULL DEFAULT 'check',
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_task_items_sequence_unique UNIQUE (task_id, sequence_number),
  CONSTRAINT field_task_items_kind_check CHECK (item_kind IN ('check','handover_cash','handover_goods','confirmation','photo','gps','report')),
  CONSTRAINT field_task_items_label_check CHECK (length(trim(label)) >= 3),
  CONSTRAINT field_task_items_done_check CHECK (
    (is_done AND done_at IS NOT NULL AND done_by IS NOT NULL)
    OR (NOT is_done AND done_at IS NULL AND done_by IS NULL)
  ),
  CONSTRAINT field_task_items_task_fkey FOREIGN KEY (task_id, organization_id) REFERENCES public.field_tasks(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_task_items_done_by_fkey FOREIGN KEY (done_by) REFERENCES public.profiles(id) ON DELETE RESTRICT
);
--> statement-breakpoint

ALTER TABLE public.field_reports ADD COLUMN IF NOT EXISTS task_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'field_reports_task_fkey') THEN
    ALTER TABLE public.field_reports
      ADD CONSTRAINT field_reports_task_fkey FOREIGN KEY (task_id, organization_id)
        REFERENCES public.field_tasks(id, organization_id) ON DELETE RESTRICT;
  END IF;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_field_tasks_assignee ON public.field_tasks (organization_id, assigned_profile_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_field_tasks_program ON public.field_tasks (organization_id, program_id, status);
CREATE INDEX IF NOT EXISTS idx_field_task_items_task ON public.field_task_items (organization_id, task_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_field_reports_task ON public.field_reports (organization_id, task_id);
--> statement-breakpoint

ALTER TABLE public.field_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_task_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS field_tasks_select ON public.field_tasks;
CREATE POLICY field_tasks_select ON public.field_tasks FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_tasks.read'));
DROP POLICY IF EXISTS field_tasks_insert ON public.field_tasks;
CREATE POLICY field_tasks_insert ON public.field_tasks FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_tasks.manage') AND created_by = private.current_profile_id());
DROP POLICY IF EXISTS field_tasks_update ON public.field_tasks;
CREATE POLICY field_tasks_update ON public.field_tasks FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'field_tasks.manage')
    OR (private.has_permission(organization_id, 'field_tasks.read') AND assigned_profile_id = private.current_profile_id())
  ))
  WITH CHECK (private.has_active_membership(organization_id) AND (
    private.has_permission(organization_id, 'field_tasks.manage')
    OR (private.has_permission(organization_id, 'field_tasks.read') AND assigned_profile_id = private.current_profile_id())
  ));
DROP POLICY IF EXISTS field_tasks_delete ON public.field_tasks;
CREATE POLICY field_tasks_delete ON public.field_tasks FOR DELETE TO app_runtime USING (false);

DROP POLICY IF EXISTS field_task_items_select ON public.field_task_items;
CREATE POLICY field_task_items_select ON public.field_task_items FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_tasks.read'));
DROP POLICY IF EXISTS field_task_items_insert ON public.field_task_items;
CREATE POLICY field_task_items_insert ON public.field_task_items FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_tasks.manage'));
DROP POLICY IF EXISTS field_task_items_update ON public.field_task_items;
CREATE POLICY field_task_items_update ON public.field_task_items FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND EXISTS (
    SELECT 1 FROM public.field_tasks task
    WHERE task.id = field_task_items.task_id AND task.organization_id = field_task_items.organization_id
      AND (private.has_permission(task.organization_id, 'field_tasks.manage')
           OR task.assigned_profile_id = private.current_profile_id())
  ))
  WITH CHECK (private.has_active_membership(organization_id));
DROP POLICY IF EXISTS field_task_items_delete ON public.field_task_items;
CREATE POLICY field_task_items_delete ON public.field_task_items FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.field_tasks, public.field_task_items TO app_runtime;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_field_tasks_touch ON public.field_tasks;
CREATE TRIGGER trg_field_tasks_touch BEFORE UPDATE ON public.field_tasks
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
DROP TRIGGER IF EXISTS trg_field_task_items_touch ON public.field_task_items;
CREATE TRIGGER trg_field_task_items_touch BEFORE UPDATE ON public.field_task_items
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('field_tasks.read', 'field_tasks', 'read', 'Melihat dan mengerjakan to-do list tugas lapangan yang ditugaskan'),
  ('field_tasks.manage', 'field_tasks', 'manage', 'Membuat, menugaskan, dan membatalkan tugas lapangan')
ON CONFLICT (key) DO UPDATE SET resource = excluded.resource, action = excluded.action, description = excluded.description, updated_at = now();
--> statement-breakpoint

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('field_tasks.read','field_tasks.manage')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner','organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key = 'field_tasks.read'
WHERE role.organization_id IS NULL AND role.key IN ('field_officer','auditor')
ON CONFLICT (role_id, permission_id) DO NOTHING;
