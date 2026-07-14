
-- 1. profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  engine_cc INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- No auth yet: allow anonymous inserts / updates. This is a known limitation
-- documented in Phase 3 and will tighten once phone-OTP auth ships.
CREATE POLICY "Anyone can create a profile (pre-auth phase)"
  ON public.profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update a profile (pre-auth phase)"
  ON public.profiles FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. reports.profile_id
ALTER TABLE public.reports
  ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX reports_profile_id_idx ON public.reports (profile_id);

-- Tighten anon insert policy: replace the previous "user_id IS NULL" gate with
-- "profile_id must be provided". Reports without an identity are no longer allowed.
DROP POLICY IF EXISTS "Anon can insert anonymous reports (pre-auth phase)" ON public.reports;

CREATE POLICY "Anon can insert reports with a profile (pre-auth phase)"
  ON public.reports FOR INSERT
  TO anon
  WITH CHECK (profile_id IS NOT NULL);
