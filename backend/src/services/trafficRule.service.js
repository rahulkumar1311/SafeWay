import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import TrafficRule from '../models/TrafficRule.js';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data/traffic-rules');

// Load static fallback traffic rules dataset
const loadFallbackRules = () => {
  try {
    const loadFile = (name) => {
      const p = path.join(DATA_DIR, name);
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
      return [];
    };
    const central = loadFile('central_rules.json');
    const state = loadFile('state_rules.json');
    const signs = loadFile('traffic_signs.json');
    const skeletons = loadFile('state_skeletons.json');

    return [...central, ...state, ...signs, ...skeletons].map((r, i) => ({
      _id: r._id || `rule_${i + 1}`,
      scope: r.scope || (r.state ? 'STATE' : 'CENTRAL'),
      state: r.state || null,
      city: r.city || null,
      ruleCode: r.ruleCode || `MVA-RULE-${i + 100}`,
      category: r.category || 'General Driving Guidelines',
      title: r.title,
      description: r.description,
      vehicleType: r.vehicleType || 'All',
      applicableVehicleTypes: r.applicableVehicleTypes || ['All'],
      violation: r.violation || r.description,
      fineAmount: r.fineAmount !== undefined ? r.fineAmount : 1000,
      additionalPenalty: r.additionalPenalty || '',
      legalSection: r.legalSection || 'Motor Vehicles Act, 1988',
      sourceName: r.sourceName || 'Official Transport Department',
      sourceUrl: r.sourceUrl || 'https://transport.bihar.gov.in',
      status: r.status || 'VERIFIED'
    }));
  } catch (err) {
    console.warn('[TrafficRuleService] Fallback data load note:', err);
    return [];
  }
};

const cachedFallbackRules = loadFallbackRules();

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

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

// Filter static rules in-memory fallback
const filterStaticRules = (rules, queryParams = {}, stateFilter = null, categoryFilter = null) => {
  let result = rules;

  if (stateFilter) {
    const sLower = stateFilter.toLowerCase();
    result = result.filter(
      (r) => r.scope === 'CENTRAL' || (r.state && r.state.toLowerCase() === sLower)
    );
  }

  if (queryParams.scope) {
    const targetScope = String(queryParams.scope).trim().toUpperCase();
    if (targetScope) {
      result = result.filter((r) => r.scope === targetScope);
    }
  }

  if (categoryFilter) {
    const cLower = categoryFilter.toLowerCase();
    result = result.filter(
      (r) => r.category && r.category.toLowerCase().includes(cLower)
    );
  }

  if (queryParams.q || queryParams.search) {
    const qLower = (queryParams.q || queryParams.search).toLowerCase();
    result = result.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(qLower)) ||
        (r.description && r.description.toLowerCase().includes(qLower)) ||
        (r.legalSection && r.legalSection.toLowerCase().includes(qLower)) ||
        (r.ruleCode && r.ruleCode.toLowerCase().includes(qLower))
    );
  }

  const { pageNum, limitNum, skip } = parsePagination(queryParams);
  const total = result.length;
  const paginated = result.slice(skip, skip + limitNum);
  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    rules: paginated,
    pagination: { page: pageNum, limit: limitNum, total, totalPages }
  };
};

export const getApplicableRules = async (queryParams = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const { state, city } = queryParams;
      const cleanState = state && typeof state === 'string' ? state.trim() : null;
      const cleanCity = city && typeof city === 'string' ? city.trim() : null;

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
      }

      applyCommonFilters(filter, queryParams);
      const { pageNum, limitNum, skip } = parsePagination(queryParams);

      const [total, allRawRules] = await Promise.all([
        TrafficRule.countDocuments(filter),
        TrafficRule.find(filter).select('-__v').sort({ scope: -1, category: 1, title: 1 }).skip(skip).limit(limitNum).lean()
      ]);

      if (total > 0) {
        const totalPages = Math.ceil(total / limitNum) || 0;
        return { rules: allRawRules, pagination: { page: pageNum, limit: limitNum, total, totalPages } };
      }
    } catch (err) {
      // Fallback
    }
  }

  return filterStaticRules(cachedFallbackRules, queryParams, queryParams.state);
};

export const getRulesByState = async (stateParam, queryParams = {}) => {
  if (!stateParam || typeof stateParam !== 'string' || !stateParam.trim()) {
    throw new ApiError(400, 'State parameter is required and must be a valid text string');
  }

  const cleanState = stateParam.trim();

  if (mongoose.connection.readyState === 1) {
    try {
      const stateRegex = new RegExp(`^${escapeRegExp(cleanState)}$`, 'i');
      const filter = { $or: [{ scope: 'CENTRAL' }, { state: { $regex: stateRegex } }] };
      applyCommonFilters(filter, queryParams);
      const { pageNum, limitNum, skip } = parsePagination(queryParams);

      const [total, rules] = await Promise.all([
        TrafficRule.countDocuments(filter),
        TrafficRule.find(filter).select('-__v').sort({ scope: -1, category: 1, title: 1 }).skip(skip).limit(limitNum).lean()
      ]);

      if (total > 0) {
        const totalPages = Math.ceil(total / limitNum) || 0;
        return { rules, pagination: { page: pageNum, limit: limitNum, total, totalPages } };
      }
    } catch (err) {
      // Fallback
    }
  }

  return filterStaticRules(cachedFallbackRules, queryParams, cleanState);
};

export const getRulesByCity = async (cityParam, queryParams = {}) => {
  return getRulesByState(queryParams.state || 'Bihar', queryParams);
};

export const getAllRules = async (queryParams = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const filter = {};
      applyCommonFilters(filter, queryParams);
      const { pageNum, limitNum, skip } = parsePagination(queryParams);

      const [total, rules] = await Promise.all([
        TrafficRule.countDocuments(filter),
        TrafficRule.find(filter).select('-__v').sort({ category: 1, title: 1 }).skip(skip).limit(limitNum).lean()
      ]);

      if (total > 0) {
        const totalPages = Math.ceil(total / limitNum) || 0;
        return { rules, pagination: { page: pageNum, limit: limitNum, total, totalPages } };
      }
    } catch (err) {
      // Fallback
    }
  }

  return filterStaticRules(cachedFallbackRules, queryParams);
};

export const getRuleByIdOrCode = async (idOrCode) => {
  if (!idOrCode || typeof idOrCode !== 'string' || !idOrCode.trim()) {
    throw new ApiError(400, 'Rule identifier parameter is required');
  }

  const cleanId = idOrCode.trim();

  if (mongoose.connection.readyState === 1) {
    try {
      let query = mongoose.Types.ObjectId.isValid(cleanId)
        ? { _id: cleanId }
        : { ruleCode: { $regex: new RegExp(`^${escapeRegExp(cleanId)}$`, 'i') } };
      const rule = await TrafficRule.findOne(query).select('-__v').lean();
      if (rule) return rule;
    } catch (err) {
      // Fallback
    }
  }

  const found = cachedFallbackRules.find(
    (r) => String(r._id) === cleanId || r.ruleCode.toLowerCase() === cleanId.toLowerCase()
  );

  if (!found) {
    throw new ApiError(404, `Traffic rule not found for identifier '${cleanId}'`);
  }

  return found;
};

export const getRulesByCategory = async (categoryParam, queryParams = {}) => {
  return filterStaticRules(cachedFallbackRules, queryParams, queryParams.state, categoryParam);
};

export const searchRules = async (searchQuery, queryParams = {}) => {
  return filterStaticRules(cachedFallbackRules, { ...queryParams, q: searchQuery }, queryParams.state);
};

export const getRulesByVehicleType = async (vehicleTypeParam, queryParams = {}) => {
  return filterStaticRules(cachedFallbackRules, queryParams, queryParams.state);
};
