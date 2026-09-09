CREATE TABLE public.program_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  program_id uuid NOT NULL,
  version_number integer NOT NULL,
  public_slug text NOT NULL,
  public_title text NOT NULL,
  public_summary text NOT NULL,
  impact_headline text,
  report_title text NOT NULL,
  report_narrative text NOT NULL,
  report_period_start date,
  report_period_end date,
  reported_beneficiary_count integer NOT NULL DEFAULT 0,
  reported_cash_amount numeric(18, 2),
  reported_goods_value numeric(18, 2),
  reported_logistics_amount numeric(18, 2),
  status text NOT NULL DEFAULT 'draft',
  published_by uuid,
  published_at timestamptz,
  revoked_by uuid,
  revoked_at timestamptz,
  revocation_reason text,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_publications_program_version_unique UNIQUE (program_id, version_number),
  CONSTRAINT program_publications_slug_check CHECK (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT program_publications_status_check CHECK (status IN ('draft', 'published', 'superseded', 'revoked')),
  CONSTRAINT program_publications_period_check CHECK (report_period_end IS NULL OR report_period_start IS NULL OR report_period_end >= report_period_start),
  CONSTRAINT program_publications_nonnegative_check CHECK (
    reported_beneficiary_count >= 0
    AND (reported_cash_amount IS NULL OR reported_cash_amount >= 0)
    AND (reported_goods_value IS NULL OR reported_goods_value >= 0)
    AND (reported_logistics_amount IS NULL OR reported_logistics_amount >= 0)
  ),
  CONSTRAINT program_publications_publish_check CHECK (
    (status = 'published' AND published_by IS NOT NULL AND published_at IS NOT NULL AND revoked_by IS NULL AND revoked_at IS NULL)
    OR (status <> 'published')
  )
);
--> statement-breakpoint

ALTER TABLE public.program_publications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.program_publications
  ADD CONSTRAINT program_publications_program_fkey
    FOREIGN KEY (program_id, organization_id)
    REFERENCES public.programs(id, organization_id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_publications_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_publications_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT program_publications_published_by_fkey
    FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT program_publications_revoked_by_fkey
    FOREIGN KEY (revoked_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--> statement-breakpoint

CREATE UNIQUE INDEX idx_program_publications_one_published
  ON public.program_publications (program_id) WHERE status = 'published';
CREATE UNIQUE INDEX idx_program_publications_one_public_slug
  ON public.program_publications (public_slug) WHERE status = 'published';
CREATE INDEX idx_program_publications_public_lookup
  ON public.program_publications (public_slug, status, published_at DESC);
CREATE INDEX idx_program_publications_internal_lookup
  ON public.program_publications (organization_id, program_id, version_number DESC);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.protect_published_program_publications()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' THEN
    IF NEW.public_slug IS DISTINCT FROM OLD.public_slug
       OR NEW.public_title IS DISTINCT FROM OLD.public_title
       OR NEW.public_summary IS DISTINCT FROM OLD.public_summary
       OR NEW.impact_headline IS DISTINCT FROM OLD.impact_headline
       OR NEW.report_title IS DISTINCT FROM OLD.report_title
       OR NEW.report_narrative IS DISTINCT FROM OLD.report_narrative
       OR NEW.report_period_start IS DISTINCT FROM OLD.report_period_start
       OR NEW.report_period_end IS DISTINCT FROM OLD.report_period_end
       OR NEW.reported_beneficiary_count IS DISTINCT FROM OLD.reported_beneficiary_count
       OR NEW.reported_cash_amount IS DISTINCT FROM OLD.reported_cash_amount
       OR NEW.reported_goods_value IS DISTINCT FROM OLD.reported_goods_value
       OR NEW.reported_logistics_amount IS DISTINCT FROM OLD.reported_logistics_amount
       OR NEW.status NOT IN ('published', 'superseded', 'revoked') THEN
      RAISE EXCEPTION 'Published public program reports are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER trg_program_publications_immutable_when_published
  BEFORE UPDATE ON public.program_publications
  FOR EACH ROW EXECUTE FUNCTION private.protect_published_program_publications();
CREATE TRIGGER trg_program_publications_touch_updated_at
  BEFORE UPDATE ON public.program_publications
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
--> statement-breakpoint

CREATE POLICY program_publications_select ON public.program_publications
  FOR SELECT TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'programs.read'));
CREATE POLICY program_publications_insert ON public.program_publications
  FOR INSERT TO app_runtime
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'programs.manage') AND created_by = private.current_profile_id());
CREATE POLICY program_publications_update ON public.program_publications
  FOR UPDATE TO app_runtime
  USING (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'programs.manage'))
  WITH CHECK (private.has_active_membership(organization_id) AND private.has_permission(organization_id, 'programs.manage'));
CREATE POLICY program_publications_delete ON public.program_publications
  FOR DELETE TO app_runtime USING (false);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE public.program_publications TO app_runtime;
