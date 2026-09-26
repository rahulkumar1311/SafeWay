import { Router } from 'express';
import {
  analyzeDrowsiness,
  analyzeTrafficSign
} from '../controllers/ai.controller.js';

const router = Router();

// POST /api/ai/drowsiness/analyze - HTTP integration endpoint for Drowsiness Detection AI
router.post('/drowsiness/analyze', analyzeDrowsiness);

// POST /api/ai/traffic-sign/analyze - HTTP integration endpoint for Traffic Sign Recognition AI
router.post('/traffic-sign/analyze', analyzeTrafficSign);

export default router;
