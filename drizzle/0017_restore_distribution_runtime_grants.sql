GRANT SELECT, INSERT, UPDATE ON TABLE
  public.distribution_plans,
  public.distribution_assignments,
  public.distribution_executions,
  public.distribution_confirmations,
  public.distribution_evidence,
  public.distribution_verifications,
  public.distribution_events,
  public.distribution_idempotency_records
TO app_runtime;
