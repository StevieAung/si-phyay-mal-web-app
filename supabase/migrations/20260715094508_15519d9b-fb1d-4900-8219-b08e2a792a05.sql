
-- Revert views to security invoker (linter-friendly)
ALTER VIEW public.reports_public SET (security_invoker = true);
ALTER VIEW public.report_confirmation_counts SET (security_invoker = true);

-- Restore permissive row visibility, but restrict which columns anon/authenticated can read.
DROP POLICY IF EXISTS "Owners can read their reports" ON public.reports;
DROP POLICY IF EXISTS "Owners can read their confirmations" ON public.report_confirmations;

CREATE POLICY "Public can read report rows (safe cols via grants)"
  ON public.reports FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read confirmation rows (safe cols via grants)"
  ON public.report_confirmations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Reset column privileges: revoke broad SELECT, then grant only safe columns to anon/authenticated.
REVOKE SELECT ON public.reports FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type, status, queue_level, created_at)
  ON public.reports TO anon, authenticated;

REVOKE SELECT ON public.report_confirmations FROM anon, authenticated;
GRANT SELECT (id, report_id, created_at)
  ON public.report_confirmations TO anon, authenticated;

-- Keep full access for service role.
GRANT ALL ON public.reports TO service_role;
GRANT ALL ON public.report_confirmations TO service_role;
