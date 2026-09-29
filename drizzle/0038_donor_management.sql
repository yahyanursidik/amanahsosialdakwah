-- Pengelolaan donatur & wakif: profil relasi (segmen, minat, komitmen rutin,
-- preferensi komunikasi/laporan, PIC) dan status tindak lanjut interaksi.
-- Riwayat pemberian tetap dihitung dari transaksi sumber (dana, barang,
-- wakaf, kafalah) sehingga tidak ada angka ganda.

CREATE TABLE IF NOT EXISTS public.crm_donor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  segment text NOT NULL DEFAULT 'regular',
  acquisition_source text,
  preferred_channel text NOT NULL DEFAULT 'whatsapp',
  giving_interests text[] NOT NULL DEFAULT '{}'::text[],
  recurring_amount numeric(20,2),
  recurring_frequency text NOT NULL DEFAULT 'none',
  recurring_day integer,
  receipt_preference text NOT NULL DEFAULT 'whatsapp',
  report_preference text NOT NULL DEFAULT 'quarterly',
  publish_name boolean NOT NULL DEFAULT true,
  relationship_manager_id uuid,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_donor_profiles_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT crm_donor_profiles_contact_unique UNIQUE (contact_id, organization_id),
  CONSTRAINT crm_donor_profiles_segment_check CHECK (segment IN ('prospect','regular','major','corporate','community')),
  CONSTRAINT crm_donor_profiles_source_check CHECK (acquisition_source IS NULL OR acquisition_source IN ('referral','event','social_media','website','walk_in','partner','campaign','other')),
  CONSTRAINT crm_donor_profiles_channel_check CHECK (preferred_channel IN ('whatsapp','phone','email','letter','none')),
  CONSTRAINT crm_donor_profiles_interests_check CHECK (giving_interests <@ ARRAY['zakat','infaq','sedekah','wakaf','kafalah','in_kind','emergency','education','health','dakwah']::text[]),
  CONSTRAINT crm_donor_profiles_recurring_check CHECK (
    (recurring_frequency = 'none' AND recurring_amount IS NULL)
    OR (recurring_frequency IN ('monthly','quarterly','yearly') AND recurring_amount > 0)
  ),
  CONSTRAINT crm_donor_profiles_day_check CHECK (recurring_day IS NULL OR recurring_day BETWEEN 1 AND 31),
  CONSTRAINT crm_donor_profiles_receipt_check CHECK (receipt_preference IN ('none','whatsapp','email','print')),
  CONSTRAINT crm_donor_profiles_report_check CHECK (report_preference IN ('none','per_gift','monthly','quarterly','yearly')),
  CONSTRAINT crm_donor_profiles_status_check CHECK (status IN ('active','inactive')),
  CONSTRAINT crm_donor_profiles_contact_fkey FOREIGN KEY (contact_id, organization_id) REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT crm_donor_profiles_manager_fkey FOREIGN KEY (relationship_manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT crm_donor_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT crm_donor_profiles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
--> statement-breakpoint

ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS follow_up_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS follow_up_done_at timestamptz;
ALTER TABLE public.crm_interactions ADD COLUMN IF NOT EXISTS follow_up_assigned_to uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_interactions_follow_up_status_check') THEN
    ALTER TABLE public.crm_interactions
      ADD CONSTRAINT crm_interactions_follow_up_status_check CHECK (follow_up_status IN ('none','open','done'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_interactions_follow_up_assignee_fkey') THEN
    ALTER TABLE public.crm_interactions
      ADD CONSTRAINT crm_interactions_follow_up_assignee_fkey FOREIGN KEY (follow_up_assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint

UPDATE public.crm_interactions
SET follow_up_status = 'open'
WHERE follow_up_at IS NOT NULL AND follow_up_status = 'none';
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_crm_donor_profiles_org ON public.crm_donor_profiles (organization_id, segment, status);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact ON public.crm_interactions (organization_id, contact_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_follow_up ON public.crm_interactions (organization_id, follow_up_status, follow_up_at);
CREATE INDEX IF NOT EXISTS idx_fund_receipts_donor ON public.fund_receipts (organization_id, donor_contact_id, received_at);
CREATE INDEX IF NOT EXISTS idx_waqf_contributions_wakif ON public.waqf_contributions (organization_id, wakif_contact_id, received_at);
--> statement-breakpoint

ALTER TABLE public.crm_donor_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS crm_donor_profiles_select ON public.crm_donor_profiles;
CREATE POLICY crm_donor_profiles_select ON public.crm_donor_profiles FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'donors.read'));
DROP POLICY IF EXISTS crm_donor_profiles_insert ON public.crm_donor_profiles;
CREATE POLICY crm_donor_profiles_insert ON public.crm_donor_profiles FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'donors.manage') AND created_by = private.current_profile_id());
DROP POLICY IF EXISTS crm_donor_profiles_update ON public.crm_donor_profiles;
CREATE POLICY crm_donor_profiles_update ON public.crm_donor_profiles FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'donors.manage'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'donors.manage'));
DROP POLICY IF EXISTS crm_donor_profiles_delete ON public.crm_donor_profiles;
CREATE POLICY crm_donor_profiles_delete ON public.crm_donor_profiles FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.crm_donor_profiles TO app_runtime;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_crm_donor_profiles_touch ON public.crm_donor_profiles;
CREATE TRIGGER trg_crm_donor_profiles_touch BEFORE UPDATE ON public.crm_donor_profiles
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('donors.read', 'donors', 'read', 'Melihat registri donatur & wakif beserta riwayat pemberiannya'),
  ('donors.manage', 'donors', 'manage', 'Mengelola profil donatur & wakif, PIC, dan komitmen rutin')
ON CONFLICT (key) DO UPDATE SET resource = excluded.resource, action = excluded.action, description = excluded.description, updated_at = now();
--> statement-breakpoint

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN ('donors.read','donors.manage')
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner','organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key = 'donors.read'
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
