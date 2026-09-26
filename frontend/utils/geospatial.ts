/**
 * Geospatial Navigation Calculations (Haversine Distance & Ahead-of-Vehicle Bearing Cone)
 */

export interface DemoMapFeature {
  id: string;
  type: 'school' | 'zebra_crossing' | 'sharp_turn' | 'stop_sign' | 'speed_limit';
  name: string;
  latitude: number;
  longitude: number;
  warningDistanceMeters: number; // 200m distance-based trigger
  advisorySpeedKmH: number;
  riskLevel: 'CAUTION' | 'WARNING' | 'CRITICAL';
  voicePrompt: string;
  alertTitle: string;
  alertMessage: string;
}

// Fixed Demonstration Route (Patna Main Road)
export const DEMO_ROUTE_POINTS: Array<[number, number]> = [
  [25.5941, 85.1376], // Start Point (Gandhi Maidan)
  [25.5950, 85.1385],
  [25.5960, 85.1395], // Near School Zone (25.5965, 85.1400)
  [25.5975, 85.1410], // Near Zebra Crossing (25.5982, 85.1415)
  [25.5990, 85.1425], // Near Sharp Turn (25.5998, 85.1432)
  [25.6010, 85.1445]  // End Point (Patna Junction)
];

// Fixed 200m Safety Points
export const DEMO_MAP_FEATURES: DemoMapFeature[] = [
  {
    id: 'demo-school-01',
    type: 'school',
    name: 'St. Xavier School Zone',
    latitude: 25.5965,
    longitude: 85.1400,
    warningDistanceMeters: 200,
    advisorySpeedKmH: 25,
    riskLevel: 'WARNING',
    voicePrompt: 'School zone ahead. Please reduce speed.',
    alertTitle: '🏫 SCHOOL ZONE AHEAD',
    alertMessage: 'School zone ahead — 200m. Reduce speed to 25 km/h and drive carefully.'
  },
  {
    id: 'demo-zebra-01',
    type: 'zebra_crossing',
    name: 'Main Crosswalk Zebra Crossing',
    latitude: 25.5982,
    longitude: 85.1415,
    warningDistanceMeters: 200,
    advisorySpeedKmH: 20,
    riskLevel: 'CRITICAL',
    voicePrompt: 'Zebra crossing ahead. Please drive carefully.',
    alertTitle: '🚸 ZEBRA CROSSING AHEAD',
    alertMessage: 'Zebra crossing ahead — 200m. Reduce speed and watch for pedestrians.'
  },
  {
    id: 'demo-turn-01',
    type: 'sharp_turn',
    name: 'Bailey Road Sharp Curve',
    latitude: 25.5998,
    longitude: 85.1432,
    warningDistanceMeters: 200,
    advisorySpeedKmH: 30,
    riskLevel: 'WARNING',
    voicePrompt: 'Sharp turn ahead. Please reduce speed.',
    alertTitle: '↪ SHARP TURN AHEAD',
    alertMessage: 'Sharp turn ahead — 200m. Reduce speed to 30 km/h.'
  }
];

/**
 * Interpolates vehicle position (lat, lng) and heading along demo route based on progress percentage (0 to 100%)
 */
export function getDemoVehiclePosition(progressPct: number): {
  latitude: number;
  longitude: number;
  heading: number;
} {
  const clampedProgress = Math.max(0, Math.min(100, progressPct)) / 100;
  const numSegments = DEMO_ROUTE_POINTS.length - 1;
  const segmentProgress = clampedProgress * numSegments;
  const segmentIdx = Math.min(numSegments - 1, Math.floor(segmentProgress));
  const segmentT = segmentProgress - segmentIdx;

  const [lat1, lon1] = DEMO_ROUTE_POINTS[segmentIdx];
  const [lat2, lon2] = DEMO_ROUTE_POINTS[segmentIdx + 1];

  const latitude = lat1 + (lat2 - lat1) * segmentT;
  const longitude = lon1 + (lon2 - lon1) * segmentT;
  const heading = calculateBearingDegrees(lat1, lon1, lat2, lon2);

  return { latitude, longitude, heading };
}

/**
 * Haversine distance formula in meters between two coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates initial bearing in degrees (0..360) from point 1 to point 2
 */
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

/**
 * Checks if target coordinate (lat2, lon2) falls within forward cone (±45°) ahead of vehicle heading
 */
export function isAheadOfVehicle(
  vehicleLat: number,
  vehicleLon: number,
  vehicleHeading: number | null,
  targetLat: number,
  targetLon: number,
  maxConeAngleDegrees: number = 45
): boolean {
  if (vehicleHeading === null) {
    return true;
  }

  const bearing = calculateBearingDegrees(vehicleLat, vehicleLon, targetLat, targetLon);
  let diff = Math.abs(bearing - vehicleHeading) % 360;
  if (diff > 180) diff = 360 - diff;

  return diff <= maxConeAngleDegrees;
}
