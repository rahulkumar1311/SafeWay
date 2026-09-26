import { asyncHandler } from '../utils/asyncHandler.js';
import * as emergencyService from '../services/emergency.service.js';

/**
 * POST /api/emergency/contacts
 * Controller to create a new emergency contact
 */
export const createContact = asyncHandler(async (req, res) => {
  const newContact = await emergencyService.createContact(req.body);

  return res.status(201).json({
    success: true,
    message: 'Emergency contact created successfully',
    data: newContact
  });
});

/**
 * GET /api/emergency/contacts/:userId
 * Controller to retrieve all emergency contacts for a specific user
 */
export const getContactsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const contacts = await emergencyService.getContactsByUserId(userId);

  return res.status(200).json({
    success: true,
    message: 'Emergency contacts fetched successfully',
    data: contacts
  });
});

/**
 * PUT /api/emergency/contacts/:contactId
 * Controller to update an existing emergency contact
 */
export const updateContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const updatedContact = await emergencyService.updateContact(contactId, req.body);

  return res.status(200).json({
    success: true,
    message: 'Emergency contact updated successfully',
    data: updatedContact
  });
});

/**
 * DELETE /api/emergency/contacts/:contactId
 * Controller to delete an emergency contact
 */
export const deleteContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const result = await emergencyService.deleteContact(contactId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
});

/**
 * POST /api/emergency/sos
 * Controller to process emergency SOS triggers
 */
export const processSOS = asyncHandler(async (req, res) => {
  const sosRecord = await emergencyService.processSOS(req.body);

  return res.status(200).json({
    success: true,
    message: 'Emergency SOS alert processed successfully',
    data: sosRecord
  });
});

/**
 * POST /api/emergency/telemetry
 * Controller to analyze telemetry for possible vehicle impact/accident
 */
export const detectAccident = asyncHandler(async (req, res) => {
  const accidentEvent = await emergencyService.detectAccident(req.body);

  return res.status(200).json({
    success: true,
    message: accidentEvent.impactDetected
      ? 'Possible vehicle impact detected'
      : 'Normal driving telemetry analyzed',
    data: accidentEvent
  });
});

/**
 * POST /api/emergency/accident/cancel
 * Controller to cancel false positive accident alert
 */
export const cancelAccident = asyncHandler(async (req, res) => {
  const result = await emergencyService.cancelAccident(req.body);

  return res.status(200).json({
    success: true,
    message: 'Accident alert cancelled successfully',
    data: result
  });
});

/**
 * POST /api/emergency/accident/confirm
 * Controller to confirm accident alert & trigger emergency notifications
 */
export const confirmAccident = asyncHandler(async (req, res) => {
  const result = await emergencyService.confirmAccident(req.body);

  return res.status(200).json({
    success: true,
    message: 'Emergency accident notification triggered successfully',
    data: result
  });
});

/**
 * POST /api/emergency/location/update
 * Controller to receive live location updates from client GPS
 */
export const updateLiveLocation = asyncHandler(async (req, res) => {
  const locationRecord = await emergencyService.updateLiveLocation(req.body);

  return res.status(200).json({
    success: true,
    message: 'Live location updated successfully',
    data: locationRecord
  });
});
