import { Router } from 'express';
import {
  createContact,
  getContactsByUserId,
  updateContact,
  deleteContact,
  processSOS,
  detectAccident,
  cancelAccident,
  confirmAccident,
  updateLiveLocation
} from '../controllers/emergency.controller.js';

const router = Router();

// Emergency Contact CRUD routes
router.post('/contacts', createContact);
router.get('/contacts/:userId', getContactsByUserId);
router.put('/contacts/:contactId', updateContact);
router.delete('/contacts/:contactId', deleteContact);

// SOS Emergency Alert route
router.post('/sos', processSOS);

// Accident Detection & False Positive Confirmation routes
router.post('/telemetry', detectAccident);
router.post('/incident', detectAccident);
router.post('/accident/detect', detectAccident);
router.post('/accident/cancel', cancelAccident);
router.post('/accident/confirm', confirmAccident);

// Live Location Telemetry Update route
router.post('/location/update', updateLiveLocation);

export default router;
