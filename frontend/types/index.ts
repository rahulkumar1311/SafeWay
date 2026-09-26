export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: Pagination;
  count?: number;
}

export type RuleScope = 'CENTRAL' | 'STATE';
export type VerificationStatus = 'VERIFIED' | 'REQUIRES_VERIFICATION' | 'DEPRECATED';

export interface TrafficRule {
  _id: string;
  scope: RuleScope;
  state?: string | null;
  ruleCode: string;
  category: string;
  title: string;
  description: string;
  applicableVehicleTypes: string[];
  vehicleType: string;
  violation?: string;
  fineAmount?: number | null;
  additionalPenalty?: string;
  legalSection: string;
  sourceName: string;
  sourceUrl: string;
  governmentDocument?: string;
  effectiveFrom?: string | null;
  lastVerifiedAt: string;
  lastUpdated: string;
  status: VerificationStatus;
  language?: string;
  notes?: string;
}

export interface ChallanInfo {
  id: string;
  title: string;
  category: string;
  vehicleType: string;
  fineAmount?: number | null;
  description: string;
  sourceUrl?: string;
  lastUpdated?: string;
}

export type HazardType = 'pothole' | 'accident' | 'roadblock' | 'waterlogging' | 'construction' | 'other';
export type HazardSeverity = 'low' | 'medium' | 'high';
export type HazardStatus = 'active' | 'resolved';

export interface RoadHazard {
  _id: string;
  type: HazardType;
  description: string;
  latitude: number;
  longitude: number;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  severity: HazardSeverity;
  status: HazardStatus;
  reportedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SafetyRecord {
  _id: string;
  userId?: string | null;
  drowsinessScore: number;
  drivingScore: number;
  riskLevel: RiskLevel;
  events: any[];
  recordedAt: string;
}

export interface SafetyAnalysisInput {
  userId?: string;
  drowsinessScore: number;
  speed: number;
  speedLimit: number;
  harshBraking?: number;
  roadHazard?: boolean;
  events?: any[];
  drivingScore?: number;
}

export interface SafetyAnalysisResult {
  recordId: string;
  userId?: string | null;
  riskLevel: RiskLevel;
  riskScore: number;
  drowsinessScore: number;
  drivingScore: number;
  reasons: string[];
  recommendations: string[];
  events: any[];
  recordedAt: string;
}

export interface EmergencyContact {
  _id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SOSInput {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  incidentId?: string;
  eventType?: string;
  timestamp?: string;
}

export interface SOSResult {
  sosId: string;
  userId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  eventType: string;
  contactsNotifiedCount: number;
  contacts: Array<{
    id: string;
    name: string;
    phone: string;
    relationship: string;
  }>;
  notification: {
    success: boolean;
    provider: string;
    message: string;
  };
}

export interface DrowsinessAnalysisResult {
  sessionId: string;
  drowsinessScore: number;
  isDrowsy: boolean;
  confidence: number;
  timestamp: string;
  faceDetected?: boolean;
  eyesDetected?: boolean;
  leftEAR?: number | null;
  rightEAR?: number | null;
  ear?: number | null;
  eyeState?: string;
  eyeClosureDurationMs?: number;
  riskLevel?: string;
  alert?: boolean;
  alertState?: string;
  alertEvent?: string | null;
  faceRect?: [number, number, number, number] | number[] | null; // [x, y, w, h]
  leftEye?: [number, number, number, number] | number[] | null; // [x, y, w, h]
  rightEye?: [number, number, number, number] | number[] | null; // [x, y, w, h]
  leftEyeCenter?: [number, number] | number[] | null; // [x, y]
  rightEyeCenter?: [number, number] | number[] | null; // [x, y]
  frameWidth?: number;
  frameHeight?: number;
}

export interface TrafficSignAnalysisResult {
  signType: string;
  meaning: string;
  confidence: number;
  detectedAt: string;
}
