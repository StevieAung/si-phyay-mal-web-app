
CREATE TABLE public.stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stations TO anon, authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active stations"
  ON public.stations FOR SELECT
  USING (is_active = true);

CREATE TABLE public.station_fuels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL,
  is_offered BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (station_id, fuel_type)
);

CREATE INDEX idx_station_fuels_station_id ON public.station_fuels(station_id);

GRANT SELECT ON public.station_fuels TO anon, authenticated;
GRANT ALL ON public.station_fuels TO service_role;
ALTER TABLE public.station_fuels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read offered fuels for active stations"
  ON public.station_fuels FOR SELECT
  USING (
    is_offered = true
    AND EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = station_fuels.station_id AND s.is_active = true
    )
  );
