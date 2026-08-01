DROP TRIGGER IF EXISTS trg_protect_published_aid_package_items
ON public.aid_package_template_items;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION private.protect_published_aid_package_items()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_template_id uuid;
  target_organization_id uuid;
  template_status text;
BEGIN
  target_template_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.template_id ELSE OLD.template_id END;
  target_organization_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.organization_id ELSE OLD.organization_id END;

  SELECT status INTO template_status
  FROM public.aid_package_templates
  WHERE id = target_template_id AND organization_id = target_organization_id;

  IF template_status <> 'draft' THEN
    RAISE EXCEPTION 'Published package template items are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_protect_published_aid_package_items
BEFORE INSERT OR UPDATE ON public.aid_package_template_items
FOR EACH ROW EXECUTE FUNCTION private.protect_published_aid_package_items();
