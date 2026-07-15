
-- Allow anon/authenticated to read community reports & confirmations through the
-- security_invoker public views. Sensitive columns (user_id, profile_id, note)
-- are NOT granted, so PostgREST cannot expose them even on direct table access.

GRANT SELECT (id, station_id, fuel_type, status, queue_level, created_at)
  ON public.reports TO anon, authenticated;

GRANT SELECT (id, report_id, created_at)
  ON public.report_confirmations TO anon, authenticated;

-- Permissive SELECT policies scoped to community-visible rows.
DROP POLICY IF EXISTS "Public can read report summaries" ON public.reports;
CREATE POLICY "Public can read report summaries"
  ON public.reports FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can read confirmations" ON public.report_confirmations;
CREATE POLICY "Public can read confirmations"
  ON public.report_confirmations FOR SELECT
  TO anon, authenticated
  USING (true);
