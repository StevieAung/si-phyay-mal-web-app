
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qr_code_path text;

DROP FUNCTION IF EXISTS public.get_profile_by_id(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_by_id(_id uuid)
 RETURNS TABLE(id uuid, phone text, name text, vehicle_type text, license_plate text, fuel_type text, engine_cc integer, qr_code_path text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.phone, p.name, p.vehicle_type, p.license_plate, p.fuel_type, p.engine_cc, p.qr_code_path
  FROM public.profiles p WHERE p.id = _id LIMIT 1;
$function$;

DROP FUNCTION IF EXISTS public.get_profile_by_phone(text);
CREATE OR REPLACE FUNCTION public.get_profile_by_phone(_phone text)
 RETURNS TABLE(id uuid, phone text, name text, vehicle_type text, license_plate text, fuel_type text, engine_cc integer, qr_code_path text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.phone, p.name, p.vehicle_type, p.license_plate, p.fuel_type, p.engine_cc, p.qr_code_path
  FROM public.profiles p WHERE p.phone = _phone LIMIT 1;
$function$;

DROP FUNCTION IF EXISTS public.update_profile_by_phone(uuid, text, text, text, text, text, integer);
CREATE OR REPLACE FUNCTION public.update_profile_by_phone(_id uuid, _phone text, _name text, _vehicle_type text, _license_plate text, _fuel_type text, _engine_cc integer)
 RETURNS TABLE(id uuid, phone text, name text, vehicle_type text, license_plate text, fuel_type text, engine_cc integer, qr_code_path text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF _phone IS NULL OR _id IS NULL THEN RETURN; END IF;
  RETURN QUERY
    UPDATE public.profiles p
    SET name = _name, vehicle_type = _vehicle_type, license_plate = _license_plate,
        fuel_type = _fuel_type, engine_cc = _engine_cc, updated_at = now()
    WHERE p.id = _id AND p.phone = _phone
    RETURNING p.id, p.phone, p.name, p.vehicle_type, p.license_plate, p.fuel_type, p.engine_cc, p.qr_code_path;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_profile_qr(_id uuid, _phone text, _qr_path text)
 RETURNS TABLE(id uuid, phone text, name text, vehicle_type text, license_plate text, fuel_type text, engine_cc integer, qr_code_path text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF _phone IS NULL OR _id IS NULL THEN RETURN; END IF;
  RETURN QUERY
    UPDATE public.profiles p
    SET qr_code_path = _qr_path, updated_at = now()
    WHERE p.id = _id AND p.phone = _phone
    RETURNING p.id, p.phone, p.name, p.vehicle_type, p.license_plate, p.fuel_type, p.engine_cc, p.qr_code_path;
END;
$function$;

-- Storage RLS: allow anon to upload/read/update objects in the vehicle-qr bucket.
CREATE POLICY "vehicle-qr anon read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vehicle-qr');

CREATE POLICY "vehicle-qr anon insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'vehicle-qr');

CREATE POLICY "vehicle-qr anon update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'vehicle-qr')
  WITH CHECK (bucket_id = 'vehicle-qr');
