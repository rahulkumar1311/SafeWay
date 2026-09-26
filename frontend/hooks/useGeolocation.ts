import { useState, useEffect } from 'react';

export interface LocationState {
  latitude: number;
  longitude: number;
  state: string;
  city: string;
  address: string;
  isGeoAvailable: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: 25.5941,
    longitude: 85.1376,
    state: 'Bihar',
    city: 'Patna',
    address: 'Gandhi Maidan, Patna, Bihar',
    isGeoAvailable: false,
    error: null
  });

  const requestLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation((prev) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            isGeoAvailable: true,
            error: null
          }));
        },
        (err) => {
          console.warn('Geolocation permission denied or unavailable, using fallback:', err.message);
          setLocation((prev) => ({
            ...prev,
            error: err.message
          }));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return { location, setLocation, requestLocation };
}
