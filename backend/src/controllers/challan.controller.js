import { asyncHandler } from '../utils/asyncHandler.js';
import * as challanService from '../services/challan.service.js';

/**
 * GET /api/challans/:state
 * Retrieve state-wise traffic fine & penalty information based on stored traffic rules
 */
export const getChallanInfoByState = asyncHandler(async (req, res) => {
  const { state } = req.params;
  const { stateName, data, pagination } =
    await challanService.getChallanInfoByState(state, req.query);

  return res.status(200).json({
    success: true,
    message: 'State traffic fine information retrieved successfully',
    type: 'DEFINED_TRAFFIC_FINES',
    state: stateName,
    data,
    pagination
  });
});
