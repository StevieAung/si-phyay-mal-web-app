
CREATE TABLE public.report_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_confirmations_unique_per_profile UNIQUE (report_id, profile_id)
);

CREATE INDEX report_confirmations_report_id_idx ON public.report_confirmations(report_id);
CREATE INDEX report_confirmations_profile_id_idx ON public.report_confirmations(profile_id);

GRANT SELECT ON public.report_confirmations TO anon, authenticated;
GRANT INSERT ON public.report_confirmations TO anon, authenticated;
GRANT ALL ON public.report_confirmations TO service_role;

ALTER TABLE public.report_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read confirmations"
  ON public.report_confirmations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anon can insert confirmations with a profile (pre-auth phase)"
  ON public.report_confirmations
  FOR INSERT
  TO anon
  WITH CHECK (profile_id IS NOT NULL);

CREATE POLICY "Authenticated can insert confirmations with a profile"
  ON public.report_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IS NOT NULL);
