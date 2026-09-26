/**
 * Road Perception & Safety Fusion Architecture Type Definitions
 */

export type PrimaryCOCOClass = string;

export type SecondaryRoadSignType =
  | 'School Zone'
  | 'Pedestrian Crossing'
  | 'Speed Limit 30'
  | 'Speed Limit 40'
  | 'Speed Limit 50'
  | 'Speed Limit 80'
  | 'Sharp Turn'
  | 'Dangerous Turn'
  | 'Zig-Zag Road'
  | 'Construction'
  | 'Slippery Road'
  | 'Mandatory Turn Left'
  | 'Mandatory Turn Right'
  | 'Roundabout'
  | 'Speed Bump'
  | 'Yield'
  | 'Stop Sign'
  | 'No Entry'
  | 'No Parking'
  | 'Unknown Sign';

export type RoadGeometryFeature =
  | 'SHARP_TURN'
  | 'WINDING_ROAD'
  | 'PEDESTRIAN_CROSSING'
  | 'OBSTACLE'
  | 'STOPPED_VEHICLE'
  | 'UNAVAILABLE';

export type RoadContextSource = 'CAMERA' | 'GPS_MAP' | 'TRAFFIC_RULE_DB' | 'FUSED';

/**
 * Normalized Road Context Contract for Future GPS / Jio 3D Map Teammate Integration
 */
export interface NormalizedRoadContext {
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  roadType: string | null;
  legalSpeedLimit: number;
  upcomingTurn: string | null;
  upcomingSchoolZone: boolean;
  upcomingPedestrianCrossing: boolean;
  upcomingSpeedLimit: number | null;
  upcomingHazard: string | null;
  source: RoadContextSource;
  confidenceScore: number; // 0.0 to 1.0 (indicates full or degraded confidence)
  degradedReason: string | null;
}

export interface PrimaryObjectDetectionResult {
  class: PrimaryCOCOClass;
  confidence: number;
  bbox: [number, number, number, number];
  areaRatio: number;
  corridorWeight: number;
  proximityRisk: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED';
}

export interface SecondarySignDetectionResult {
  signType: SecondaryRoadSignType;
  confidence: number;
  meaning: string;
  recommendedAction: string;
  advisorySpeedLimit: number | null;
  status: 'ACTIVE' | 'UNAVAILABLE';
}

/**
 * Teammate Extension Interface for Jio 3D Map integration
 */
export interface Teammate3DMapContext {
  routeId: string | null;
  heading: number | null;
  roadType: string | null;
  upcomingTurn: string | null;
  upcomingSchoolZone: boolean;
  upcomingPedestrianCrossing: boolean;
  upcomingSpeedLimit: number | null;
  upcomingHazard: string | null;
  vectorTileStatus: 'CONNECTED' | 'UNAVAILABLE';
}

export interface RoadSafetyFusionPayload {
  primaryObjects: PrimaryObjectDetectionResult[];
  secondarySign: SecondarySignDetectionResult | null;
  geometryFeature: RoadGeometryFeature;
  latitude: number | null;
  longitude: number | null;
  currentSpeedKmH: number | null;
  legalSpeedLimitKmH: number;
  stateName: string;
  cityName: string;
  mapContext?: Teammate3DMapContext;
}

export interface RoadSafetyFusionOutput {
  overallRiskLevel: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED';
  legalSpeedLimitKmH: number;
  advisorySpeedKmH: number;
  speedStatus: 'NORMAL' | 'REDUCE_SPEED' | 'IMMEDIATE_BRAKING';
  activeAlerts: string[];
  normalizedContext: NormalizedRoadContext;
  perceptionSources: {
    primaryCamera: 'ACTIVE' | 'OFFLINE';
    secondarySignClassifier: 'ACTIVE' | 'UNAVAILABLE';
    roadGeometrySensor: 'ACTIVE' | 'UNAVAILABLE';
    gpsSpeed: 'ACTIVE' | 'UNAVAILABLE';
    jio3DMapLayer: 'CONNECTED' | 'UNAVAILABLE';
  };
  timestamp: string;
}
