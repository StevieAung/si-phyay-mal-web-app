
-- Remove permissive public SELECT on base tables; expose only safe columns via views.
DROP POLICY IF EXISTS "Public read reports (rows)" ON public.reports;
DROP POLICY IF EXISTS "Public read confirmations (rows)" ON public.report_confirmations;

-- Recreate views as SECURITY DEFINER (security_invoker = false) so they can read
-- base tables even though the base-table SELECT policies are now removed.
-- Views only expose non-sensitive columns.
ALTER VIEW public.reports_public SET (security_invoker = false);
ALTER VIEW public.report_confirmation_counts SET (security_invoker = false);

-- Ensure views are readable by anon/authenticated.
GRANT SELECT ON public.reports_public TO anon, authenticated;
GRANT SELECT ON public.report_confirmation_counts TO anon, authenticated;

-- Revoke direct SELECT on base tables from anon/authenticated (RLS already denies,
-- but drop grants for defense-in-depth). Keep service_role full access.
REVOKE SELECT ON public.reports FROM anon, authenticated;
REVOKE SELECT ON public.report_confirmations FROM anon, authenticated;
