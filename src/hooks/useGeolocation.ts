import { useCallback, useEffect, useState } from "react";

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

// Module-level singleton so the browser permission prompt is only requested
// once per session, and the resolved coords survive navigating between routes.
let sharedState: GeoState = { status: "idle", coords: null };
let inFlight = false;
const listeners = new Set<(s: GeoState) => void>();

function setShared(next: GeoState) {
  sharedState = next;
  listeners.forEach((l) => l(next));
}

function requestShared() {
  if (inFlight) return;
  if (sharedState.status === "granted" || sharedState.status === "requesting") return;
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    setShared({ status: "unsupported", coords: null });
    return;
  }
  inFlight = true;
  setShared({ status: "requesting", coords: null });
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      inFlight = false;
      setShared({
        status: "granted",
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
    },
    (err) => {
      inFlight = false;
      const status: GeoStatus =
        err.code === err.PERMISSION_DENIED
          ? "denied"
          : err.code === err.TIMEOUT
            ? "timeout"
            : "unavailable";
      setShared({ status, coords: null });
    },
    { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
  );
}

function resetShared() {
  setShared({ status: "idle", coords: null });
}

/**
 * Geolocation hook.
 * - Never persists coordinates. State lives only in module memory for the tab session.
 * - The permission prompt is shown at most once per session; subsequent
 *   route mounts reuse the resolved coordinates.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>(sharedState);

  useEffect(() => {
    listeners.add(setState);
    // Sync in case state changed between render and subscribe.
    setState(sharedState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const request = useCallback(() => requestShared(), []);
  const reset = useCallback(() => resetShared(), []);

  return { ...state, request, reset };
}
