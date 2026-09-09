-- A tenant may identify an active distribution-partner organization that it is
-- already related to. This permits a Program planner to choose that partner
-- without granting a general directory of other organizations.

DROP POLICY IF EXISTS organizations_select_active_distribution_partner
  ON public.organizations;

CREATE POLICY organizations_select_active_distribution_partner
  ON public.organizations
  AS PERMISSIVE
  FOR SELECT
  TO app_runtime
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.organization_relationships relationship
      WHERE relationship.source_organization_id = private.current_organization_id()
        AND relationship.target_organization_id = organizations.id
        AND relationship.relationship_type = 'distribution_partner'
        AND relationship.status = 'active'
        AND private.has_active_membership(relationship.source_organization_id)
    )
  );
