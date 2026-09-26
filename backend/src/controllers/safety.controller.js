import { asyncHandler } from '../utils/asyncHandler.js';
import * as safetyService from '../services/safety.service.js';

/**
 * POST /api/safety/analyze
 * Evaluate driving safety signals & persist SafetyRecord to MongoDB
 */
export const analyzeSafetyRisk = asyncHandler(async (req, res) => {
  const riskAnalysis = await safetyService.analyzeSafetyRisk(req.body);

  return res.status(200).json({
    success: true,
    message: 'Safety risk analysis completed and recorded',
    data: riskAnalysis
  });
});

/**
 * GET /api/safety/records/:userId
 * Retrieve stored safety records for a user
 */
export const getSafetyRecordsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const records = await safetyService.getSafetyRecordsByUserId(userId);

  return res.status(200).json({
    success: true,
    count: records.length,
    data: records
  });
});
