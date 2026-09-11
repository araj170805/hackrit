export interface GeoResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Robust current-position lookup used across the app.
 *
 * A single attempt with enableHighAccuracy + a short timeout is what was
 * causing every map/report to silently fall back to a hardcoded default
 * location: a high-accuracy (GPS) fix routinely takes longer than 5-10s to
 * resolve, especially on desktop, so the request would time out before a
 * real fix ever came back. This tries a generous high-accuracy attempt
 * first, then falls back to a low-accuracy (network/WiFi) attempt before
 * giving up — callers only see a rejection when location genuinely isn't
 * available (denied, unsupported, or both attempts failed).
 */
export function getCurrentLocation(): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    const toResult = (pos: GeolocationPosition): GeoResult => ({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy || 50
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toResult(pos)),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied."));
          return;
        }
        // High-accuracy attempt failed/timed out — retry with a network-based
        // fix and a longer allowance before truly giving up.
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(toResult(pos)),
          () => reject(new Error("Could not determine your location.")),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}
