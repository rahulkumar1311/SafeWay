import mongoose from 'mongoose';
import EmergencyContact from '../models/EmergencyContact.js';
import { dispatchEmergencyNotification } from './notification.service.js';
import { ApiError } from '../utils/ApiError.js';

// In-memory accident event cache for fast threshold & confirmation evaluation
const activeAccidentEvents = new Map();

/**
 * Validates phone number format (basic international / national digit & format check)
 */
const isValidPhone = (phone) => {
  if (typeof phone !== 'string') return false;
  const cleanPhone = phone.trim();
  return /^\+?[0-9\s\-]{5,20}$/.test(cleanPhone);
};

/**
 * Create a new emergency contact
 */
export const createContact = async (contactData = {}) => {
  const { userId, name, phone, relationship } = contactData;

  const missingFields = [];
  if (!userId || typeof userId !== 'string' || !userId.trim()) missingFields.push('userId');
  if (!name || typeof name !== 'string' || !name.trim()) missingFields.push('name');
  if (!phone || typeof phone !== 'string' || !phone.trim()) missingFields.push('phone');
  if (!relationship || typeof relationship !== 'string' || !relationship.trim()) missingFields.push('relationship');

  if (missingFields.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
  }

  if (!isValidPhone(phone)) {
    throw new ApiError(400, 'Invalid phone number format');
  }

  const newContact = await EmergencyContact.create({
    userId: String(userId).trim(),
    name: String(name).trim(),
    phone: String(phone).trim(),
    relationship: String(relationship).trim()
  });

  return newContact;
};

/**
 * Get all emergency contacts for a given user
 */
export const getContactsByUserId = async (userId) => {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new ApiError(400, 'User ID parameter is required');
  }

  const contacts = await EmergencyContact.find({ userId: String(userId).trim() })
    .select('-__v')
    .sort({ createdAt: -1 })
    .lean();

  return contacts;
};

/**
 * Update an existing emergency contact
 */
export const updateContact = async (contactId, updateData = {}) => {
  if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
    throw new ApiError(400, 'Invalid contactId format');
  }

  const contact = await EmergencyContact.findById(contactId);
  if (!contact) {
    throw new ApiError(404, 'Emergency contact not found');
  }

  const { name, phone, relationship } = updateData;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new ApiError(400, 'Name must be a non-empty string');
    }
    contact.name = String(name).trim();
  }

  if (phone !== undefined) {
    if (!isValidPhone(phone)) {
      throw new ApiError(400, 'Invalid phone number format');
    }
    contact.phone = String(phone).trim();
  }

  if (relationship !== undefined) {
    if (typeof relationship !== 'string' || !relationship.trim()) {
      throw new ApiError(400, 'Relationship must be a non-empty string');
    }
    contact.relationship = String(relationship).trim();
  }

  await contact.save();
  return contact;
};

/**
 * Delete an emergency contact
 */
export const deleteContact = async (contactId) => {
  if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
    throw new ApiError(400, 'Invalid contactId format');
  }

  const contact = await EmergencyContact.findByIdAndDelete(contactId);
  if (!contact) {
    throw new ApiError(404, 'Emergency contact not found');
  }

  return { message: 'Emergency contact deleted successfully' };
};

/**
 * Process SOS Emergency Request
 */
export const processSOS = async (sosData = {}) => {
  const { userId, latitude, longitude, timestamp, eventType = 'SOS' } = sosData;

  const missingFields = [];
  if (!userId || typeof userId !== 'string' || !userId.trim()) missingFields.push('userId');
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

  const cleanUserId = String(userId).trim();

  const contacts = await EmergencyContact.find({ userId: cleanUserId })
    .select('-__v')
    .lean();

  const eventTime = timestamp ? new Date(timestamp) : new Date();
  const validTimestamp = isNaN(eventTime.getTime()) ? new Date().toISOString() : eventTime.toISOString();

  const notificationResult = await dispatchEmergencyNotification({
    userId: cleanUserId,
    contacts,
    location: { latitude: latNum, longitude: lngNum },
    eventType: String(eventType).toUpperCase(),
    timestamp: validTimestamp
  });

  const sosRecord = {
    sosId: `sos_${Date.now()}_${cleanUserId.slice(-4)}`,
    userId: cleanUserId,
    location: {
      latitude: latNum,
      longitude: lngNum
    },
    timestamp: validTimestamp,
    eventType: String(eventType).toUpperCase(),
    contactsNotifiedCount: contacts.length,
    contacts: contacts.map((c) => ({
      id: c._id,
      name: c.name,
      phone: c.phone,
      relationship: c.relationship
    })),
    notification: notificationResult
  };

  return sosRecord;
};

/**
 * Detect Possible Vehicle Accident / Impact Telemetry
 */
export const detectAccident = async (telemetryData = {}) => {
  const { userId, latitude, longitude, speed = 0, decelerationG = 0, impactScore = 0, timestamp } = telemetryData;

  const missingFields = [];
  if (!userId || typeof userId !== 'string' || !userId.trim()) missingFields.push('userId');
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

  const cleanUserId = String(userId).trim();
  const decelG = Number(decelerationG) || 0;
  const score = Number(impactScore) || 0;

  // Impact Threshold Evaluation (Deceleration >= 2.5G OR ImpactScore >= 75)
  const isImpact = decelG >= 2.5 || score >= 75;

  if (!isImpact) {
    return {
      userId: cleanUserId,
      status: 'NORMAL_DRIVING',
      impactDetected: false,
      timestamp: timestamp || new Date().toISOString()
    };
  }

  // Prevent duplicate active accident events for same user within 30 seconds
  const existingEvent = activeAccidentEvents.get(cleanUserId);
  if (existingEvent && existingEvent.status === 'CONFIRMATION_PENDING') {
    return existingEvent;
  }

  const eventId = `acc_${Date.now()}_${cleanUserId.slice(-4)}`;
  const validTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  const accidentEvent = {
    eventId,
    userId: cleanUserId,
    status: 'CONFIRMATION_PENDING',
    impactDetected: true,
    severity: score >= 90 || decelG >= 4.0 ? 'HIGH' : 'MEDIUM',
    decelerationG: decelG,
    impactScore: score,
    location: {
      latitude: latNum,
      longitude: lngNum,
      mapsUrl: `https://maps.google.com/?q=${latNum},${lngNum}`
    },
    speed: Number(speed) || 0,
    timestamp: validTimestamp,
    confirmationWindowSeconds: 15,
    message: 'Possible vehicle impact detected. False positive confirmation window active.'
  };

  activeAccidentEvents.set(cleanUserId, accidentEvent);
  activeAccidentEvents.set(eventId, accidentEvent);

  return accidentEvent;
};

/**
 * Cancel False Positive Accident Alert
 */
export const cancelAccident = async (cancelData = {}) => {
  const { userId, eventId } = cancelData;

  if (!userId || !eventId) {
    throw new ApiError(400, 'userId and eventId are required to cancel accident alert');
  }

  const event = activeAccidentEvents.get(eventId) || activeAccidentEvents.get(userId);
  if (!event) {
    throw new ApiError(404, 'No active accident event found to cancel');
  }

  event.status = 'CANCELLED';
  event.cancelledAt = new Date().toISOString();

  activeAccidentEvents.delete(eventId);
  activeAccidentEvents.delete(userId);

  return {
    eventId: event.eventId,
    userId: event.userId,
    status: 'CANCELLED',
    message: 'Possible accident alert cancelled by driver (false positive).'
  };
};

/**
 * Confirm Accident Alert & Dispatch Emergency Notification
 */
export const confirmAccident = async (confirmData = {}) => {
  const { userId, eventId } = confirmData;

  if (!userId || !eventId) {
    throw new ApiError(400, 'userId and eventId are required to confirm accident alert');
  }

  const event = activeAccidentEvents.get(eventId) || activeAccidentEvents.get(userId);
  if (!event) {
    throw new ApiError(404, 'No active accident event found');
  }

  event.status = 'EMERGENCY_TRIGGERED';
  event.confirmedAt = new Date().toISOString();

  const contacts = await EmergencyContact.find({ userId: event.userId })
    .select('-__v')
    .lean();

  const notificationResult = await dispatchEmergencyNotification({
    userId: event.userId,
    contacts,
    location: event.location,
    eventType: 'POSSIBLE_ACCIDENT',
    timestamp: event.timestamp
  });

  event.notification = notificationResult;
  event.contactsNotifiedCount = contacts.length;

  activeAccidentEvents.delete(eventId);
  activeAccidentEvents.delete(userId);

  return event;
};

/**
 * Update Live Client GPS Telemetry Location
 */
export const updateLiveLocation = async (locationData = {}) => {
  const { userId, latitude, longitude, speed = 0, timestamp } = locationData;

  if (!userId || latitude === undefined || longitude === undefined) {
    throw new ApiError(400, 'userId, latitude, and longitude are required');
  }

  const latNum = Number(latitude);
  const lngNum = Number(longitude);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    throw new ApiError(400, 'Latitude must be between -90 and 90');
  }

  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    throw new ApiError(400, 'Longitude must be between -180 and 180');
  }

  return {
    userId: String(userId).trim(),
    location: {
      latitude: latNum,
      longitude: lngNum,
      speed: Number(speed) || 0
    },
    timestamp: timestamp || new Date().toISOString(),
    status: 'LOCATION_UPDATED'
  };
};
