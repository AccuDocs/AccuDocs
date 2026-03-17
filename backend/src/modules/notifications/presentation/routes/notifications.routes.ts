import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.patch('/mark-all-read', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);

export default router;
