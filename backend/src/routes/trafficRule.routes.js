import { Router } from 'express';
import {
  getAllRules,
  getApplicableRules,
  getRulesByCity,
  getRulesByState,
  getRulesByCategory,
  searchRules,
  getRulesByVehicleType,
  getRuleByIdOrState,
  syncGovTrafficRules
} from '../controllers/trafficRule.controller.js';

const router = Router();

/**
 * Traffic Rules API Endpoints
 * 
 * GET  /api/traffic-rules/applicable    - Hierarchical rule resolution (City ➔ State ➔ Central)
 * GET  /api/traffic-rules/city/:city     - Fetch City-specific rules
 * GET  /api/traffic-rules/state/:state   - Fetch Central + State rules for a state
 * GET  /api/traffic-rules/search        - Search rules by query string (?q=helmet)
 * GET  /api/traffic-rules/category/:cat - Fetch rules by category
 * GET  /api/traffic-rules/vehicle/:vType Fetch rules by vehicle type
 * POST /api/traffic-rules/sync          - Trigger Data.gov.in Government Traffic Rule Dataset Sync
 * GET  /api/traffic-rules               - List all traffic rules (filtered, paginated)
 * GET  /api/traffic-rules/:idOrState    - Fetch single rule by Mongo ID / ruleCode or state
 */

router.get('/applicable', getApplicableRules);
router.get('/city/:city', getRulesByCity);
router.get('/search', searchRules);
router.get('/state/:state', getRulesByState);
router.get('/category/:category', getRulesByCategory);
router.get('/vehicle/:vehicleType', getRulesByVehicleType);
router.post('/sync', syncGovTrafficRules);
router.get('/', getAllRules);
router.get('/:idOrState', getRuleByIdOrState);

export default router;
