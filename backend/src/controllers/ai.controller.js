import { asyncHandler } from '../utils/asyncHandler.js';
import * as aiService from '../services/ai.service.js';

/**
 * POST /api/ai/drowsiness/analyze
 * Process driver frame data through AI Drowsiness Inference Service
 */
export const analyzeDrowsiness = asyncHandler(async (req, res) => {
  const result = await aiService.analyzeDrowsinessFrame(req.body);

  return res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * POST /api/ai/traffic-sign/analyze
 * Process traffic sign image data through AI Traffic Sign Inference Service
 */
export const analyzeTrafficSign = asyncHandler(async (req, res) => {
  const result = await aiService.analyzeTrafficSignImage(req.body);

  return res.status(200).json({
    success: true,
    data: result
  });
});
