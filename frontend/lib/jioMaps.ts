/**
 * Jio 3D Maps Integration Utility & Configuration Helper for SafeWay AI.
 */

export interface JioMapsConfig {
  apiKey?: string;
  styleUrl?: string;
  isConfigured: boolean;
}

export function getJioMapsConfig(): JioMapsConfig {
  const apiKey = process.env.NEXT_PUBLIC_JIO_MAPS_API_KEY;
  const styleUrl = process.env.NEXT_PUBLIC_JIO_MAPS_STYLE_URL;

  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);

  return {
    apiKey,
    styleUrl,
    isConfigured
  };
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  type: 'user' | 'destination' | 'hazard' | 'safety';
  description?: string;
  severity?: string;
}
