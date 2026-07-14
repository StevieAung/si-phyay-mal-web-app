
-- 1. Recreate the two views without SECURITY DEFINER, using security_invoker
DROP VIEW IF EXISTS public.reports_public CASCADE;
DROP VIEW IF EXISTS public.report_confirmation_counts CASCADE;

-- 2. Drop the 10-second time-window SELECT policy on reports
DROP POLICY IF EXISTS "Insert can read back same-session row" ON public.reports;

-- 3. Add public row-level SELECT on reports; hide sensitive columns via column GRANTs
CREATE POLICY "Public read reports (rows)"
  ON public.reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE SELECT ON public.reports FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type, status, queue_level, created_at)
  ON public.reports TO anon, authenticated;

-- 4. Add public row-level SELECT on report_confirmations; hide profile_id via column GRANTs
CREATE POLICY "Public read confirmations (rows)"
  ON public.report_confirmations
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE SELECT ON public.report_confirmations FROM anon, authenticated;
GRANT SELECT (id, report_id, created_at)
  ON public.report_confirmations TO anon, authenticated;

-- 5. Recreate views with security_invoker so they use caller's RLS + column grants
CREATE VIEW public.reports_public
  WITH (security_invoker = true) AS
SELECT id, station_id, fuel_type, status, queue_level, created_at
FROM public.reports;

GRANT SELECT ON public.reports_public TO anon, authenticated;

CREATE VIEW public.report_confirmation_counts
  WITH (security_invoker = true) AS
SELECT report_id, count(*)::int AS count
FROM public.report_confirmations
GROUP BY report_id;

GRANT SELECT ON public.report_confirmation_counts TO anon, authenticated;

-- 6. Profiles: document fail-closed with an explicit restrictive deny-select policy
DROP POLICY IF EXISTS "Deny direct profile reads" ON public.profiles;
CREATE POLICY "Deny direct profile reads"
  ON public.profiles
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- 7. Revoke EXECUTE from anon/authenticated/public on the SECURITY DEFINER
--    profile helper functions. They remain callable only from trusted server
--    code (service_role) via server functions.
REVOKE EXECUTE ON FUNCTION public.get_profile_by_phone(text)
  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_profile_by_id(uuid)
  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_profile_by_phone(uuid, text, text, text, text, text, integer)
  FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_by_phone(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_profile_by_phone(uuid, text, text, text, text, text, integer) TO service_role;

-- 8. Enforce that reports.profile_id and report_confirmations.profile_id
--    reference an existing profile, so anonymous clients cannot invent ids.
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_profile_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.report_confirmations
  DROP CONSTRAINT IF EXISTS report_confirmations_profile_id_fkey;
ALTER TABLE public.report_confirmations
  ADD CONSTRAINT report_confirmations_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
