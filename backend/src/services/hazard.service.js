import mongoose from 'mongoose';
import Hazard from '../models/Hazard.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_TYPES = [
  'pothole',
  'accident',
  'roadblock',
  'waterlogging',
  'construction',
  'other'
];

const ALLOWED_SEVERITIES = ['low', 'medium', 'high'];
const ALLOWED_STATUSES = ['active', 'resolved'];

/**
 * Report a new road hazard
 */
export const createHazard = async (hazardData = {}) => {
  const { type, description, latitude, longitude, severity = 'medium', reportedBy } = hazardData;

  const missingFields = [];
  if (!type) missingFields.push('type');
  if (!description) missingFields.push('description');
  if (latitude === undefined || latitude === null || latitude === '') missingFields.push('latitude');
  if (longitude === undefined || longitude === null || longitude === '') missingFields.push('longitude');

  if (missingFields.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
  }

  const latNum = Number(latitude);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    throw new ApiError(400, 'Latitude must be a valid number between -90 and 90');
  }

  const lngNum = Number(longitude);
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    throw new ApiError(400, 'Longitude must be a valid number between -180 and 180');
  }

  const normalizedType = String(type).trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(normalizedType)) {
    throw new ApiError(
      400,
      `Invalid hazard type: '${type}'. Allowed types: ${ALLOWED_TYPES.join(', ')}`
    );
  }

  const normalizedSeverity = String(severity).trim().toLowerCase();
  if (!ALLOWED_SEVERITIES.includes(normalizedSeverity)) {
    throw new ApiError(
      400,
      `Invalid severity level: '${severity}'. Allowed severities: ${ALLOWED_SEVERITIES.join(', ')}`
    );
  }

  const newHazard = await Hazard.create({
    type: normalizedType,
    description: String(description).trim(),
    latitude: latNum,
    longitude: lngNum,
    location: {
      type: 'Point',
      coordinates: [lngNum, latNum]
    },
    severity: normalizedSeverity,
    reportedBy: reportedBy ? String(reportedBy).trim() : null
  });

  return newHazard;
};

/**
 * Retrieve paginated road hazards with optional filters
 */
export const getHazards = async (queryParams = {}) => {
  const { type, severity, status, page = 1, limit = 20 } = queryParams;

  const filter = {};

  if (type !== undefined && type !== null) {
    if (typeof type !== 'string') {
      throw new ApiError(400, 'Type parameter must be a string');
    }
    const cleanType = type.trim().toLowerCase();
    if (cleanType) {
      if (!ALLOWED_TYPES.includes(cleanType)) {
        throw new ApiError(400, `Invalid hazard type filter: '${type}'`);
      }
      filter.type = cleanType;
    }
  }

  if (severity !== undefined && severity !== null) {
    if (typeof severity !== 'string') {
      throw new ApiError(400, 'Severity parameter must be a string');
    }
    const cleanSeverity = severity.trim().toLowerCase();
    if (cleanSeverity) {
      if (!ALLOWED_SEVERITIES.includes(cleanSeverity)) {
        throw new ApiError(400, `Invalid severity filter: '${severity}'`);
      }
      filter.severity = cleanSeverity;
    }
  }

  if (status !== undefined && status !== null) {
    if (typeof status !== 'string') {
      throw new ApiError(400, 'Status parameter must be a string');
    }
    const cleanStatus = status.trim().toLowerCase();
    if (cleanStatus) {
      if (!ALLOWED_STATUSES.includes(cleanStatus)) {
        throw new ApiError(400, `Invalid status filter: '${status}'`);
      }
      filter.status = cleanStatus;
    }
  }

  // Validate pagination
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

  const [total, hazards] = await Promise.all([
    Hazard.countDocuments(filter),
    Hazard.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 0;

  return {
    hazards,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

/**
 * Retrieve nearby hazards using MongoDB 2dsphere geospatial indexing
 */
export const getNearbyHazards = async (queryParams = {}) => {
  const { latitude, longitude, radius = 5 } = queryParams;

  if (latitude === undefined || latitude === null || latitude === '') {
    throw new ApiError(400, 'Latitude parameter is required');
  }

  if (longitude === undefined || longitude === null || longitude === '') {
    throw new ApiError(400, 'Longitude parameter is required');
  }

  const latNum = Number(latitude);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    throw new ApiError(400, 'Latitude must be a valid number between -90 and 90');
  }

  const lngNum = Number(longitude);
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    throw new ApiError(400, 'Longitude must be a valid number between -180 and 180');
  }

  const radiusNum = Number(radius);
  if (isNaN(radiusNum) || radiusNum <= 0) {
    throw new ApiError(400, 'Radius must be a positive number');
  }

  // Handle radius in meters (> 100) or kilometers (<= 100)
  const radiusKm = radiusNum > 100 ? radiusNum / 1000 : radiusNum;
  if (radiusKm > 500) {
    throw new ApiError(400, 'Radius cannot exceed 500 kilometers');
  }

  // Convert distance in kilometers to radians (Earth radius ~ 6378.1 km)
  const radians = radiusKm / 6378.1;

  const hazards = await Hazard.find({
    location: {
      $geoWithin: {
        $centerSphere: [[lngNum, latNum], radians]
      }
    }
  })
    .select('-__v')
    .sort({ createdAt: -1 })
    .lean();

  return hazards;
};

/**
 * Update or resolve a road hazard
 */
export const updateHazard = async (id, updateData = {}) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid hazard ID format');
  }

  const hazard = await Hazard.findById(id);
  if (!hazard) {
    throw new ApiError(404, 'Hazard report not found');
  }

  const { status, severity, description } = updateData;

  if (status !== undefined) {
    const cleanStatus = String(status).trim().toLowerCase();
    if (!ALLOWED_STATUSES.includes(cleanStatus)) {
      throw new ApiError(400, `Invalid status value: '${status}'. Allowed: ${ALLOWED_STATUSES.join(', ')}`);
    }
    hazard.status = cleanStatus;
  }

  if (severity !== undefined) {
    const cleanSeverity = String(severity).trim().toLowerCase();
    if (!ALLOWED_SEVERITIES.includes(cleanSeverity)) {
      throw new ApiError(400, `Invalid severity value: '${severity}'. Allowed: ${ALLOWED_SEVERITIES.join(', ')}`);
    }
    hazard.severity = cleanSeverity;
  }

  if (description !== undefined && typeof description === 'string' && description.trim()) {
    hazard.description = description.trim();
  }

  await hazard.save();
  return hazard;
};
