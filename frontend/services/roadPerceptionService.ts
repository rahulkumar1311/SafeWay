import aiApi from './api';
import {
  RoadSafetyFusionPayload,
  RoadSafetyFusionOutput,
  SecondarySignDetectionResult,
  NormalizedRoadContext,
  RoadContextSource
} from '@/types/roadPerception';

export const roadPerceptionService = {
  /**
   * Analyze camera frame using Python OpenCV Traffic Sign Classifier microservice
   */
  analyzeSecondaryRoadSign: async (base64Frame: string): Promise<SecondarySignDetectionResult | null> => {
    try {
      const response = await aiApi.post('/ai/traffic-sign/analyze', { image: base64Frame });
      if (response && response.data && response.data.signType && response.data.signType !== 'Unknown Sign') {
        const data = response.data;
        let advisoryLimit: number | null = null;
        if (data.signType === 'School Zone') advisoryLimit = 25;
        if (data.signType === 'Sharp Turn' || data.signType === 'Dangerous Turn') advisoryLimit = 30;
        if (data.signType === 'Zig-Zag Road') advisoryLimit = 35;
        if (data.signType === 'Construction') advisoryLimit = 40;
        if (data.signType.startsWith('Speed Limit')) {
          const parts = data.signType.split(' ');
          if (parts.length > 2) advisoryLimit = parseInt(parts[2], 10);
        }

        return {
          signType: data.signType,
          confidence: Math.round((data.confidence || 0.8) * 100),
          meaning: data.meaning || 'Specialized traffic sign detected ahead',
          recommendedAction: data.recommendedAction || 'Proceed with caution according to road sign instructions',
          advisorySpeedLimit: advisoryLimit,
          status: 'ACTIVE'
        };
      }
      return null;
    } catch (err) {
      console.warn('[RoadPerception] Secondary sign analysis API note:', err);
      return null;
    }
  },

  /**
   * Fuse multi-modal perception signals & calculate dynamic advisory speed
   */
  fuseRoadSafetyData: (payload: RoadSafetyFusionPayload): RoadSafetyFusionOutput => {
    const {
      primaryObjects = [],
      secondarySign,
      geometryFeature = 'UNAVAILABLE',
      latitude,
      longitude,
      currentSpeedKmH,
      legalSpeedLimitKmH = 60,
      mapContext
    } = payload;

    const alerts: string[] = [];
    let calculatedMaxRisk: string = 'NORMAL';

    // 1. Evaluate Primary Objects and Camera Block Status
    primaryObjects.forEach((obj) => {
      if (obj.proximityRisk === 'CAMERA_BLOCKED') {
        calculatedMaxRisk = 'CAMERA_BLOCKED';
      } else if (obj.proximityRisk === 'CRITICAL' && (calculatedMaxRisk as string) !== 'CAMERA_BLOCKED') {
        calculatedMaxRisk = 'CRITICAL';
        alerts.push(`Critical proximity hazard: ${obj.class.toUpperCase()} in lane corridor.`);
      } else if (obj.proximityRisk === 'WARNING' && (calculatedMaxRisk as string) !== 'CRITICAL' && (calculatedMaxRisk as string) !== 'CAMERA_BLOCKED') {
        calculatedMaxRisk = 'WARNING';
        alerts.push(`Caution: ${obj.class.toUpperCase()} detected ahead.`);
      } else if (obj.proximityRisk === 'CAUTION' && calculatedMaxRisk === 'NORMAL') {
        calculatedMaxRisk = 'CAUTION';
      }
    });

    // 2. Evaluate Secondary Traffic Signs
    let isSchoolZoneAhead = Boolean(mapContext?.upcomingSchoolZone);
    let isPedestrianCrossingAhead = Boolean(mapContext?.upcomingPedestrianCrossing);
    let upcomingTurnName = mapContext?.upcomingTurn ?? null;
    let upcomingSpeedLimitVal = mapContext?.upcomingSpeedLimit ?? null;
    let upcomingHazardName = mapContext?.upcomingHazard ?? null;

    if (secondarySign && secondarySign.status === 'ACTIVE') {
      alerts.push(`Sign Detected: ${secondarySign.signType} - ${secondarySign.meaning}`);
      if (secondarySign.signType === 'Stop Sign') {
        calculatedMaxRisk = 'CRITICAL';
      } else if (secondarySign.signType === 'School Zone') {
        isSchoolZoneAhead = true;
        if ((calculatedMaxRisk as string) !== 'CRITICAL' && (calculatedMaxRisk as string) !== 'CAMERA_BLOCKED') {
          calculatedMaxRisk = 'WARNING';
        }
      } else if (secondarySign.signType === 'Pedestrian Crossing') {
        isPedestrianCrossingAhead = true;
        if ((calculatedMaxRisk as string) !== 'CRITICAL' && (calculatedMaxRisk as string) !== 'CAMERA_BLOCKED') {
          calculatedMaxRisk = 'WARNING';
        }
      } else if (secondarySign.signType === 'Sharp Turn' || secondarySign.signType === 'Dangerous Turn') {
        upcomingTurnName = secondarySign.signType;
      }
    }

    // 3. Evaluate Road Geometry
    if (geometryFeature !== 'UNAVAILABLE') {
      if (geometryFeature === 'SHARP_TURN' || geometryFeature === 'WINDING_ROAD') {
        upcomingTurnName = geometryFeature;
        alerts.push(`Road Geometry Warning: ${geometryFeature.replace('_', ' ')} ahead.`);
        if (calculatedMaxRisk === 'NORMAL') {
          calculatedMaxRisk = 'CAUTION';
        }
      }
    }

    // 4. Calculate Dynamic Advisory Speed according to exact Part 3 Rules:
    // IF cameraBlocked: advisorySpeed = 0
    // ELSE IF CRITICAL: advisorySpeed = min(10, legalLimit)
    // ELSE IF WARNING: advisorySpeed = min(25, legalLimit)
    // ELSE IF CAUTION: advisorySpeed = min(40, legalLimit)
    // ELSE: advisorySpeed = legalLimit
    let calculatedAdvisorySpeed = legalSpeedLimitKmH;

    if (calculatedMaxRisk === 'CAMERA_BLOCKED') {
      calculatedAdvisorySpeed = 0;
      alerts.push('🚨 CAMERA BLOCKED: Stop vehicle safely.');
    } else if (calculatedMaxRisk === 'CRITICAL') {
      calculatedAdvisorySpeed = Math.min(10, legalSpeedLimitKmH);
    } else if (calculatedMaxRisk === 'WARNING') {
      calculatedAdvisorySpeed = Math.min(25, legalSpeedLimitKmH);
    } else if (calculatedMaxRisk === 'CAUTION') {
      calculatedAdvisorySpeed = Math.min(40, legalSpeedLimitKmH);
    } else {
      calculatedAdvisorySpeed = legalSpeedLimitKmH;
    }

    if (secondarySign && secondarySign.advisorySpeedLimit !== null) {
      calculatedAdvisorySpeed = Math.min(calculatedAdvisorySpeed, secondarySign.advisorySpeedLimit);
    }

    // Enforce Policy: Advisory Speed MUST NEVER exceed legal state speed limit
    calculatedAdvisorySpeed = Math.min(calculatedAdvisorySpeed, legalSpeedLimitKmH);

    // 5. Evaluate Speed Compliance
    let speedStatus: 'NORMAL' | 'REDUCE_SPEED' | 'IMMEDIATE_BRAKING' = 'NORMAL';
    if (currentSpeedKmH !== null && currentSpeedKmH > calculatedAdvisorySpeed) {
      const overspeed = currentSpeedKmH - calculatedAdvisorySpeed;
      if (overspeed > 20) {
        speedStatus = 'IMMEDIATE_BRAKING';
        alerts.push(`Overspeed Warning: Vehicle travelling at ${currentSpeedKmH} km/h (Advisory: ${calculatedAdvisorySpeed} km/h).`);
      } else {
        speedStatus = 'REDUCE_SPEED';
        alerts.push(`Reduce Speed: Current speed ${currentSpeedKmH} km/h exceeds advisory speed ${calculatedAdvisorySpeed} km/h.`);
      }
    }

    // 6. Source & Degraded Confidence Evaluation
    const isCameraActive = primaryObjects.length >= 0;
    const isGpsActive = latitude !== null && longitude !== null;
    const isMapActive = mapContext?.vectorTileStatus === 'CONNECTED';

    let contextSource: RoadContextSource = 'FUSED';
    let confidenceScore = 1.0;
    const degradedReasons: string[] = [];

    if (isCameraActive && isGpsActive && isMapActive) {
      contextSource = 'FUSED';
      confidenceScore = 1.0;
    } else if (isCameraActive && isGpsActive) {
      contextSource = 'FUSED';
      confidenceScore = 0.85;
      degradedReasons.push('Jio 3D Map vector tile layer unavailable (Operating on Camera AI + GPS + Traffic Rules DB)');
    } else if (isCameraActive) {
      contextSource = 'CAMERA';
      confidenceScore = 0.70;
      degradedReasons.push('GPS and 3D Map layers unavailable (Operating strictly on Camera Perception)');
    } else {
      contextSource = 'TRAFFIC_RULE_DB';
      confidenceScore = 0.50;
      degradedReasons.push('Camera stream offline (Operating on static Traffic Rules DB)');
    }

    const normalizedContext: NormalizedRoadContext = {
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      heading: mapContext?.heading ?? null,
      roadType: mapContext?.roadType ?? null,
      legalSpeedLimit: legalSpeedLimitKmH,
      upcomingTurn: upcomingTurnName,
      upcomingSchoolZone: isSchoolZoneAhead,
      upcomingPedestrianCrossing: isPedestrianCrossingAhead,
      upcomingSpeedLimit: upcomingSpeedLimitVal,
      upcomingHazard: upcomingHazardName,
      source: contextSource,
      confidenceScore,
      degradedReason: degradedReasons.length > 0 ? degradedReasons.join('; ') : null
    };

    return {
      overallRiskLevel: calculatedMaxRisk as 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED',
      legalSpeedLimitKmH,
      advisorySpeedKmH: calculatedAdvisorySpeed,
      speedStatus,
      activeAlerts: alerts,
      normalizedContext,
      perceptionSources: {
        primaryCamera: primaryObjects.length >= 0 ? 'ACTIVE' : 'OFFLINE',
        secondarySignClassifier: secondarySign ? 'ACTIVE' : 'UNAVAILABLE',
        roadGeometrySensor: geometryFeature !== 'UNAVAILABLE' ? 'ACTIVE' : 'UNAVAILABLE',
        gpsSpeed: currentSpeedKmH !== null ? 'ACTIVE' : 'UNAVAILABLE',
        jio3DMapLayer: mapContext?.vectorTileStatus === 'CONNECTED' ? 'CONNECTED' : 'UNAVAILABLE'
      },
      timestamp: new Date().toISOString()
    };
  }
};

export default roadPerceptionService;
