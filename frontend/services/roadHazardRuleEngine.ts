import { StandardRoadHazardDetection, RoadHazardType } from '@/types/roadHazard';

export const roadHazardRuleEngine = {
  /**
   * Evaluates raw object/sign detections and returns structured StandardRoadHazardDetection with distance & advisory speed rules
   */
  evaluateDetection: (
    type: RoadHazardType,
    label: string,
    confidence: number,
    bbox: { x: number; y: number; width: number; height: number },
    videoHeight: number,
    legalSpeedLimitKmH: number
  ): StandardRoadHazardDetection => {
    const heightRatio = bbox.height / (videoHeight || 480);

    // Bounding-box geometry distance estimation formula
    const distanceEstimateMeters = Math.max(5, Math.min(50, Math.round(15.0 / (heightRatio + 0.05))));

    let proximityLevel: 'FAR' | 'CAUTION' | 'NEAR' | 'CRITICAL' = 'FAR';
    if (heightRatio >= 0.55) proximityLevel = 'CRITICAL';
    else if (heightRatio >= 0.35) proximityLevel = 'NEAR';
    else if (heightRatio >= 0.15) proximityLevel = 'CAUTION';
    else proximityLevel = 'FAR';

    let risk: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    let advisorySpeedLimitKmH = legalSpeedLimitKmH;
    let alertTitle = '';
    let alertMessage = '';

    switch (type) {
      case 'zebra_crossing':
      case 'pedestrian_crossing':
        risk = proximityLevel === 'CRITICAL' || proximityLevel === 'NEAR' ? 'HIGH' : 'MEDIUM';
        advisorySpeedLimitKmH = proximityLevel === 'CRITICAL' ? 15 : proximityLevel === 'NEAR' ? 20 : 25;
        alertTitle = type === 'zebra_crossing' ? 'ZEBRA CROSSING DETECTED' : 'PEDESTRIAN CROSSING DETECTED';
        alertMessage = 'Reduce Speed — Pedestrian Crossing Ahead';
        break;

      case 'school_zone':
      case 'school_sign':
        risk = 'HIGH';
        advisorySpeedLimitKmH = Math.min(25, legalSpeedLimitKmH);
        alertTitle = 'SCHOOL ZONE DETECTED';
        alertMessage = 'Reduce Speed — School Area Ahead';
        break;

      case 'sharp_turn':
        risk = proximityLevel === 'CRITICAL' || proximityLevel === 'NEAR' ? 'HIGH' : 'MEDIUM';
        advisorySpeedLimitKmH = Math.min(30, legalSpeedLimitKmH);
        alertTitle = 'SHARP TURN AHEAD';
        alertMessage = 'Reduce Speed — Sharp Curve Ahead';
        break;

      case 'left_turn':
        risk = 'MEDIUM';
        advisorySpeedLimitKmH = Math.min(35, legalSpeedLimitKmH);
        alertTitle = 'LEFT TURN AHEAD';
        alertMessage = 'Reduce Speed — Turn Ahead';
        break;

      case 'right_turn':
        risk = 'MEDIUM';
        advisorySpeedLimitKmH = Math.min(35, legalSpeedLimitKmH);
        alertTitle = 'RIGHT TURN AHEAD';
        alertMessage = 'Reduce Speed — Turn Ahead';
        break;

      case 'stop_sign':
        risk = 'CRITICAL';
        advisorySpeedLimitKmH = proximityLevel === 'CRITICAL' ? 0 : 10;
        alertTitle = 'STOP SIGN DETECTED';
        alertMessage = 'Prepare to Stop Vehicle';
        break;

      case 'speed_limit': {
        risk = 'MEDIUM';
        let limitVal = 40;
        if (label.includes('30')) limitVal = 30;
        if (label.includes('40')) limitVal = 40;
        if (label.includes('50')) limitVal = 50;
        if (label.includes('80')) limitVal = 80;
        advisorySpeedLimitKmH = Math.min(limitVal, legalSpeedLimitKmH);
        alertTitle = `SPEED LIMIT ${limitVal} DETECTED`;
        alertMessage = `Maximum Speed Limit ${limitVal} km/h Sign Detected`;
        break;
      }

      case 'traffic_light':
        risk = 'MEDIUM';
        advisorySpeedLimitKmH = Math.min(35, legalSpeedLimitKmH);
        alertTitle = 'TRAFFIC LIGHT DETECTED';
        alertMessage = 'Scan Signals Ahead';
        break;

      case 'road_obstacle':
      default:
        risk = proximityLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        advisorySpeedLimitKmH = proximityLevel === 'CRITICAL' ? 10 : 20;
        alertTitle = 'OBSTACLE DETECTED';
        alertMessage = 'Obstacle in Lane Corridor — Apply Brakes';
        break;
    }

    // Advisory speed MUST NEVER exceed posted legal speed limit
    advisorySpeedLimitKmH = Math.min(advisorySpeedLimitKmH, legalSpeedLimitKmH);

    return {
      id: `hazard_${Math.random().toString(36).substring(2, 7)}`,
      type,
      label,
      confidence,
      bbox,
      distanceEstimateMeters,
      proximityLevel,
      risk,
      advisorySpeedLimitKmH,
      alertTitle,
      alertMessage
    };
  },

  /**
   * Fuses multiple simultaneous hazard detections and returns the most dangerous / lowest advisory speed condition (Step 7)
   */
  fuseMultipleHazards: (
    hazards: StandardRoadHazardDetection[],
    legalSpeedLimitKmH: number
  ): {
    primaryHazard: StandardRoadHazardDetection | null;
    lowestAdvisorySpeedKmH: number;
    combinedAlertTitle: string;
    combinedAlertMessage: string;
    highestRiskLevel: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } => {
    if (!hazards || hazards.length === 0) {
      return {
        primaryHazard: null,
        lowestAdvisorySpeedKmH: legalSpeedLimitKmH,
        combinedAlertTitle: '',
        combinedAlertMessage: '',
        highestRiskLevel: 'NORMAL'
      };
    }

    let minAdvisory = legalSpeedLimitKmH;
    let primary: StandardRoadHazardDetection = hazards[0];
    let highestRisk: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NORMAL';

    const riskRank = { NORMAL: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

    hazards.forEach((h) => {
      if (h.advisorySpeedLimitKmH < minAdvisory) {
        minAdvisory = h.advisorySpeedLimitKmH;
      }
      if (riskRank[h.risk] > riskRank[highestRisk]) {
        highestRisk = h.risk;
        primary = h;
      }
    });

    const hazardLabels = Array.from(new Set(hazards.map((h) => h.label))).join(' + ');

    return {
      primaryHazard: primary,
      lowestAdvisorySpeedKmH: minAdvisory,
      combinedAlertTitle: `${highestRisk} ROAD SAFETY ALERT: ${primary.alertTitle}`,
      combinedAlertMessage: `${hazardLabels} DETECTED. ${primary.alertMessage}`,
      highestRiskLevel: highestRisk
    };
  }
};

export default roadHazardRuleEngine;
