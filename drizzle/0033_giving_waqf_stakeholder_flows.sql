-- Penghimpunan & wakaf terpadu:
-- 1. klasifikasi wakaf (peruntukan, jangka waktu, skema penghimpunan);
-- 2. setoran wakif (wakaf uang, wakaf melalui uang/patungan, wakaf benda);
-- 3. pengajuan program wakaf oleh individu atau lembaga;
-- 4. donasi barang (in-kind) yang masuk stok melalui inventory_movements;
-- 5. identitas pengaju lembaga/individu dan lembaga mitra pengaju pada pengajuan bantuan.

-- ---------------------------------------------------------------------------
-- 1. Klasifikasi aset wakaf
-- ---------------------------------------------------------------------------
ALTER TABLE public.waqf_assets
  ADD COLUMN waqf_purpose text NOT NULL DEFAULT 'khairi',
  ADD COLUMN waqf_duration text NOT NULL DEFAULT 'permanent',
  ADD COLUMN duration_end_date date,
  ADD COLUMN collection_scheme text NOT NULL DEFAULT 'direct_asset',
  ADD COLUMN designation text,
  ADD COLUMN pledge_date date,
  ADD COLUMN fundraising_target numeric(20,2);
--> statement-breakpoint

ALTER TABLE public.waqf_assets
  DROP CONSTRAINT waqf_assets_type_check;
--> statement-breakpoint

ALTER TABLE public.waqf_assets
  ADD CONSTRAINT waqf_assets_type_check CHECK (asset_type IN (
    'land','building','cash','productive_asset','vehicle','equipment',
    'precious_metal','securities','rights','other'
  )),
  ADD CONSTRAINT waqf_assets_purpose_check CHECK (waqf_purpose IN ('khairi','ahli','musytarak')),
  ADD CONSTRAINT waqf_assets_duration_check CHECK (
    (waqf_duration = 'permanent' AND duration_end_date IS NULL)
    OR (waqf_duration = 'temporary' AND duration_end_date IS NOT NULL)
  ),
  ADD CONSTRAINT waqf_assets_collection_scheme_check CHECK (
    collection_scheme IN ('direct_asset','cash_waqf','cash_for_asset','productive')
  ),
  ADD CONSTRAINT waqf_assets_fundraising_target_check CHECK (
    fundraising_target IS NULL OR fundraising_target > 0
  );
--> statement-breakpoint

-- Wakaf uang lama dipetakan ke skema wakaf uang agar pokok tetap terjaga.
UPDATE public.waqf_assets SET collection_scheme = 'cash_waqf' WHERE asset_type = 'cash';
UPDATE public.waqf_assets SET collection_scheme = 'productive' WHERE asset_type = 'productive_asset';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. Setoran wakif
-- ---------------------------------------------------------------------------
CREATE TABLE public.waqf_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  reference_number text NOT NULL,
  wakif_contact_id uuid,
  wakif_name text NOT NULL,
  on_behalf_of text,
  contribution_form text NOT NULL,
  amount numeric(20,2) NOT NULL,
  currency char(3) DEFAULT 'IDR' NOT NULL,
  payment_method text NOT NULL,
  received_at timestamptz NOT NULL,
  pledge_confirmed boolean DEFAULT false NOT NULL,
  certificate_number text,
  notes text,
  status text DEFAULT 'received' NOT NULL,
  reversal_reason text,
  reversed_by uuid,
  reversed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_contributions_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT waqf_contributions_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_contributions_wakif_name_check CHECK (length(trim(wakif_name)) >= 2),
  CONSTRAINT waqf_contributions_form_check CHECK (contribution_form IN ('cash','goods','land','building','precious_metal','other')),
  CONSTRAINT waqf_contributions_amount_check CHECK (amount > 0),
  CONSTRAINT waqf_contributions_payment_check CHECK (payment_method IN ('cash','bank_transfer','qris','e_wallet','payroll','in_kind','other')),
  CONSTRAINT waqf_contributions_status_check CHECK (status IN ('received','reversed')),
  CONSTRAINT waqf_contributions_reversal_check CHECK (
    (status = 'received' AND reversed_by IS NULL AND reversed_at IS NULL)
    OR (status = 'reversed' AND reversed_by IS NOT NULL AND reversed_at IS NOT NULL
        AND length(trim(coalesce(reversal_reason, ''))) >= 10)
  ),
  CONSTRAINT waqf_contributions_asset_fkey FOREIGN KEY (asset_id, organization_id)
    REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT waqf_contributions_wakif_fkey FOREIGN KEY (wakif_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT waqf_contributions_org_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT waqf_contributions_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT waqf_contributions_reversed_by_fkey FOREIGN KEY (reversed_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. Pengajuan program wakaf
-- ---------------------------------------------------------------------------
CREATE TABLE public.waqf_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  proposal_type text NOT NULL,
  proposer_type text NOT NULL,
  proposer_contact_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  asset_id uuid,
  proposed_asset_type text,
  requested_amount numeric(20,2),
  currency char(3) DEFAULT 'IDR' NOT NULL,
  location_text text,
  beneficiary_estimate integer,
  status text DEFAULT 'draft' NOT NULL,
  submitted_at timestamptz,
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  converted_asset_id uuid,
  converted_utilization_id uuid,
  converted_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT waqf_proposals_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT waqf_proposals_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT waqf_proposals_type_check CHECK (proposal_type IN ('waqf_project','benefit_request','asset_offer')),
  CONSTRAINT waqf_proposals_proposer_type_check CHECK (proposer_type IN ('individual','institution')),
  CONSTRAINT waqf_proposals_title_check CHECK (length(trim(title)) >= 5),
  CONSTRAINT waqf_proposals_description_check CHECK (length(trim(description)) >= 20),
  CONSTRAINT waqf_proposals_asset_type_check CHECK (proposed_asset_type IS NULL OR proposed_asset_type IN (
    'land','building','cash','productive_asset','vehicle','equipment',
    'precious_metal','securities','rights','other'
  )),
  CONSTRAINT waqf_proposals_amount_check CHECK (requested_amount IS NULL OR requested_amount > 0),
  CONSTRAINT waqf_proposals_beneficiary_check CHECK (beneficiary_estimate IS NULL OR beneficiary_estimate > 0),
  CONSTRAINT waqf_proposals_benefit_asset_check CHECK (proposal_type <> 'benefit_request' OR asset_id IS NOT NULL),
  CONSTRAINT waqf_proposals_status_check CHECK (status IN ('draft','submitted','under_review','approved','rejected','converted','cancelled')),
  CONSTRAINT waqf_proposals_review_check CHECK (
    status NOT IN ('approved','rejected','converted')
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND length(trim(coalesce(review_notes, ''))) >= 10)
  ),
  CONSTRAINT waqf_proposals_org_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT waqf_proposals_proposer_fkey FOREIGN KEY (proposer_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT waqf_proposals_asset_fkey FOREIGN KEY (asset_id, organization_id)
    REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT waqf_proposals_converted_asset_fkey FOREIGN KEY (converted_asset_id, organization_id)
    REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT waqf_proposals_converted_utilization_fkey FOREIGN KEY (converted_utilization_id, organization_id)
    REFERENCES public.waqf_utilizations(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT waqf_proposals_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CONSTRAINT waqf_proposals_updated_by_fkey FOREIGN KEY (updated_by)
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT waqf_proposals_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. Donasi barang (in-kind)
-- ---------------------------------------------------------------------------
CREATE TABLE public.in_kind_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  reference_number text NOT NULL,
  donor_contact_id uuid,
  donor_name text NOT NULL,
  donor_type text NOT NULL,
  giving_type text NOT NULL,
  program_id uuid,
  waqf_asset_id uuid,
  warehouse_id uuid NOT NULL,
  received_at timestamptz NOT NULL,
  estimated_total_value numeric(20,2) DEFAULT 0 NOT NULL,
  currency char(3) DEFAULT 'IDR' NOT NULL,
  notes text,
  status text DEFAULT 'received' NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT in_kind_donations_org_reference_unique UNIQUE (organization_id, reference_number),
  CONSTRAINT in_kind_donations_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT in_kind_donations_donor_name_check CHECK (length(trim(donor_name)) >= 2),
  CONSTRAINT in_kind_donations_donor_type_check CHECK (donor_type IN ('individual','institution','anonymous')),
  CONSTRAINT in_kind_donations_giving_type_check CHECK (giving_type IN ('infaq','sedekah','zakat','waqf','hibah','csr','other')),
  CONSTRAINT in_kind_donations_waqf_link_check CHECK (giving_type = 'waqf' OR waqf_asset_id IS NULL),
  CONSTRAINT in_kind_donations_value_check CHECK (estimated_total_value >= 0),
  CONSTRAINT in_kind_donations_status_check CHECK (status IN ('received')),
  CONSTRAINT in_kind_donations_org_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  CONSTRAINT in_kind_donations_donor_fkey FOREIGN KEY (donor_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT in_kind_donations_program_fkey FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT in_kind_donations_waqf_asset_fkey FOREIGN KEY (waqf_asset_id, organization_id)
    REFERENCES public.waqf_assets(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT in_kind_donations_warehouse_fkey FOREIGN KEY (warehouse_id, organization_id)
    REFERENCES public.inventory_warehouses(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT in_kind_donations_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);
--> statement-breakpoint

CREATE TABLE public.in_kind_donation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  donation_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric(20,4) NOT NULL,
  unit text NOT NULL,
  unit_value numeric(20,2) DEFAULT 0 NOT NULL,
  item_condition text DEFAULT 'new' NOT NULL,
  batch_number text,
  expires_at date,
  movement_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT in_kind_donation_items_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT in_kind_donation_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT in_kind_donation_items_unit_check CHECK (length(trim(unit)) >= 1),
  CONSTRAINT in_kind_donation_items_value_check CHECK (unit_value >= 0),
  CONSTRAINT in_kind_donation_items_condition_check CHECK (item_condition IN ('new','good_used','needs_repair')),
  CONSTRAINT in_kind_donation_items_donation_fkey FOREIGN KEY (donation_id, organization_id)
    REFERENCES public.in_kind_donations(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT in_kind_donation_items_product_fkey FOREIGN KEY (product_id, organization_id)
    REFERENCES public.inventory_products(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT in_kind_donation_items_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id) ON DELETE RESTRICT
);
--> statement-breakpoint

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT inventory_movements_source_check;
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_source_check CHECK (source_type IN (
    'goods_receipt','inventory_adjustment','stock_transfer','distribution',
    'reservation','aid_package_packing','in_kind_donation'
  ));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. Identitas pengaju pada pengajuan bantuan
-- ---------------------------------------------------------------------------
ALTER TABLE public.aid_applications
  ADD COLUMN submitter_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN submitting_partner_contact_id uuid,
  ADD COLUMN beneficiary_count integer NOT NULL DEFAULT 1,
  ADD COLUMN requested_amount numeric(20,2);
--> statement-breakpoint

ALTER TABLE public.aid_applications
  ADD CONSTRAINT aid_applications_submitter_type_check CHECK (
    submitter_type IN ('individual','institution','partner_on_behalf')
  ),
  ADD CONSTRAINT aid_applications_partner_submitter_check CHECK (
    (submitter_type = 'partner_on_behalf' AND submitting_partner_contact_id IS NOT NULL)
    OR (submitter_type <> 'partner_on_behalf' AND submitting_partner_contact_id IS NULL)
  ),
  ADD CONSTRAINT aid_applications_beneficiary_count_check CHECK (beneficiary_count > 0),
  ADD CONSTRAINT aid_applications_requested_amount_check CHECK (requested_amount IS NULL OR requested_amount > 0),
  ADD CONSTRAINT aid_applications_submitting_partner_fkey FOREIGN KEY (submitting_partner_contact_id, organization_id)
    REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT;
--> statement-breakpoint

-- Pengajuan lama melalui kanal mitra tetap valid tanpa penanda lembaga.
UPDATE public.aid_applications application
SET submitter_type = 'institution'
FROM public.crm_contacts contact
WHERE contact.id = application.applicant_contact_id
  AND contact.organization_id = application.organization_id
  AND contact.contact_type = 'institution';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Indeks
-- ---------------------------------------------------------------------------
CREATE INDEX idx_waqf_contributions_asset ON public.waqf_contributions (organization_id, asset_id, received_at DESC);
CREATE INDEX idx_waqf_contributions_wakif ON public.waqf_contributions (organization_id, wakif_contact_id, status);
CREATE INDEX idx_waqf_proposals_status ON public.waqf_proposals (organization_id, status, created_at DESC);
CREATE INDEX idx_waqf_proposals_proposer ON public.waqf_proposals (organization_id, proposer_contact_id);
CREATE INDEX idx_in_kind_donations_org_received ON public.in_kind_donations (organization_id, received_at DESC);
CREATE INDEX idx_in_kind_donations_donor ON public.in_kind_donations (organization_id, donor_contact_id);
CREATE INDEX idx_in_kind_donations_program ON public.in_kind_donations (organization_id, program_id);
CREATE INDEX idx_in_kind_donation_items_donation ON public.in_kind_donation_items (organization_id, donation_id);
CREATE INDEX idx_aid_applications_submitting_partner ON public.aid_applications (organization_id, submitting_partner_contact_id);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.waqf_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waqf_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_kind_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_kind_donation_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY waqf_contributions_select ON public.waqf_contributions FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf.read'));
CREATE POLICY waqf_contributions_insert ON public.waqf_contributions FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_contributions.record') AND created_by = private.current_profile_id());
CREATE POLICY waqf_contributions_update ON public.waqf_contributions FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_contributions.reverse'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_contributions.reverse'));
CREATE POLICY waqf_contributions_delete ON public.waqf_contributions FOR DELETE TO app_runtime USING (false);

CREATE POLICY waqf_proposals_select ON public.waqf_proposals FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf.read'));
CREATE POLICY waqf_proposals_insert ON public.waqf_proposals FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'waqf_proposals.manage') AND created_by = private.current_profile_id());
CREATE POLICY waqf_proposals_update ON public.waqf_proposals FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'waqf_proposals.manage') OR private.has_permission(organization_id, 'waqf_proposals.review')))
  WITH CHECK (private.has_active_membership(organization_id) AND (private.has_permission(organization_id, 'waqf_proposals.manage') OR private.has_permission(organization_id, 'waqf_proposals.review')));
CREATE POLICY waqf_proposals_delete ON public.waqf_proposals FOR DELETE TO app_runtime USING (false);

CREATE POLICY in_kind_donations_select ON public.in_kind_donations FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'in_kind_donations.read'));
CREATE POLICY in_kind_donations_insert ON public.in_kind_donations FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'in_kind_donations.receive') AND created_by = private.current_profile_id());
CREATE POLICY in_kind_donations_update ON public.in_kind_donations FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY in_kind_donations_delete ON public.in_kind_donations FOR DELETE TO app_runtime USING (false);

CREATE POLICY in_kind_donation_items_select ON public.in_kind_donation_items FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'in_kind_donations.read'));
CREATE POLICY in_kind_donation_items_insert ON public.in_kind_donation_items FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'in_kind_donations.receive') AND created_by = private.current_profile_id());
CREATE POLICY in_kind_donation_items_update ON public.in_kind_donation_items FOR UPDATE TO app_runtime USING (false) WITH CHECK (false);
CREATE POLICY in_kind_donation_items_delete ON public.in_kind_donation_items FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.waqf_contributions, public.waqf_proposals TO app_runtime;
GRANT SELECT, INSERT ON public.in_kind_donations, public.in_kind_donation_items TO app_runtime;
--> statement-breakpoint

CREATE TRIGGER trg_waqf_contributions_touch BEFORE UPDATE ON public.waqf_contributions
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
CREATE TRIGGER trg_waqf_proposals_touch BEFORE UPDATE ON public.waqf_proposals
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();

CREATE OR REPLACE FUNCTION private.prevent_in_kind_donation_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Donasi barang bersifat append-only; koreksi stok melalui adjustment inventory';
END $$;
CREATE TRIGGER trg_in_kind_donations_append_only BEFORE UPDATE OR DELETE ON public.in_kind_donations
  FOR EACH ROW EXECUTE FUNCTION private.prevent_in_kind_donation_mutation();
CREATE TRIGGER trg_in_kind_donation_items_append_only BEFORE UPDATE OR DELETE ON public.in_kind_donation_items
  FOR EACH ROW EXECUTE FUNCTION private.prevent_in_kind_donation_mutation();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Permission
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions (key, resource, action, description) VALUES
  ('waqf_contributions.record', 'waqf_contributions', 'record', 'Mencatat setoran wakif (wakaf uang, melalui uang, atau benda)'),
  ('waqf_contributions.reverse', 'waqf_contributions', 'reverse', 'Membatalkan setoran wakif dengan alasan tercatat'),
  ('waqf_proposals.manage', 'waqf_proposals', 'manage', 'Mencatat dan mengajukan program wakaf dari individu atau lembaga'),
  ('waqf_proposals.review', 'waqf_proposals', 'review', 'Menilai, menyetujui, dan mengonversi pengajuan program wakaf'),
  ('in_kind_donations.read', 'in_kind_donations', 'read', 'Melihat donasi barang dan tanda terimanya'),
  ('in_kind_donations.receive', 'in_kind_donations', 'receive', 'Menerima donasi barang dan memasukkannya ke stok gudang'),
  ('stakeholder_reports.read', 'stakeholder_reports', 'read', 'Melihat laporan donatur, wakif, mitra, dan pengaju')
ON CONFLICT (key) DO UPDATE SET resource = excluded.resource, action = excluded.action, description = excluded.description, updated_at = now();
--> statement-breakpoint

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'waqf_contributions.record', 'waqf_contributions.reverse',
  'waqf_proposals.manage', 'waqf_proposals.review',
  'in_kind_donations.read', 'in_kind_donations.receive',
  'stakeholder_reports.read'
)
WHERE role.organization_id IS NULL AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'waqf_contributions.record',
  'waqf_proposals.manage',
  'in_kind_donations.read', 'in_kind_donations.receive'
)
WHERE role.organization_id IS NULL AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'in_kind_donations.read', 'stakeholder_reports.read'
)
WHERE role.organization_id IS NULL AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
