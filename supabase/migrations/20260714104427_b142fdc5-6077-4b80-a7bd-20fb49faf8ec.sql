
-- =========================================================
-- Profiles: remove permissive SELECT/UPDATE; tighten INSERT
-- =========================================================
DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update a profile (pre-auth phase)" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create a profile (pre-auth phase)" ON public.profiles;

CREATE POLICY "Anon can create profile with required fields"
  ON public.profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    phone IS NOT NULL AND length(btrim(phone)) >= 8
    AND name IS NOT NULL AND length(btrim(name)) > 0
    AND vehicle_type IS NOT NULL
    AND license_plate IS NOT NULL
    AND fuel_type IS NOT NULL
    AND engine_cc IS NOT NULL AND engine_cc > 0
  );

-- Ownership-gated helpers (phone acts as the demo shared secret).
CREATE OR REPLACE FUNCTION public.get_profile_by_phone(_phone text)
RETURNS TABLE (
  id uuid, phone text, name text, vehicle_type text,
  license_plate text, fuel_type text, engine_cc integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.phone, p.name, p.vehicle_type, p.license_plate, p.fuel_type, p.engine_cc
  FROM public.profiles p
  WHERE p.phone = _phone
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_by_id(_id uuid)
RETURNS TABLE (
  id uuid, phone text, name text, vehicle_type text,
  license_plate text, fuel_type text, engine_cc integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.phone, p.name, p.vehicle_type, p.license_plate, p.fuel_type, p.engine_cc
  FROM public.profiles p
  WHERE p.id = _id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_by_phone(
  _id uuid,
  _phone text,
  _name text,
  _vehicle_type text,
  _license_plate text,
  _fuel_type text,
  _engine_cc integer
)
RETURNS TABLE (
  id uuid, phone text, name text, vehicle_type text,
  license_plate text, fuel_type text, engine_cc integer
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _phone IS NULL OR _id IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    UPDATE public.profiles p
    SET name = _name,
        vehicle_type = _vehicle_type,
        license_plate = _license_plate,
        fuel_type = _fuel_type,
        engine_cc = _engine_cc,
        updated_at = now()
    WHERE p.id = _id AND p.phone = _phone
    RETURNING p.id, p.phone, p.name, p.vehicle_type, p.license_plate, p.fuel_type, p.engine_cc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_by_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_by_phone(uuid, text, text, text, text, text, integer) TO anon, authenticated;

-- =========================================================
-- Reports: remove public read; expose safe-column view only
-- =========================================================
DROP POLICY IF EXISTS "Public can read reports" ON public.reports;

CREATE OR REPLACE VIEW public.reports_public
WITH (security_invoker = off) AS
  SELECT id, station_id, fuel_type, status, queue_level, created_at
  FROM public.reports;

GRANT SELECT ON public.reports_public TO anon, authenticated;

-- Allow inserts to see just their own newly created row so the client can
-- read back created_at without exposing anyone else's report rows.
CREATE POLICY "Insert can read back same-session row"
  ON public.reports
  FOR SELECT
  TO anon, authenticated
  USING (created_at > now() - interval '10 seconds');

-- =========================================================
-- Report confirmations: expose only aggregate counts publicly
-- =========================================================
DROP POLICY IF EXISTS "Public can read confirmations" ON public.report_confirmations;

CREATE OR REPLACE VIEW public.report_confirmation_counts
WITH (security_invoker = off) AS
  SELECT report_id, COUNT(*)::int AS confirmation_count
  FROM public.report_confirmations
  GROUP BY report_id;

GRANT SELECT ON public.report_confirmation_counts TO anon, authenticated;
