create table if not exists public.program_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_categories_unique_code unique (organization_id, code),
  constraint program_categories_status_check check (status in ('active', 'inactive'))
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category_id uuid references public.program_categories(id) on delete restrict,
  description text,
  objective text,
  target_beneficiary_type text not null,
  target_beneficiary_count integer,
  budget_amount numeric(18, 2) not null default 0,
  allocated_amount numeric(18, 2) not null default 0,
  disbursed_amount numeric(18, 2) not null default 0,
  fund_type text not null,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  owner_id uuid references public.profiles(id) on delete set null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_unique_org_code unique (organization_id, code),
  constraint programs_status_check check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  constraint programs_fund_type_check check (fund_type in ('zakat', 'infaq', 'sedekah', 'waqf', 'humanitarian', 'education', 'health', 'general')),
  constraint programs_target_type_check check (target_beneficiary_type in ('individual', 'family', 'institution', 'community', 'disaster_area', 'mosque', 'school'))
);

create table if not exists public.program_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  action_type text not null,
  change_summary text not null,
  reason text,
  previous_values jsonb,
  new_values jsonb,
  performed_by uuid references public.profiles(id) on delete set null,
  performed_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_type text not null,
  display_name text not null,
  legal_name text,
  normalized_name text not null,
  primary_email text,
  normalized_email text,
  primary_phone text,
  normalized_phone text,
  whatsapp_phone text,
  gender text,
  birth_date date,
  address_line text,
  village text,
  district text,
  city text,
  province text,
  postal_code text,
  status text not null default 'active',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contacts_contact_type_check check (contact_type in ('person', 'institution')),
  constraint crm_contacts_gender_check check (gender is null or gender in ('male', 'female', 'unknown')),
  constraint crm_contacts_status_check check (status in ('active', 'inactive', 'deceased', 'archived'))
);

create table if not exists public.crm_contact_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  role_type text not null,
  status text not null default 'active',
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contact_roles_unique unique (organization_id, contact_id, role_type),
  constraint crm_contact_roles_role_type_check check (role_type in ('donor', 'kafil', 'volunteer', 'beneficiary')),
  constraint crm_contact_roles_status_check check (status in ('active', 'inactive', 'paused', 'ended'))
);

create table if not exists public.crm_sensitive_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  identity_type text not null,
  identity_ciphertext_ref text not null,
  identity_last4 text,
  identity_hash text,
  verification_status text not null default 'unverified',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_sensitive_identities_identity_type_check check (identity_type in ('nik', 'passport', 'kitab', 'tax_id', 'other')),
  constraint crm_sensitive_identities_status_check check (verification_status in ('unverified', 'verified', 'rejected', 'expired'))
);

create table if not exists public.crm_beneficiary_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  beneficiary_type text not null,
  vulnerability_level text not null,
  household_size integer,
  income_range text,
  assessment_status text not null default 'not_assessed',
  status text not null default 'active',
  eligibility_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_beneficiary_profiles_unique unique (organization_id, contact_id),
  constraint crm_beneficiary_profiles_type_check check (beneficiary_type in ('individual', 'family', 'institution', 'community')),
  constraint crm_beneficiary_profiles_vulnerability_check check (vulnerability_level in ('low', 'medium', 'high', 'critical')),
  constraint crm_beneficiary_profiles_income_check check (income_range is null or income_range in ('unknown', 'none', 'low', 'middle')),
  constraint crm_beneficiary_profiles_assessment_check check (assessment_status in ('not_assessed', 'in_review', 'eligible', 'not_eligible', 'expired')),
  constraint crm_beneficiary_profiles_status_check check (status in ('active', 'inactive', 'graduated', 'blocked'))
);

create table if not exists public.crm_institution_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  institution_type text not null,
  institution_code text,
  registration_reference text,
  contact_person_name text,
  contact_person_phone text,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_institution_profiles_unique unique (organization_id, contact_id),
  constraint crm_institution_profiles_type_check check (institution_type in ('mosque', 'school', 'foundation', 'company', 'community', 'government', 'other')),
  constraint crm_institution_profiles_status_check check (status in ('active', 'inactive', 'unverified', 'archived'))
);

create table if not exists public.crm_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  color text,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_tags_unique_key unique (organization_id, key),
  constraint crm_tags_status_check check (status in ('active', 'inactive'))
);

create table if not exists public.crm_contact_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  tag_id uuid not null references public.crm_tags(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_contact_tags_unique unique (organization_id, contact_id, tag_id)
);

create table if not exists public.crm_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  interaction_type text not null,
  direction text not null,
  occurred_at timestamptz,
  summary text not null,
  follow_up_note text,
  follow_up_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_interactions_type_check check (interaction_type in ('call', 'whatsapp', 'email', 'visit', 'meeting', 'note')),
  constraint crm_interactions_direction_check check (direction in ('inbound', 'outbound', 'internal'))
);

create table if not exists public.crm_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  consent_type text not null,
  channel text not null,
  status text not null,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  expires_at timestamptz,
  evidence_file_id text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_consents_type_check check (consent_type in ('data_processing', 'communication', 'documentation', 'media_publication')),
  constraint crm_consents_channel_check check (channel in ('paper', 'web', 'whatsapp', 'email', 'verbal_recorded')),
  constraint crm_consents_status_check check (status in ('granted', 'withdrawn', 'expired'))
);

create table if not exists public.crm_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary_contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  duplicate_contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  match_score double precision,
  match_reasons text not null,
  status text not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_duplicate_candidates_unique unique (organization_id, primary_contact_id, duplicate_contact_id),
  constraint crm_duplicate_candidates_not_self check (primary_contact_id <> duplicate_contact_id),
  constraint crm_duplicate_candidates_status_check check (status in ('open', 'dismissed', 'merge_requested', 'merged'))
);

create table if not exists public.crm_merge_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  target_contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  status text not null default 'draft',
  reason text not null,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  applied_at timestamptz,
  audit_summary text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_merge_requests_not_self check (source_contact_id <> target_contact_id),
  constraint crm_merge_requests_status_check check (status in ('draft', 'requested', 'approved', 'rejected', 'applied', 'cancelled'))
);

create index if not exists idx_program_categories_org_status on public.program_categories(organization_id, status);
create index if not exists idx_programs_org_status on public.programs(organization_id, status);
create index if not exists idx_program_revisions_program on public.program_revisions(program_id, performed_at);
create index if not exists idx_crm_contacts_org_status on public.crm_contacts(organization_id, status);
create index if not exists idx_crm_contacts_org_normalized_name on public.crm_contacts(organization_id, normalized_name);
create index if not exists idx_crm_contact_roles_contact on public.crm_contact_roles(contact_id);
create index if not exists idx_crm_sensitive_identities_contact on public.crm_sensitive_identities(contact_id);
create index if not exists idx_crm_beneficiary_profiles_contact on public.crm_beneficiary_profiles(contact_id);
create index if not exists idx_crm_institution_profiles_contact on public.crm_institution_profiles(contact_id);
create index if not exists idx_crm_interactions_contact on public.crm_interactions(contact_id, occurred_at);
create index if not exists idx_crm_consents_contact on public.crm_consents(contact_id, consented_at);
create index if not exists idx_crm_duplicate_candidates_primary on public.crm_duplicate_candidates(primary_contact_id);
create index if not exists idx_crm_merge_requests_source on public.crm_merge_requests(source_contact_id);

do $$
declare
  table_name text;
  resource_name text;
begin
  foreach table_name in array array[
    'program_categories',
    'programs',
    'program_revisions',
    'crm_contacts',
    'crm_contact_roles',
    'crm_sensitive_identities',
    'crm_beneficiary_profiles',
    'crm_institution_profiles',
    'crm_tags',
    'crm_contact_tags',
    'crm_interactions',
    'crm_consents',
    'crm_duplicate_candidates',
    'crm_merge_requests'
  ]
  loop
    resource_name := table_name;
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to app_runtime', table_name);
    execute format('drop trigger if exists trg_%I_touch_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_%I_touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',
      table_name,
      table_name
    );

    execute format('drop policy if exists %I_select on public.%I', table_name, table_name);
    execute format(
      'create policy %I_select on public.%I for select using (private.has_active_membership(organization_id) and private.has_permission(organization_id, %L))',
      table_name,
      table_name,
      resource_name || '.read'
    );

    execute format('drop policy if exists %I_insert on public.%I', table_name, table_name);
    execute format(
      'create policy %I_insert on public.%I for insert with check (private.has_active_membership(organization_id) and private.has_permission(organization_id, %L))',
      table_name,
      table_name,
      resource_name || '.manage'
    );

    execute format('drop policy if exists %I_update on public.%I', table_name, table_name);
    execute format(
      'create policy %I_update on public.%I for update using (private.has_active_membership(organization_id) and private.has_permission(organization_id, %L)) with check (private.has_active_membership(organization_id) and private.has_permission(organization_id, %L))',
      table_name,
      table_name,
      resource_name || '.manage',
      resource_name || '.manage'
    );

    execute format('drop policy if exists %I_delete on public.%I', table_name, table_name);
    execute format(
      'create policy %I_delete on public.%I for delete using (private.has_active_membership(organization_id) and private.has_permission(organization_id, %L))',
      table_name,
      table_name,
      resource_name || '.delete'
    );
  end loop;
end;
$$;
