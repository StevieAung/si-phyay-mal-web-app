import { useCallback, useRef, useState } from "react";

export type GeoStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export interface GeoState {
  status: GeoStatus;
  coords: { lat: number; lng: number } | null;
  error?: string;
}

/**
 * Geolocation hook.
 * - Never persists coordinates. State lives only in React memory.
 * - `request()` is idempotent while a request is in flight (prevents
 *   repeated permission prompts caused by rerenders).
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle", coords: null });
  const inFlight = useRef(false);

  const request = useCallback(() => {
    if (inFlight.current) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "unsupported", coords: null });
      return;
    }
    inFlight.current = true;
    setState({ status: "requesting", coords: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        inFlight.current = false;
        setState({
          status: "granted",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      },
      (err) => {
        inFlight.current = false;
        const status: GeoStatus =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable";
        setState({ status, coords: null });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", coords: null });
  }, []);

  return { ...state, request, reset };
}
