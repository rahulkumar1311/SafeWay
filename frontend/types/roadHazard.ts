/**
 * Standardized Road Sign, Road Marking & Hazard Detection Types
 */

export type RoadHazardType =
  | 'zebra_crossing'
  | 'school_zone'
  | 'school_sign'
  | 'sharp_turn'
  | 'left_turn'
  | 'right_turn'
  | 'speed_limit'
  | 'stop_sign'
  | 'traffic_light'
  | 'pedestrian_crossing'
  | 'road_obstacle';

export interface StandardRoadHazardDetection {
  id: string;
  type: RoadHazardType;
  label: string;
  confidence: number; // 0 to 100%
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  distanceEstimateMeters: number; // Estimated distance based on bounding box height ratio
  proximityLevel: 'FAR' | 'CAUTION' | 'NEAR' | 'CRITICAL';
  risk: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  advisorySpeedLimitKmH: number;
  alertTitle: string;
  alertMessage: string;
}
