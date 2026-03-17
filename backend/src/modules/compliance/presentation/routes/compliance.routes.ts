import { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/upcoming', ComplianceController.getUpcoming);
router.get('/stats', ComplianceController.getStats);

export default router;
