-- Registri penerima manfaat terpadu:
-- profil lengkap penerima (sosial-ekonomi, kategori/asnaf, wali, rekening,
-- kontak darurat, lembaga pendamping) di atas crm_beneficiary_profiles.
-- Nomor identitas tetap di crm_sensitive_identities (hanya 4 digit terakhir
-- dan hash untuk deteksi duplikat; plaintext tidak disimpan).

ALTER TABLE public.crm_beneficiary_profiles
  ADD COLUMN IF NOT EXISTS birth_place text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS monthly_income numeric(20,2),
  ADD COLUMN IF NOT EXISTS dependents_count integer,
  ADD COLUMN IF NOT EXISTS housing_status text,
  ADD COLUMN IF NOT EXISTS disability_status text,
  ADD COLUMN IF NOT EXISTS health_notes text,
  ADD COLUMN IF NOT EXISTS asnaf_category text,
  ADD COLUMN IF NOT EXISTS beneficiary_categories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_relation text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS referral_partner_contact_id uuid,
  ADD COLUMN IF NOT EXISTS registration_source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS updated_by uuid;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_beneficiary_profiles_marital_check') THEN
    ALTER TABLE public.crm_beneficiary_profiles
      ADD CONSTRAINT crm_beneficiary_profiles_marital_check CHECK (
        marital_status IS NULL OR marital_status IN ('single','married','divorced','widowed')
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_education_check CHECK (
        education_level IS NULL OR education_level IN ('none','sd','smp','sma','diploma','s1','s2_plus')
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_housing_check CHECK (
        housing_status IS NULL OR housing_status IN ('own','rent','family','official','free_use','none')
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_disability_check CHECK (
        disability_status IS NULL OR disability_status IN ('none','physical','sensory','intellectual','mental','multiple')
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_asnaf_check CHECK (
        asnaf_category IS NULL OR asnaf_category IN ('fakir','miskin','amil','muallaf','riqab','gharimin','fisabilillah','ibnu_sabil')
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_categories_check CHECK (
        beneficiary_categories <@ ARRAY[
          'yatim','piatu','yatim_piatu','dhuafa','lansia','disabilitas','janda',
          'santri','pelajar','mahasiswa','guru_ngaji','dai','mualaf',
          'korban_bencana','pasien','ibnu_sabil','lainnya'
        ]::text[]
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_numbers_check CHECK (
        (monthly_income IS NULL OR monthly_income >= 0)
        AND (dependents_count IS NULL OR dependents_count >= 0)
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_source_check CHECK (
        registration_source IN ('admin','application','partner','program','import')
      ),
      ADD CONSTRAINT crm_beneficiary_profiles_referral_fkey FOREIGN KEY (referral_partner_contact_id, organization_id)
        REFERENCES public.crm_contacts(id, organization_id) ON DELETE RESTRICT,
      ADD CONSTRAINT crm_beneficiary_profiles_updated_by_fkey FOREIGN KEY (updated_by)
        REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint

-- Kartu keluarga dicatat sebagai identitas sensitif tersendiri.
ALTER TABLE public.crm_sensitive_identities
  DROP CONSTRAINT IF EXISTS crm_sensitive_identities_identity_type_check;
ALTER TABLE public.crm_sensitive_identities
  ADD CONSTRAINT crm_sensitive_identities_identity_type_check CHECK (
    identity_type = ANY (ARRAY['nik','family_card','passport','kitab','tax_id','other']::text[])
  );
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_crm_sensitive_identities_org_hash
  ON public.crm_sensitive_identities (organization_id, identity_type, identity_hash);
CREATE INDEX IF NOT EXISTS idx_crm_beneficiary_profiles_org_status
  ON public.crm_beneficiary_profiles (organization_id, status, vulnerability_level);
CREATE INDEX IF NOT EXISTS idx_beneficiary_cases_org_contact
  ON public.beneficiary_cases (organization_id, beneficiary_contact_id);
CREATE INDEX IF NOT EXISTS idx_distribution_plans_org_beneficiary
  ON public.distribution_plans (organization_id, beneficiary_contact_id, status);
CREATE INDEX IF NOT EXISTS idx_program_fulfillments_org_beneficiary
  ON public.program_beneficiary_fulfillments (organization_id, beneficiary_contact_id);
CREATE INDEX IF NOT EXISTS idx_waqf_benefits_org_beneficiary
  ON public.waqf_benefit_distributions (organization_id, beneficiary_contact_id);
CREATE INDEX IF NOT EXISTS idx_kafalah_needs_org_beneficiary
  ON public.kafalah_needs (organization_id, beneficiary_contact_id);
--> statement-breakpoint

-- Admin perlu mencatat nomor identitas (hanya 4 digit terakhir + hash).
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT NULL, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'crm_sensitive_identities.read',
  'crm_sensitive_identities.manage'
)
WHERE role.organization_id IS NULL AND role.key = 'organization_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;
