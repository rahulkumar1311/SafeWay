import TrafficRule from '../models/TrafficRule.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Escapes special regex characters to prevent regex injection attacks.
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Fetch state-wise traffic fine & challan penalty information derived from TrafficRule
 */
export const getChallanInfoByState = async (stateParam, queryParams = {}) => {
  // 1. State parameter validation
  if (!stateParam || typeof stateParam !== 'string' || !stateParam.trim()) {
    throw new ApiError(400, 'State parameter is required and must be a non-empty string');
  }

  const cleanState = stateParam.trim();

  // 2. Explicit filter construction with regex escaping
  const filter = {
    state: { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') }
  };

  // 3. Optional category filter
  if (queryParams.category !== undefined && queryParams.category !== null) {
    if (typeof queryParams.category !== 'string') {
      throw new ApiError(400, 'Category filter must be a string');
    }
    const cleanCategory = queryParams.category.trim();
    if (cleanCategory) {
      filter.category = { $regex: new RegExp(`^${escapeRegExp(cleanCategory)}$`, 'i') };
    }
  }

  // 4. Optional vehicleType filter
  if (queryParams.vehicleType !== undefined && queryParams.vehicleType !== null) {
    if (typeof queryParams.vehicleType !== 'string') {
      throw new ApiError(400, 'Vehicle type filter must be a string');
    }
    const cleanVehicleType = queryParams.vehicleType.trim();
    if (cleanVehicleType) {
      filter.vehicleType = { $regex: new RegExp(`^${escapeRegExp(cleanVehicleType)}$`, 'i') };
    }
  }

  // 5. Validate pagination - page
  let pageNum = 1;
  if (queryParams.page !== undefined && queryParams.page !== null && queryParams.page !== '') {
    const rawPage = String(queryParams.page).trim();
    const parsedPage = Number(rawPage);
    if (isNaN(parsedPage) || !Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new ApiError(400, 'Page parameter must be a positive integer');
    }
    pageNum = parsedPage;
  }

  // 6. Validate pagination - limit
  let limitNum = 20;
  if (queryParams.limit !== undefined && queryParams.limit !== null && queryParams.limit !== '') {
    const rawLimit = String(queryParams.limit).trim();
    const parsedLimit = Number(rawLimit);
    if (isNaN(parsedLimit) || !Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw new ApiError(400, 'Limit parameter must be a positive integer');
    }
    if (parsedLimit > 50) {
      throw new ApiError(400, 'Limit parameter cannot exceed maximum allowed limit of 50');
    }
    limitNum = parsedLimit;
  }

  const skip = (pageNum - 1) * limitNum;

  // 7. Execute count and fine records query concurrently
  const [total, records] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ fineAmount: -1, category: 1, title: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const formattedData = records.map((item) => ({
    id: item._id,
    title: item.title,
    category: item.category,
    vehicleType: item.vehicleType,
    fineAmount: item.fineAmount,
    description: item.description,
    sourceUrl: item.sourceUrl || '',
    lastUpdated: item.lastUpdated || item.updatedAt
  }));

  const totalPages = Math.ceil(total / limitNum) || 0;

  // Capitalize first letter of state name for clean response presentation
  const normalizedStateName =
    cleanState.charAt(0).toUpperCase() + cleanState.slice(1);

  return {
    stateName: normalizedStateName,
    data: formattedData,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};
