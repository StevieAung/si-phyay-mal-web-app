
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id text NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type text NOT NULL,
  status text NOT NULL,
  queue_level text,
  note text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reports_station_id_created_at_idx ON public.reports (station_id, created_at DESC);

GRANT SELECT ON public.reports TO anon;
GRANT SELECT, INSERT ON public.reports TO authenticated;
-- Temporary anon INSERT until Phase 3 auth ships; scoped so anon rows cannot claim a user identity.
GRANT INSERT ON public.reports TO anon;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read reports"
  ON public.reports FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- TEMPORARY: allows the current pre-auth demo flow to keep submitting reports.
-- Remove in Phase 3 when authentication ships.
CREATE POLICY "Anon can insert anonymous reports (pre-auth phase)"
  ON public.reports FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
