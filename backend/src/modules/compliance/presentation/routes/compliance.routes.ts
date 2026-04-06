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

/**
 * @openapi
 * /compliance/deadlines:
 *   post:
 *     tags: [Compliance]
 *     summary: Create a new compliance deadline
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *               - dueDate
 *             properties:
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               dueDate:
 *                 type: string
 *               recurring:
 *                 type: boolean
 *               recurringPattern:
 *                 type: string
 *               description:
 *                 type: string
 *               clientId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Deadline created successfully
 */
router.post('/deadlines', ComplianceController.createDeadline);

export default router;
