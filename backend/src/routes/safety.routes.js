import { Router } from 'express';
import {
  analyzeSafetyRisk,
  getSafetyRecordsByUserId
} from '../controllers/safety.controller.js';

const router = Router();

// POST /api/safety/analyze - Analyze driving risk and persist SafetyRecord
router.post('/analyze', analyzeSafetyRisk);

// GET /api/safety/records/:userId - Retrieve safety records for a user
router.get('/records/:userId', getSafetyRecordsByUserId);

export default router;
