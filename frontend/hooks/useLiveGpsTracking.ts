import { useState, useEffect, useRef } from 'react';

export interface LiveGpsState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // in meters
  speedKmH: number | null; // in km/h
  heading: number | null; // in degrees (0 = North)
  timestamp: number | null;
  status: 'LIVE' | 'SIGNAL_WEAK' | 'UNAVAILABLE' | 'PERMISSION_DENIED';
  error: string | null;
}

export function useLiveGpsTracking() {
  const [gpsState, setGpsState] = useState<LiveGpsState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speedKmH: null,
    heading: null,
    timestamp: null,
    status: 'UNAVAILABLE',
    error: null
  });

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsState((prev) => ({
        ...prev,
        status: 'UNAVAILABLE',
        error: 'Browser Geolocation API is not supported on this device.'
      }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        const accuracy = coords.accuracy ? Math.round(coords.accuracy) : null;
        const speedMps = coords.speed;
        const speedKmH = speedMps !== null && speedMps >= 0 ? Math.round(speedMps * 3.6) : null;
        const heading = coords.heading !== null && !isNaN(coords.heading) ? Math.round(coords.heading) : null;

        let status: 'LIVE' | 'SIGNAL_WEAK' | 'UNAVAILABLE' = 'LIVE';
        if (accuracy && accuracy > 50) {
          status = 'SIGNAL_WEAK';
        }

        setGpsState({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy,
          speedKmH,
          heading,
          timestamp: pos.timestamp || Date.now(),
          status,
          error: null
        });
      },
      (err) => {
        let status: 'PERMISSION_DENIED' | 'UNAVAILABLE' = 'UNAVAILABLE';
        let errorMsg = err.message || 'GPS location acquisition failed.';

        if (err.code === err.PERMISSION_DENIED) {
          status = 'PERMISSION_DENIED';
          errorMsg = 'GPS Permission Denied. Please enable location access in browser settings.';
        }

        setGpsState((prev) => ({
          ...prev,
          status,
          error: errorMsg
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return gpsState;
}

export default useLiveGpsTracking;
