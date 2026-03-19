import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Notifications
 *   description: User notifications and alerts
 */

router.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get user notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications retrieved
 */
router.get('/', NotificationController.getNotifications);

/**
 * @openapi
 * /notifications/mark-all-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.patch('/mark-all-read', NotificationController.markAllAsRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', NotificationController.markAsRead);

export default router;
