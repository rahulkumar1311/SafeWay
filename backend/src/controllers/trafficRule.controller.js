import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as trafficRuleService from '../services/trafficRule.service.js';
import { syncFromDataGov } from '../services/govTrafficData.service.js';

/**
 * GET /api/traffic-rules/applicable?state=Bihar&city=Patna&vehicleType=TwoWheeler
 * Hierarchical Rule Resolution Controller (City Rules ➔ State Rules ➔ Central Rules)
 */
export const getApplicableRules = asyncHandler(async (req, res) => {
  const { rules, pagination } = await trafficRuleService.getApplicableRules(req.query);

  return res.status(200).json({
    success: true,
    message: 'Applicable traffic rules fetched successfully',
    data: rules,
    pagination
  });
});

/**
 * GET /api/traffic-rules/city/:city
 * Controller to fetch city-specific traffic rules
 */
export const getRulesByCity = asyncHandler(async (req, res) => {
  const { city } = req.params;
  const { rules, pagination } = await trafficRuleService.getRulesByCity(city, req.query);

  return res.status(200).json({
    success: true,
    message: 'City traffic rules fetched successfully',
    data: rules,
    pagination
  });
});

/**
 * GET /api/traffic-rules/state/:state
 * Controller to retrieve traffic rules applicable to a specific state (Central + State combined)
 */
export const getRulesByState = asyncHandler(async (req, res) => {
  const state = req.params.state || req.params.idOrState;
  const { rules, pagination } = await trafficRuleService.getRulesByState(
    state,
    req.query
  );

  return res.status(200).json({
    success: true,
    message: 'Traffic rules fetched successfully',
    data: rules,
    pagination
  });
});

/**
 * GET /api/traffic-rules
 * Controller to list all traffic rules with optional filtering and pagination
 */
export const getAllRules = asyncHandler(async (req, res) => {
  const { rules, pagination } = await trafficRuleService.getAllRules(req.query);

  return res.status(200).json({
    success: true,
    message: 'Traffic rules fetched successfully',
    data: rules,
    pagination
  });
});

/**
 * POST /api/traffic-rules/sync
 * Trigger Data.gov.in Government Traffic Rule Dataset Synchronization
 */
export const syncGovTrafficRules = asyncHandler(async (req, res) => {
  const summary = await syncFromDataGov();

  return res.status(200).json({
    success: true,
    message: 'Government traffic rules synchronized successfully',
    data: summary
  });
});

/**
 * GET /api/traffic-rules/:idOrState
 * Controller to resolve single rule by Mongo ID / ruleCode or handle legacy state path
 */
export const getRuleByIdOrState = asyncHandler(async (req, res) => {
  const { idOrState } = req.params;

  if (mongoose.Types.ObjectId.isValid(idOrState) || /^[A-Z]{2,4}-[A-Z0-9-]+$/i.test(idOrState)) {
    try {
      const rule = await trafficRuleService.getRuleByIdOrCode(idOrState);
      return res.status(200).json({
        success: true,
        message: 'Traffic rule details fetched successfully',
        data: rule
      });
    } catch (err) {
      if (err.statusCode === 404 && !mongoose.Types.ObjectId.isValid(idOrState)) {
        const { rules, pagination } = await trafficRuleService.getRulesByState(idOrState, req.query);
        return res.status(200).json({
          success: true,
          message: 'Traffic rules fetched successfully',
          data: rules,
          pagination
        });
      }
      throw err;
    }
  }

  const { rules, pagination } = await trafficRuleService.getRulesByState(idOrState, req.query);
  return res.status(200).json({
    success: true,
    message: 'Traffic rules fetched successfully',
    data: rules,
    pagination
  });
});

/**
 * GET /api/traffic-rules/category/:category
 * Controller to fetch traffic rules by category
 */
export const getRulesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { rules, pagination } = await trafficRuleService.getRulesByCategory(
    category,
    req.query
  );

  return res.status(200).json({
    success: true,
    message: 'Traffic rules by category fetched successfully',
    data: rules,
    pagination
  });
});

/**
 * GET /api/traffic-rules/search
 * Controller to search traffic rules using query parameter 'q' or 'search'
 */
export const searchRules = asyncHandler(async (req, res) => {
  const searchQuery = req.query.q || req.query.search;
  const { rules, pagination } = await trafficRuleService.searchRules(
    searchQuery,
    req.query
  );

  return res.status(200).json({
    success: true,
    message: 'Traffic rules search results fetched successfully',
    data: rules,
    pagination
  });
});

/**
 * GET /api/traffic-rules/vehicle/:vehicleType
 * Controller to fetch traffic rules by vehicle type
 */
export const getRulesByVehicleType = asyncHandler(async (req, res) => {
  const { vehicleType } = req.params;
  const { rules, pagination } = await trafficRuleService.getRulesByVehicleType(
    vehicleType,
    req.query
  );

  return res.status(200).json({
    success: true,
    message: 'Traffic rules by vehicle type fetched successfully',
    data: rules,
    pagination
  });
});
