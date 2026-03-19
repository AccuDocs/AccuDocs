import { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Compliance
 *   description: Tax and legal compliance tracking
 */

router.use(authenticate);

/**
 * @openapi
 * /compliance/upcoming:
 *   get:
 *     tags: [Compliance]
 *     summary: Get upcoming compliance items
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming items retrieved
 */
router.get('/upcoming', ComplianceController.getUpcoming);

/**
 * @openapi
 * /compliance/deadlines:
 *   get:
 *     tags: [Compliance]
 *     summary: Get all compliance deadlines
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deadlines retrieved
 */
router.get('/deadlines', ComplianceController.getDeadlines);

/**
 * @openapi
 * /compliance/client-deadlines:
 *   get:
 *     tags: [Compliance]
 *     summary: Get compliance deadlines filtered by client
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client deadlines retrieved
 */
router.get('/client-deadlines', ComplianceController.getDeadlines);

/**
 * @openapi
 * /compliance/stats:
 *   get:
 *     tags: [Compliance]
 *     summary: Get compliance statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get('/stats', ComplianceController.getStats);

export default router;
