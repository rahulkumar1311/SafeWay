import mongoose from 'mongoose';
import TrafficRule from '../models/TrafficRule.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Escapes special regex characters to prevent regex injection attacks.
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validates and parses pagination parameters (page, limit).
 */
const parsePagination = (queryParams) => {
  let pageNum = 1;
  if (queryParams.page !== undefined && queryParams.page !== null && queryParams.page !== '') {
    const rawPage = String(queryParams.page).trim();
    const parsedPage = Number(rawPage);
    if (isNaN(parsedPage) || !Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new ApiError(400, 'Page parameter must be a positive integer');
    }
    pageNum = parsedPage;
  }

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
  return { pageNum, limitNum, skip };
};

const getCategoryRegex = (category) => {
  const clean = category.trim();
  const lower = clean.toLowerCase();

  if (lower === 'seat belt' || lower === 'seatbelt') {
    return new RegExp('^(seat\\s*belt|seatbelt)$', 'i');
  }
  if (lower === 'drunk driving' || lower === 'drunkdriving') {
    return new RegExp('^(drunk\\s*driving|drunkdriving)$', 'i');
  }
  if (lower === 'mobile phone while driving' || lower === 'mobileusage' || lower === 'mobile') {
    return new RegExp('(mobile|phone)', 'i');
  }
  if (lower === 'signal violation' || lower === 'signal') {
    return new RegExp('^signal', 'i');
  }
  if (lower === 'driving without licence' || lower === 'licensing' || lower === 'license') {
    return new RegExp('(licen|licensing)', 'i');
  }

  return new RegExp(`^${escapeRegExp(clean)}$`, 'i');
};

/**
 * Appends optional filter conditions (category, vehicleType, status, search) to MongoDB query object.
 */
const applyCommonFilters = (filterObj, queryParams) => {
  if (queryParams.category !== undefined && queryParams.category !== null) {
    if (typeof queryParams.category !== 'string') {
      throw new ApiError(400, 'Category filter must be a text string');
    }
    const cleanCategory = queryParams.category.trim();
    if (cleanCategory) {
      filterObj.category = { $regex: getCategoryRegex(cleanCategory) };
    }
  }

  if (queryParams.vehicleType !== undefined && queryParams.vehicleType !== null) {
    if (typeof queryParams.vehicleType !== 'string') {
      throw new ApiError(400, 'VehicleType filter must be a text string');
    }
    const cleanVehicleType = queryParams.vehicleType.trim();
    if (cleanVehicleType) {
      const vehRegex = new RegExp(escapeRegExp(cleanVehicleType), 'i');
      filterObj.$and = filterObj.$and || [];
      filterObj.$and.push({
        $or: [
          { vehicleType: { $regex: vehRegex } },
          { applicableVehicleTypes: { $elemMatch: { $regex: vehRegex } } },
          { vehicleType: 'All' },
          { applicableVehicleTypes: 'All' }
        ]
      });
    }
  }

  if (queryParams.status !== undefined && queryParams.status !== null) {
    if (typeof queryParams.status !== 'string') {
      throw new ApiError(400, 'Status filter must be a text string');
    }
    const cleanStatus = queryParams.status.trim().toUpperCase();
    if (cleanStatus) {
      filterObj.status = cleanStatus;
    }
  }

  if (queryParams.scope !== undefined && queryParams.scope !== null) {
    if (typeof queryParams.scope !== 'string') {
      throw new ApiError(400, 'Scope filter must be a text string');
    }
    const cleanScope = queryParams.scope.trim().toUpperCase();
    if (cleanScope) {
      filterObj.scope = cleanScope;
    }
  }

  const searchQuery = queryParams.q || queryParams.search;
  if (searchQuery !== undefined && searchQuery !== null) {
    if (typeof searchQuery !== 'string') {
      throw new ApiError(400, 'Search query must be a text string');
    }
    const cleanSearch = searchQuery.trim();
    if (cleanSearch) {
      const searchRegex = new RegExp(escapeRegExp(cleanSearch), 'i');
      filterObj.$and = filterObj.$and || [];
      filterObj.$and.push({
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { violation: { $regex: searchRegex } },
          { legalSection: { $regex: searchRegex } },
          { ruleCode: { $regex: searchRegex } }
        ]
      });
    }
  }
};

/**
 * Rule Resolution Hierarchy:
 * Resolves applicable traffic rules in hierarchical order:
 * 1. City-specific rules (for requested city)
 * 2. State-specific rules (for requested state)
 * 3. Central nationwide rules
 */
export const getApplicableRules = async (queryParams = {}) => {
  const { state, city } = queryParams;

  const cleanState = (state && typeof state === 'string') ? state.trim() : null;
  const cleanCity = (city && typeof city === 'string') ? city.trim() : null;

  const filter = {};

  if (cleanCity && cleanState) {
    filter.$or = [
      { scope: 'CITY', city: { $regex: new RegExp(`^${escapeRegExp(cleanCity)}$`, 'i') }, state: { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') } },
      { scope: 'STATE', state: { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') } },
      { scope: 'CENTRAL' }
    ];
  } else if (cleanState) {
    filter.$or = [
      { scope: 'STATE', state: { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') } },
      { scope: 'CENTRAL' }
    ];
  } else if (cleanCity) {
    filter.$or = [
      { scope: 'CITY', city: { $regex: new RegExp(`^${escapeRegExp(cleanCity)}$`, 'i') } },
      { scope: 'CENTRAL' }
    ];
  }

  applyCommonFilters(filter, queryParams);
  const { pageNum, limitNum, skip } = parsePagination(queryParams);

  const [total, allRawRules] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ scope: -1, category: 1, title: 1 }) // CITY ➔ STATE ➔ CENTRAL priority sorting
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  // Deduplicate rules where City/State rules override Central rules with same title or ruleCode
  const seenKeys = new Set();
  const rules = [];
  for (const rule of allRawRules) {
    const key = `${rule.category.toUpperCase()}_${rule.title.toUpperCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      rules.push(rule);
    }
  }

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

/**
 * Fetch traffic rules by city.
 */
export const getRulesByCity = async (cityParam, queryParams = {}) => {
  if (!cityParam || typeof cityParam !== 'string' || !cityParam.trim()) {
    throw new ApiError(400, 'City parameter is required and must be a valid text string');
  }

  const cleanCity = cityParam.trim();
  const filter = {
    $or: [
      { scope: 'CENTRAL' },
      { city: { $regex: new RegExp(`^${escapeRegExp(cleanCity)}$`, 'i') } }
    ]
  };

  applyCommonFilters(filter, queryParams);
  const { pageNum, limitNum, skip } = parsePagination(queryParams);

  const [total, rules] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ scope: -1, category: 1, title: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

/**
 * Fetch traffic rules by state.
 */
export const getRulesByState = async (stateParam, queryParams = {}) => {
  if (!stateParam || typeof stateParam !== 'string' || !stateParam.trim()) {
    throw new ApiError(400, 'State parameter is required and must be a valid text string');
  }

  const cleanState = stateParam.trim();
  const stateRegex = new RegExp(`^${escapeRegExp(cleanState)}$`, 'i');

  const filter = {
    $or: [
      { scope: 'CENTRAL' },
      { state: { $regex: stateRegex } }
    ]
  };

  applyCommonFilters(filter, queryParams);
  const { pageNum, limitNum, skip } = parsePagination(queryParams);

  const [total, rules] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ scope: -1, category: 1, title: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

/**
 * Fetch all traffic rules with optional filtering and pagination.
 */
export const getAllRules = async (queryParams = {}) => {
  const filter = {};

  if (queryParams.state !== undefined && queryParams.state !== null) {
    if (typeof queryParams.state !== 'string') {
      throw new ApiError(400, 'State parameter must be a text string');
    }
    const cleanState = queryParams.state.trim();
    if (cleanState) {
      filter.state = { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') };
    }
  }

  applyCommonFilters(filter, queryParams);
  const { pageNum, limitNum, skip } = parsePagination(queryParams);

  const [total, rules] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ category: 1, title: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

/**
 * Fetch a single traffic rule by ID or ruleCode.
 */
export const getRuleByIdOrCode = async (idOrCode) => {
  if (!idOrCode || typeof idOrCode !== 'string' || !idOrCode.trim()) {
    throw new ApiError(400, 'Rule identifier parameter is required');
  }

  const cleanId = idOrCode.trim();
  let query;

  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    query = { _id: cleanId };
  } else {
    query = { ruleCode: { $regex: new RegExp(`^${escapeRegExp(cleanId)}$`, 'i') } };
  }

  const rule = await TrafficRule.findOne(query).select('-__v').lean();

  if (!rule) {
    throw new ApiError(404, `Traffic rule not found for identifier '${cleanId}'`);
  }

  return rule;
};

/**
 * Fetch traffic rules by category.
 */
export const getRulesByCategory = async (categoryParam, queryParams = {}) => {
  if (!categoryParam || typeof categoryParam !== 'string' || !categoryParam.trim()) {
    throw new ApiError(400, 'Category parameter is required');
  }

  const cleanCategory = categoryParam.trim();
  const filter = {
    category: { $regex: new RegExp(`^${escapeRegExp(cleanCategory)}$`, 'i') }
  };

  if (queryParams.state !== undefined && queryParams.state !== null) {
    const cleanState = String(queryParams.state).trim();
    if (cleanState) {
      filter.$or = [
        { scope: 'CENTRAL' },
        { state: { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') } }
      ];
    }
  }

  applyCommonFilters(filter, queryParams);
  const { pageNum, limitNum, skip } = parsePagination(queryParams);

  const [total, rules] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ title: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

/**
 * Search traffic rules by query term.
 */
export const searchRules = async (searchQuery, queryParams = {}) => {
  if (!searchQuery || typeof searchQuery !== 'string' || !searchQuery.trim()) {
    throw new ApiError(400, 'Search query string is required');
  }

  const cleanQuery = searchQuery.trim();
  const searchRegex = new RegExp(escapeRegExp(cleanQuery), 'i');

  const filter = {
    $or: [
      { title: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { violation: { $regex: searchRegex } },
      { legalSection: { $regex: searchRegex } },
      { ruleCode: { $regex: searchRegex } }
    ]
  };

  if (queryParams.state !== undefined && queryParams.state !== null) {
    const cleanState = String(queryParams.state).trim();
    if (cleanState) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { scope: 'CENTRAL' },
          { state: { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') } }
        ]
      });
    }
  }

  applyCommonFilters(filter, queryParams);
  const { pageNum, limitNum, skip } = parsePagination(queryParams);

  const [total, rules] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ title: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

/**
 * Fetch traffic rules by vehicle type.
 */
export const getRulesByVehicleType = async (vehicleTypeParam, queryParams = {}) => {
  if (!vehicleTypeParam || typeof vehicleTypeParam !== 'string' || !vehicleTypeParam.trim()) {
    throw new ApiError(400, 'Vehicle type parameter is required');
  }

  const cleanVehicle = vehicleTypeParam.trim();
  const vehRegex = new RegExp(escapeRegExp(cleanVehicle), 'i');

  const filter = {
    $or: [
      { vehicleType: { $regex: vehRegex } },
      { applicableVehicleTypes: { $elemMatch: { $regex: vehRegex } } },
      { vehicleType: 'All' },
      { applicableVehicleTypes: 'All' }
    ]
  };

  if (queryParams.state !== undefined && queryParams.state !== null) {
    const cleanState = String(queryParams.state).trim();
    if (cleanState) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { scope: 'CENTRAL' },
          { state: { $regex: new RegExp(`^${escapeRegExp(cleanState)}$`, 'i') } }
        ]
      });
    }
  }

  applyCommonFilters(filter, queryParams);
  const { pageNum, limitNum, skip } = parsePagination(queryParams);

  const [total, rules] = await Promise.all([
    TrafficRule.countDocuments(filter),
    TrafficRule.find(filter)
      .select('-__v')
      .sort({ category: 1, title: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};
