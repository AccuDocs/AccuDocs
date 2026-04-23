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

/**
 * @openapi
 * /compliance/tds/sections:
 *   get:
 *     tags: [Compliance]
 *     summary: Get master list of TDS sections with rates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TDS sections retrieved
 */
router.get('/tds/sections', TDSTCSController.getSections);

/**
 * @openapi
 * /compliance/tds/calculate:
 *   post:
 *     tags: [Compliance]
 *     summary: Calculate TDS for a given amount and section
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, sectionCode]
 *             properties:
 *               amount:
 *                 type: number
 *               sectionCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: TDS calculation result
 */
router.post('/tds/calculate', TDSTCSController.calculateTDS);

/**
 * @openapi
 * /compliance/tds:
 *   post:
 *     tags: [Compliance]
 *     summary: Create a TDS entry
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, sectionCode, amount, tdsAmount]
 *             properties:
 *               clientId:
 *                 type: string
 *               sectionCode:
 *                 type: string
 *               amount:
 *                 type: number
 *               tdsAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: TDS entry created
 */
router.post('/tds', TDSTCSController.createTDS);

/**
 * @openapi
 * /compliance/tds:
 *   get:
 *     tags: [Compliance]
 *     summary: List TDS entries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *       - in: query
 *         name: section
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: TDS entries retrieved
 */
router.get('/tds', TDSTCSController.listTDS);

/**
 * @openapi
 * /compliance/tds/{id}:
 *   patch:
 *     tags: [Compliance]
 *     summary: Update a TDS entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: TDS entry updated
 */
router.patch('/tds/:id', TDSTCSController.updateTDS);

/**
 * @openapi
 * /compliance/tds/{id}:
 *   delete:
 *     tags: [Compliance]
 *     summary: Soft delete a TDS entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: TDS entry deleted
 */
router.delete('/tds/:id', TDSTCSController.deleteTDS);

/**
 * @openapi
 * /compliance/tds/summary/{clientId}:
 *   get:
 *     tags: [Compliance]
 *     summary: Get Form 26AS-style TDS summary for a client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: TDS summary retrieved
 */
router.get('/tds/summary/:clientId', TDSTCSController.getForm26ASSummary);

// ─── TCS Management (Phase 2) ─────────────────────────────────────────────────

/**
 * @openapi
 * /compliance/tcs:
 *   post:
 *     tags: [Compliance]
 *     summary: Create a TCS entry
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, tcsAmount]
 *             properties:
 *               amount:
 *                 type: number
 *               tcsAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: TCS entry created
 */
router.post('/tcs', TDSTCSController.createTCS);

/**
 * @openapi
 * /compliance/tcs:
 *   get:
 *     tags: [Compliance]
 *     summary: List TCS entries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *       - in: query
 *         name: sellerGstin
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: TCS entries retrieved
 */
router.get('/tcs', TDSTCSController.listTCS);

/**
 * @openapi
 * /compliance/tcs/{id}:
 *   patch:
 *     tags: [Compliance]
 *     summary: Update a TCS entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: TCS entry updated
 */
router.patch('/tcs/:id', TDSTCSController.updateTCS);

/**
 * @openapi
 * /compliance/tcs/{id}:
 *   delete:
 *     tags: [Compliance]
 *     summary: Soft delete a TCS entry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: TCS entry deleted
 */
router.delete('/tcs/:id', TDSTCSController.deleteTCS);

export default router;
