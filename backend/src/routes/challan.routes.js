import { Router } from 'express';
import { getChallanInfoByState } from '../controllers/challan.controller.js';

const router = Router();

// GET /api/challans/:state - Retrieve state-wise traffic penalty information
router.get('/:state', getChallanInfoByState);

export default router;
