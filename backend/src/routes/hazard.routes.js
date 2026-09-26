import { Router } from 'express';
import {
  createHazard,
  getHazards,
  getNearbyHazards,
  updateHazard
} from '../controllers/hazard.controller.js';

const router = Router();

// GET /api/hazards/nearby - Proximity search using MongoDB 2dsphere index
router.get('/nearby', getNearbyHazards);

// GET /api/hazards - Retrieve hazards with optional type, severity, status filters & pagination
router.get('/', getHazards);

// POST /api/hazards - Submit a new road hazard report
router.post('/', createHazard);

// PATCH /api/hazards/:id - Update or resolve a road hazard
router.patch('/:id', updateHazard);

export default router;
