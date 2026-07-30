ALTER POLICY "fund_commitments_update" ON "fund_commitments" TO app_runtime USING (private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'fund_commitments.manage')
        or private.has_permission(organization_id, 'fund_receipts.post')
        or private.has_permission(organization_id, 'fund_receipts.reverse')
      )) WITH CHECK (private.has_active_membership(organization_id) and (
        private.has_permission(organization_id, 'fund_commitments.manage')
        or private.has_permission(organization_id, 'fund_receipts.post')
        or private.has_permission(organization_id, 'fund_receipts.reverse')
      ));--> statement-breakpoint
ALTER POLICY "fund_ledger_entries_insert" ON "fund_ledger_entries" TO app_runtime WITH CHECK (private.has_active_membership(organization_id) and (
  (entry_type = 'receipt_posted' and private.has_permission(organization_id, 'fund_receipts.post'))
  or (entry_type = 'receipt_reversed' and private.has_permission(organization_id, 'fund_receipts.reverse'))
  or (entry_type = 'allocation_approved' and private.has_permission(organization_id, 'fund_allocations.activate'))
  or (entry_type = 'allocation_reversed' and private.has_permission(organization_id, 'fund_allocations.reverse'))
  or (entry_type = 'disbursement_posted' and private.has_permission(organization_id, 'fund_disbursements.post'))
  or (entry_type = 'disbursement_reversed' and private.has_permission(organization_id, 'fund_disbursements.reverse'))
));--> statement-breakpoint
ALTER POLICY "fund_reversals_insert" ON "fund_reversals" TO app_runtime WITH CHECK (private.has_active_membership(organization_id) and (
  (source_type = 'receipt' and private.has_permission(organization_id, 'fund_receipts.reverse'))
  or (source_type = 'allocation' and private.has_permission(organization_id, 'fund_allocations.reverse'))
  or (source_type = 'disbursement' and private.has_permission(organization_id, 'fund_disbursements.reverse'))
));