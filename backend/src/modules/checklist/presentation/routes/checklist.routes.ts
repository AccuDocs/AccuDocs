import { Router } from 'express';
import { ChecklistController } from '../controllers/ChecklistController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Checklist
 *   description: Operational and compliance checklists
 */

router.use(authenticate);

/**
 * @openapi
 * /checklist:
 *   get:
 *     tags: [Checklist]
 *     summary: Get all active checklists for the organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of checklists retrieved
 */
router.get('/', ChecklistController.getChecklists);

/**
 * @openapi
 * /checklist/templates:
 *   get:
 *     tags: [Checklist]
 *     summary: Get available checklist templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Checklist templates retrieved
 */
router.get('/templates', ChecklistController.getTemplates);

/**
 * @openapi
 * /checklist/stats:
 *   get:
 *     tags: [Checklist]
 *     summary: Get checklist completion statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
router.get('/stats', ChecklistController.getStats);

/**
 * @openapi
 * /checklist/bulk-create:
 *   post:
 *     tags: [Checklist]
 *     summary: Bulk create checklists for clients
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - clientIds
 *               - financialYear
 *             properties:
 *               templateId:
 *                 type: string
 *               clientIds:
 *                 type: string
 *               financialYear:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checklists created successfully
 */
router.post('/bulk-create', ChecklistController.bulkCreate);

export default router;
