import { Router } from 'express';
import { ComplianceController } from '../controllers/ComplianceController';
import { TDSTCSController } from '../controllers/TDSTCSController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Compliance
 *   description: Tax and legal compliance tracking, TDS/TCS management
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

// ─── TDS Management (Phase 2) ─────────────────────────────────────────────────
/** GET /compliance/tds/sections — Master list of TDS sections with rates */
router.get('/tds/sections', TDSTCSController.getSections);
/** POST /compliance/tds/calculate — Calculate TDS for a given amount & section */
router.post('/tds/calculate', TDSTCSController.calculateTDS);
/** POST /compliance/tds — Create a TDS entry */
router.post('/tds', TDSTCSController.createTDS);
/** GET /compliance/tds — List TDS entries (filters: clientId, period, section, status) */
router.get('/tds', TDSTCSController.listTDS);
/** PATCH /compliance/tds/:id — Update a TDS entry */
router.patch('/tds/:id', TDSTCSController.updateTDS);
/** DELETE /compliance/tds/:id — Soft delete a TDS entry */
router.delete('/tds/:id', TDSTCSController.deleteTDS);
/** GET /compliance/tds/summary/:clientId — Form 26AS-style summary */
router.get('/tds/summary/:clientId', TDSTCSController.getForm26ASSummary);

// ─── TCS Management (Phase 2) ─────────────────────────────────────────────────
/** POST /compliance/tcs — Create a TCS entry */
router.post('/tcs', TDSTCSController.createTCS);
/** GET /compliance/tcs — List TCS entries (filters: period, sellerGstin) */
router.get('/tcs', TDSTCSController.listTCS);
/** PATCH /compliance/tcs/:id — Update a TCS entry */
router.patch('/tcs/:id', TDSTCSController.updateTCS);
/** DELETE /compliance/tcs/:id — Soft delete a TCS entry */
router.delete('/tcs/:id', TDSTCSController.deleteTCS);

export default router;
