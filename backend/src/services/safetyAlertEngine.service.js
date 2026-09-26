import { ApiError } from '../utils/ApiError.js';

/**
 * Safety Alert Engine converts detected road signs, hazards, and vehicle context into actionable driver alerts.
 * @param {Object} context - Context containing signType, hazardType, speed, speedLimit, latitude, longitude, source
 */
export const generateRoadSafetyAlert = (context = {}) => {
  const { signType, hazardType, speed = 0, speedLimit = 60, source = 'AI_CAMERA' } = context;

  const alerts = [];
  let severity = 'LOW';
  let recommendedSpeed = null;

  // 1. Evaluate Traffic Sign Events
  if (signType) {
    const cleanSign = String(signType).trim();
    if (cleanSign === 'School Zone' || cleanSign === 'School ahead') {
      severity = 'MEDIUM';
      recommendedSpeed = 25;
      alerts.push('School zone detected ahead. Reduce speed to 25 km/h.');
    } else if (cleanSign === 'Sharp Turn' || cleanSign === 'Dangerous Turn') {
      severity = 'MEDIUM';
      recommendedSpeed = 30;
      alerts.push('Sharp turn detected ahead. Decelerate to 30 km/h.');
    } else if (cleanSign === 'Zig-Zag Road') {
      severity = 'MEDIUM';
      recommendedSpeed = 35;
      alerts.push('Winding road ahead. Maintain cautious speed and steering control.');
    } else if (cleanSign === 'Stop Sign') {
      severity = 'HIGH';
      recommendedSpeed = 0;
      alerts.push('Stop sign ahead. Bring vehicle to a complete stop.');
    } else if (cleanSign === 'Pedestrian Crossing') {
      severity = 'MEDIUM';
      recommendedSpeed = 30;
      alerts.push('Pedestrian crossing ahead. Watch for pedestrians and yield right-of-way.');
    } else if (cleanSign === 'No Entry') {
      severity = 'HIGH';
      alerts.push('No entry sign detected. Do not enter this roadway.');
    } else if (cleanSign === 'Construction') {
      severity = 'MEDIUM';
      recommendedSpeed = 40;
      alerts.push('Road work construction ahead. Proceed with caution.');
    }
  }

  // 2. Evaluate Road Hazard Events
  if (hazardType) {
    const cleanHazard = String(hazardType).trim().toLowerCase();
    if (cleanHazard === 'pothole') {
      severity = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
      alerts.push('Severe pothole reported ahead. Stay alert.');
    } else if (cleanHazard === 'accident') {
      severity = 'HIGH';
      alerts.push('Accident zone reported ahead. Expect traffic deceleration.');
    } else if (cleanHazard === 'waterlogging') {
      severity = 'MEDIUM';
      alerts.push('Waterlogging reported ahead. Avoid high speeds.');
    } else if (cleanHazard === 'roadblock') {
      severity = 'HIGH';
      alerts.push('Road blockade ahead. Select alternative route if possible.');
    }
  }

  // 3. Evaluate Speeding Context
  if (speed > speedLimit) {
    const overspeed = speed - speedLimit;
    if (overspeed > 20) {
      severity = 'HIGH';
      alerts.push(`Excessive speeding! Vehicle speed is ${speed} km/h (Limit: ${speedLimit} km/h).`);
    } else {
      severity = severity === 'HIGH' ? 'HIGH' : 'MEDIUM';
      alerts.push(`Vehicle exceeding speed limit. Current speed: ${speed} km/h (Limit: ${speedLimit} km/h).`);
    }
  }

  return {
    alertGenerated: alerts.length > 0,
    alerts,
    severity,
    recommendedSpeed,
    source,
    timestamp: new Date().toISOString()
  };
};

export default { generateRoadSafetyAlert };
