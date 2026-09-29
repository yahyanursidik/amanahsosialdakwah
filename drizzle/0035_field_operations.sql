-- Operasional lapangan: penugasan petugas pengirim pada shipment, laporan
-- lapangan (GPS, foto, verifikasi penerima, penyaluran, insiden) yang dapat
-- dikirim ulang secara aman dari perangkat offline, dan review supervisor.

ALTER TABLE public.logistics_shipments
  ADD COLUMN IF NOT EXISTS assigned_profile_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logistics_shipments_assigned_profile_fkey') THEN
    ALTER TABLE public.logistics_shipments
      ADD CONSTRAINT logistics_shipments_assigned_profile_fkey FOREIGN KEY (assigned_profile_id)
        REFERENCES public.profiles(id) ON DELETE RESTRICT,
      ADD CONSTRAINT logistics_shipments_assigned_by_fkey FOREIGN KEY (assigned_by)
        REFERENCES public.profiles(id) ON DELETE RESTRICT,
      ADD CONSTRAINT logistics_shipments_assignment_check CHECK (
        (assigned_profile_id IS NULL AND assigned_at IS NULL)
        OR (assigned_profile_id IS NOT NULL AND assigned_at IS NOT NULL)
      );
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  report_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  program_id uuid,
  distribution_plan_id uuid,
  shipment_id uuid,
  case_id uuid,
  application_id uuid,
  beneficiary_contact_id uuid,
  waqf_asset_id uuid,
  beneficiaries_reached integer,
  packages_delivered integer,
  amount_distributed numeric(20,2),
  verification_result text,
  verification_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  household_size_observed integer,
  issues text,
  follow_up_needed boolean NOT NULL DEFAULT false,
  severity text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  location_accuracy_m numeric(10,2),
  location_text text,
  occurred_at timestamptz NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  client_reference text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_reports_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT field_reports_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT field_reports_client_reference_unique UNIQUE (organization_id, created_by, client_reference),
  CONSTRAINT field_reports_type_check CHECK (report_type IN (
    'distribution','delivery','verification_visit','monitoring','situation','incident'
  )),
  CONSTRAINT field_reports_title_check CHECK (length(trim(title)) >= 5),
  CONSTRAINT field_reports_summary_check CHECK (length(trim(summary)) >= 10),
  CONSTRAINT field_reports_numbers_check CHECK (
    (beneficiaries_reached IS NULL OR beneficiaries_reached >= 0)
    AND (packages_delivered IS NULL OR packages_delivered >= 0)
    AND (amount_distributed IS NULL OR amount_distributed >= 0)
    AND (household_size_observed IS NULL OR household_size_observed > 0)
  ),
  CONSTRAINT field_reports_verification_check CHECK (
    (report_type <> 'verification_visit')
    OR (verification_result IN ('eligible','not_eligible','needs_review','not_found','moved')
        AND beneficiary_contact_id IS NOT NULL)
  ),
  CONSTRAINT field_reports_severity_check CHECK (
    severity IS NULL OR severity IN ('low','medium','high','critical')
  ),
  CONSTRAINT field_reports_incident_check CHECK (report_type <> 'incident' OR severity IS NOT NULL),
  CONSTRAINT field_reports_location_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  ),
  CONSTRAINT field_reports_client_reference_check CHECK (length(client_reference) BETWEEN 8 AND 120),
  CONSTRAINT field_reports_status_check CHECK (status IN ('submitted','reviewed','follow_up','rejected')),
  CONSTRAINT field_reports_review_check CHECK (
    (status = 'submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status <> 'submitted' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
        AND length(trim(coalesce(review_notes, ''))) >= 10)
  ),
  CONSTRAINT field_reports_org_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_program_fkey FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_distribution_fkey FOREIGN KEY (distribution_plan_id, organization_id)
    REFERENCES public.distribution_plans(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_shipment_fkey FOREIGN KEY (shipment_id, organization_id)
    REFERENCES public.logistics_shipments(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_case_fkey FOREIGN KEY (case_id, organization_id)
    REFERENCES public.beneficiary_cases(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_application_fkey FOREIGN KEY (application_id, organization_id)
    REFERENCES public.aid_applications(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_beneficiary_fkey FOREIGN KEY (beneficiary_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_waqf_asset_fkey FOREIGN KEY (waqf_asset_id, organization_id)
    REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT field_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);
--> statement-breakpoint

-- Foto dikompres di perangkat. Disimpan terbatas di database sampai
-- penyimpanan objek (S3) production dikonfigurasi.
CREATE TABLE IF NOT EXISTS public.field_report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  report_id uuid NOT NULL,
  sequence_number integer NOT NULL,
  mime_type text NOT NULL,
  byte_size integer NOT NULL,
  width integer,
  height integer,
  caption text,
  data bytea NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_report_photos_sequence_unique UNIQUE (report_id, sequence_number),
  CONSTRAINT field_report_photos_sequence_check CHECK (sequence_number BETWEEN 1 AND 4),
  CONSTRAINT field_report_photos_mime_check CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  CONSTRAINT field_report_photos_size_check CHECK (byte_size > 0 AND byte_size <= 600000 AND octet_length(data) = byte_size),
  CONSTRAINT field_report_photos_report_fkey FOREIGN KEY (report_id, organization_id)
    REFERENCES public.field_reports(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT field_report_photos_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_field_reports_org_status ON public.field_reports (organization_id, status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_reports_org_creator ON public.field_reports (organization_id, created_by, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_reports_distribution ON public.field_reports (organization_id, distribution_plan_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_beneficiary ON public.field_reports (organization_id, beneficiary_contact_id);
CREATE INDEX IF NOT EXISTS idx_field_report_photos_report ON public.field_report_photos (organization_id, report_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_assignee ON public.logistics_shipments (organization_id, assigned_profile_id, status);
--> statement-breakpoint

ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_report_photos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS field_reports_select ON public.field_reports;
CREATE POLICY field_reports_select ON public.field_reports FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_reports.read'));
DROP POLICY IF EXISTS field_reports_insert ON public.field_reports;
CREATE POLICY field_reports_insert ON public.field_reports FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_reports.submit') AND created_by = private.current_profile_id());
DROP POLICY IF EXISTS field_reports_update ON public.field_reports;
CREATE POLICY field_reports_update ON public.field_reports FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_reports.review'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_reports.review'));
DROP POLICY IF EXISTS field_reports_delete ON public.field_reports;
CREATE POLICY field_reports_delete ON public.field_reports FOR DELETE TO app_runtime USING (false);

DROP POLICY IF EXISTS field_report_photos_select ON public.field_report_photos;
CREATE POLICY field_report_photos_select ON public.field_report_photos FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_reports.read'));
DROP POLICY IF EXISTS field_report_photos_insert ON public.field_report_photos;
CREATE POLICY field_report_photos_insert ON public.field_report_photos FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'field_reports.submit') AND created_by = private.current_profile_id());
DROP POLICY IF EXISTS field_report_photos_update ON public.field_report_photos;
CREATE POLICY field_report_photos_update ON public.field_report_photos FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS field_report_photos_delete ON public.field_report_photos;
CREATE POLICY field_report_photos_delete ON public.field_report_photos FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.field_reports TO app_runtime;
GRANT SELECT, INSERT ON public.field_report_photos TO app_runtime;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_field_reports_touch ON public.field_reports;
CREATE TRIGGER trg_field_reports_touch BEFORE UPDATE ON public.field_reports
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('field_reports.read', 'field_reports', 'read', 'Melihat tugas dan laporan lapangan'),
  ('field_reports.submit', 'field_reports', 'submit', 'Mengirim laporan lapangan (GPS, foto, verifikasi, penyaluran, insiden)'),
  ('field_reports.review', 'field_reports', 'review', 'Mereview laporan lapangan dan menindaklanjuti hasil verifikasi')
ON CONFLICT (key) DO UPDATE SET resource = excluded.resource, action = excluded.action, description = excluded.description, updated_at = now();
--> statement-breakpoint

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('field_reports.read','field_reports.submit','field_reports.review')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner','organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('field_reports.read','field_reports.submit')
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key = 'field_reports.read'
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
