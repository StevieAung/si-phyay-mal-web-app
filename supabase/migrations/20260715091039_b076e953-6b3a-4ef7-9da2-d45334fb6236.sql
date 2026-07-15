
-- Fix: SECURITY DEFINER views -> switch to security invoker
ALTER VIEW public.reports_public SET (security_invoker = true);
ALTER VIEW public.report_confirmation_counts SET (security_invoker = true);

-- Fix: vehicle-qr storage policies allow anyone to read/write any file.
-- Since this app currently has no end-user auth (demo phone flow), route all
-- QR access through server functions using the service role. Remove the
-- permissive anon/authenticated policies entirely so direct client access is denied.
DROP POLICY IF EXISTS "vehicle-qr anon read" ON storage.objects;
DROP POLICY IF EXISTS "vehicle-qr anon insert" ON storage.objects;
DROP POLICY IF EXISTS "vehicle-qr anon update" ON storage.objects;
