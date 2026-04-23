import { Router } from 'express';
import { LogController } from '../controllers/LogController';
import { authenticate, adminOnly } from '../../../../middlewares';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Logs
 *   description: System logs and audit statistics (admin only)
 */

router.use(authenticate, adminOnly);

/**
 * @openapi
 * /logs/stats:
 *   get:
 *     tags: [Logs]
 *     summary: Get log statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Log statistics retrieved
 */
router.get('/stats', LogController.getStats);

export default router;
