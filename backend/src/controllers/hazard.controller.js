import { asyncHandler } from '../utils/asyncHandler.js';
import * as hazardService from '../services/hazard.service.js';

/**
 * POST /api/hazards
 * Submit a new road hazard report
 */
export const createHazard = asyncHandler(async (req, res) => {
  const newHazard = await hazardService.createHazard(req.body);

  return res.status(201).json({
    success: true,
    message: 'Road hazard reported successfully',
    data: newHazard
  });
});

/**
 * GET /api/hazards
 * Retrieve paginated list of road hazards with optional filters
 */
export const getHazards = asyncHandler(async (req, res) => {
  const { hazards, pagination } = await hazardService.getHazards(req.query);

  return res.status(200).json({
    success: true,
    data: hazards,
    pagination
  });
});

/**
 * GET /api/hazards/nearby
 * Geospatial search for road hazards near a location radius
 */
export const getNearbyHazards = asyncHandler(async (req, res) => {
  const hazards = await hazardService.getNearbyHazards(req.query);

  return res.status(200).json({
    success: true,
    count: hazards.length,
    data: hazards
  });
});

/**
 * PATCH /api/hazards/:id
 * Update or resolve an existing road hazard
 */
export const updateHazard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedHazard = await hazardService.updateHazard(id, req.body);

  return res.status(200).json({
    success: true,
    message: 'Road hazard updated successfully',
    data: updatedHazard
  });
});
