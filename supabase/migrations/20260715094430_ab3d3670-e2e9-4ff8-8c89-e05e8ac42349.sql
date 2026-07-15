
-- 1. Restrict SELECT on reports and report_confirmations to owners only
DROP POLICY IF EXISTS "Public can read report summaries" ON public.reports;
DROP POLICY IF EXISTS "Public can read confirmations" ON public.report_confirmations;

CREATE POLICY "Owners can read their reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can read their confirmations"
  ON public.report_confirmations FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM public.reports WHERE id = report_id));

-- 2. Make public views SECURITY DEFINER so anon/authenticated can still read
--    aggregate/safe columns without direct table access.
ALTER VIEW public.reports_public SET (security_invoker = false);
ALTER VIEW public.report_confirmation_counts SET (security_invoker = false);

GRANT SELECT ON public.reports_public TO anon, authenticated;
GRANT SELECT ON public.report_confirmation_counts TO anon, authenticated;

-- 3. Storage policies for the private 'vehicle-qr' bucket.
--    Files are stored under a path prefix of the owner's profile id.
--    Uploads/reads occur via server functions using the service role (which bypasses RLS).
--    Add explicit owner-scoped policies so no direct client access is possible for other users.
DROP POLICY IF EXISTS "Vehicle QR owners can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle QR owners can insert own files" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle QR owners can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Vehicle QR owners can delete own files" ON storage.objects;

CREATE POLICY "Vehicle QR owners can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vehicle-qr' AND owner = auth.uid());

CREATE POLICY "Vehicle QR owners can insert own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-qr' AND owner = auth.uid());

CREATE POLICY "Vehicle QR owners can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-qr' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'vehicle-qr' AND owner = auth.uid());

CREATE POLICY "Vehicle QR owners can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-qr' AND owner = auth.uid());
