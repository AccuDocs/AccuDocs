import { Router } from 'express';
import { LogController } from '../controllers/LogController';
import { authenticate, adminOnly } from '../../../../middlewares';

const router = Router();

router.use(authenticate, adminOnly);

router.get('/stats', LogController.getStats);

export default router;
