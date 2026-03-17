import { Router } from 'express';
import { ChecklistController } from '../controllers/ChecklistController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', ChecklistController.getChecklists);
router.get('/templates', ChecklistController.getTemplates);
router.get('/stats', ChecklistController.getStats);

export default router;
