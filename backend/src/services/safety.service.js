import SafetyRecord from '../models/SafetyRecord.js';
import { ApiError } from '../utils/ApiError.js';

// Configurable risk thresholds
export const RISK_THRESHOLDS = {
  HIGH_RISK_SCORE: 70,
  MEDIUM_RISK_SCORE: 35,
  DROWSINESS_HIGH: 70,
  DROWSINESS_MODERATE: 40,
  SPEED_EXCESS_HIGH: 20,
  HARSH_BRAKING_HIGH: 3
};

/**
 * Transparent rule-based risk evaluation engine with MongoDB SafetyRecord persistence
 */
export const analyzeSafetyRisk = async (inputData = {}) => {
  const {
    userId,
    drowsinessScore,
    speed,
    speedLimit,
    harshBraking = 0,
    roadHazard = false,
    events = [],
    drivingScore
  } = inputData;

  // Validation
  const missingFields = [];
  if (drowsinessScore === undefined || drowsinessScore === null || drowsinessScore === '') {
    missingFields.push('drowsinessScore');
  }
  if (speed === undefined || speed === null || speed === '') {
    missingFields.push('speed');
  }
  if (speedLimit === undefined || speedLimit === null || speedLimit === '') {
    missingFields.push('speedLimit');
  }

  if (missingFields.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
  }

  const dScore = Number(drowsinessScore);
  if (isNaN(dScore) || dScore < 0 || dScore > 100) {
    throw new ApiError(400, 'drowsinessScore must be a number between 0 and 100');
  }

  const speedNum = Number(speed);
  if (isNaN(speedNum) || speedNum < 0) {
    throw new ApiError(400, 'speed must be a valid non-negative number');
  }

  const speedLimitNum = Number(speedLimit);
  if (isNaN(speedLimitNum) || speedLimitNum < 0) {
    throw new ApiError(400, 'speedLimit must be a valid non-negative number');
  }

  const brakingNum = Number(harshBraking);
  if (isNaN(brakingNum) || brakingNum < 0) {
    throw new ApiError(400, 'harshBraking must be a valid non-negative number');
  }

  if (events && !Array.isArray(events)) {
    throw new ApiError(400, 'events parameter must be an array');
  }

  let userDrivingScore;
  if (drivingScore !== undefined && drivingScore !== null && drivingScore !== '') {
    const parsedDrivingScore = Number(drivingScore);
    if (isNaN(parsedDrivingScore) || parsedDrivingScore < 0 || parsedDrivingScore > 100) {
      throw new ApiError(400, 'drivingScore must be a number between 0 and 100');
    }
    userDrivingScore = parsedDrivingScore;
  }

  const isHazard = Boolean(roadHazard);

  let totalScore = 0;
  const reasons = [];
  const recommendations = [];

  // Rule 1: Drowsiness Evaluation
  if (dScore >= RISK_THRESHOLDS.DROWSINESS_HIGH) {
    totalScore += 35;
    reasons.push('High drowsiness detected');
    recommendations.push('Take a break immediately');
  } else if (dScore >= RISK_THRESHOLDS.DROWSINESS_MODERATE) {
    totalScore += 20;
    reasons.push('Mild drowsiness detected');
    recommendations.push('Consider taking a rest break soon');
  }

  // Rule 2: Speeding Evaluation
  if (speedNum > speedLimitNum) {
    const excess = speedNum - speedLimitNum;
    if (excess >= RISK_THRESHOLDS.SPEED_EXCESS_HIGH) {
      totalScore += 30;
      reasons.push('Speed is significantly above the detected limit');
      recommendations.push('Reduce speed immediately');
    } else {
      totalScore += 15;
      reasons.push('Speed is above the detected limit');
      recommendations.push('Reduce speed');
    }
  }

  // Rule 3: Harsh Braking Evaluation
  if (brakingNum >= RISK_THRESHOLDS.HARSH_BRAKING_HIGH) {
    totalScore += 20;
    reasons.push('Multiple harsh braking events detected');
    recommendations.push('Maintain safe following distance');
  } else if (brakingNum >= 1) {
    totalScore += 10;
    reasons.push('Harsh braking detected');
    recommendations.push('Drive smoothly and avoid sudden stops');
  }

  // Rule 4: Nearby Road Hazard Evaluation
  if (isHazard) {
    totalScore += 15;
    reasons.push('Road hazard reported nearby');
    recommendations.push('Drive with caution and stay alert');
  }

  // Cap score at 100
  const finalRiskScore = Math.min(100, Math.round(totalScore));

  // Determine Risk Level (LOW, MEDIUM, HIGH)
  let riskLevel = 'LOW';
  if (finalRiskScore >= RISK_THRESHOLDS.HIGH_RISK_SCORE) {
    riskLevel = 'HIGH';
  } else if (finalRiskScore >= RISK_THRESHOLDS.MEDIUM_RISK_SCORE) {
    riskLevel = 'MEDIUM';
  }

  if (reasons.length === 0) {
    reasons.push('No significant driving risks detected');
    recommendations.push('Maintain current safe driving practices');
  }

  // Calculate drivingScore if not explicitly provided (100 - riskScore)
  const calculatedDrivingScore =
    userDrivingScore !== undefined ? userDrivingScore : Math.max(0, 100 - finalRiskScore);

  const formattedEvents =
    Array.isArray(events) && events.length > 0
      ? events
      : reasons.map((reason) => ({ eventType: 'RISK_SIGNAL', details: reason, timestamp: new Date() }));

  // Create and save SafetyRecord document to MongoDB
  const savedRecord = await SafetyRecord.create({
    userId: userId ? String(userId).trim() : null,
    drowsinessScore: dScore,
    drivingScore: calculatedDrivingScore,
    riskLevel,
    events: formattedEvents,
    recordedAt: new Date()
  });

  return {
    recordId: savedRecord._id,
    userId: savedRecord.userId,
    riskLevel: savedRecord.riskLevel,
    riskScore: finalRiskScore,
    drowsinessScore: savedRecord.drowsinessScore,
    drivingScore: savedRecord.drivingScore,
    reasons,
    recommendations,
    events: savedRecord.events,
    recordedAt: savedRecord.recordedAt
  };
};

/**
 * Retrieve safety records for a user
 */
export const getSafetyRecordsByUserId = async (userId) => {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new ApiError(400, 'User ID is required');
  }

  const records = await SafetyRecord.find({ userId: userId.trim() })
    .select('-__v')
    .sort({ recordedAt: -1 })
    .lean();

  return records;
};
