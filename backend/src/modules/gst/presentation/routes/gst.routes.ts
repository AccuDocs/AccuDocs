import { Router } from 'express';
import multer from 'multer';
import { GstController } from '../controllers/gst.controller';
import { HsnSacController } from '../controllers/HsnSacController';
import { ITCController } from '../controllers/ITCController';
import { GSTR2AController } from '../controllers/GSTR2AController';
import { EWayBillController } from '../controllers/EWayBillController';
import { EInvoiceController } from '../controllers/EInvoiceController';
import { GSTR9Controller } from '../controllers/GSTR9Controller';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();
const gstController = new GstController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

/**
 * @openapi
 * tags:
 *   name: GST
 *   description: GST return filing, HSN/SAC directory, ITC tracker, e-way bills, e-invoices, and annual returns
 */

// ─── Existing GST return endpoints ────────────────────────────────────────────

/**
 * @openapi
 * /gst/draft:
 *   post:
 *     tags: [GST]
 *     summary: Draft a new GST return
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, returnPeriod, returnType]
 *             properties:
 *               clientId:
 *                 type: string
 *               returnPeriod:
 *                 type: string
 *                 description: YYYY-MM format
 *               returnType:
 *                 type: string
 *                 enum: [GSTR1, GSTR3B]
 *     responses:
 *       201:
 *         description: GST return drafted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/draft', authenticate, gstController.draftReturn.bind(gstController));

/**
 * @openapi
 * /gst/client/{clientId}:
 *   get:
 *     tags: [GST]
 *     summary: Get all GST returns for a client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of GST returns retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/client/:clientId', authenticate, gstController.getReturns.bind(gstController));

/**
 * @openapi
 * /gst/{id}:
 *   get:
 *     tags: [GST]
 *     summary: Get GST return by ID
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
 *         description: GST return details retrieved
 *       404:
 *         description: Return not found
 */
router.get('/:id', authenticate, gstController.getReturnById.bind(gstController));

/**
 * @openapi
 * /gst/{id}:
 *   put:
 *     tags: [GST]
 *     summary: Update an existing GST return
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
 *         description: GST return updated
 *       404:
 *         description: Return not found
 */
router.put('/:id', authenticate, gstController.updateReturn.bind(gstController));

/**
 * @openapi
 * /gst/{id}:
 *   delete:
 *     tags: [GST]
 *     summary: Delete a GST return
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
 *         description: GST return deleted
 *       404:
 *         description: Return not found
 */
router.delete('/:id', authenticate, gstController.deleteReturn.bind(gstController));

/**
 * @openapi
 * /gst/{id}/export-json:
 *   get:
 *     tags: [GST]
 *     summary: Export GST return as JSON
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
 *         description: JSON export generated
 */
router.get('/:id/export-json', authenticate, gstController.exportJson.bind(gstController));

/**
 * @openapi
 * /gst/{id}/save-to-workspace:
 *   post:
 *     tags: [GST]
 *     summary: Save GST return to workspace
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
 *         description: Saved to workspace
 */
router.post('/:id/save-to-workspace', authenticate, gstController.saveToWorkspace.bind(gstController));

// ─── HSN/SAC Code Directory ───────────────────────────────────────────────────

/**
 * @openapi
 * /gst/hsn-sac/search:
 *   get:
 *     tags: [GST]
 *     summary: Search HSN/SAC codes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [HSN, SAC]
 *       - in: query
 *         name: rate
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results retrieved
 */
router.get('/hsn-sac/search', authenticate, HsnSacController.search);

/**
 * @openapi
 * /gst/hsn-sac/{id}:
 *   get:
 *     tags: [GST]
 *     summary: Get HSN/SAC code by ID
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
 *         description: HSN/SAC code retrieved
 *       404:
 *         description: Code not found
 */
router.get('/hsn-sac/:id', authenticate, HsnSacController.getById);

/**
 * @openapi
 * /gst/hsn-sac/import:
 *   post:
 *     tags: [GST]
 *     summary: Import HSN/SAC codes from Excel
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import successful
 *       400:
 *         description: Invalid file format
 */
router.post('/hsn-sac/import', authenticate, upload.single('file'), HsnSacController.importExcel);

/**
 * @openapi
 * /gst/hsn-sac/lookup-online:
 *   post:
 *     tags: [GST]
 *     summary: Online HSN/SAC lookup via public directory cache
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lookup result retrieved
 */
router.post('/hsn-sac/lookup-online', authenticate, HsnSacController.onlineLookup);
router.post('/hsn-sac/sync-live', authenticate, HsnSacController.syncLive);

// ─── ITC Tracker ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /gst/itc/{clientId}:
 *   get:
 *     tags: [GST]
 *     summary: Get ITC ledger for a client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: YYYY-MM format
 *     responses:
 *       200:
 *         description: ITC ledger retrieved
 */
router.get('/itc/:clientId', authenticate, ITCController.getLedger);

/**
 * @openapi
 * /gst/itc/{clientId}/calculate:
 *   post:
 *     tags: [GST]
 *     summary: Calculate ITC eligibility for a client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
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
 *         description: ITC calculation completed
 */
router.post('/itc/:clientId/calculate', authenticate, ITCController.calculate);

// ─── GSTR-2A Reconciliation ───────────────────────────────────────────────────

/**
 * @openapi
 * /gst/gstr2a/reconcile:
 *   post:
 *     tags: [GST]
 *     summary: Reconcile GSTR-2A with purchase data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, returnPeriod]
 *             properties:
 *               clientId:
 *                 type: string
 *               returnPeriod:
 *                 type: string
 *                 description: YYYY-MM format
 *     responses:
 *       200:
 *         description: Reconciliation completed
 */
router.post('/gstr2a/reconcile', authenticate, GSTR2AController.reconcile);

/**
 * @openapi
 * /gst/gstr2a/reconciliation/{clientId}:
 *   get:
 *     tags: [GST]
 *     summary: Get GSTR-2A reconciliation results
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: YYYY-MM format
 *     responses:
 *       200:
 *         description: Reconciliation results retrieved
 */
router.get('/gstr2a/reconciliation/:clientId', authenticate, GSTR2AController.getReconciliation);

// ─── E-Way Bill (Phase 2) ─────────────────────────────────────────────────────

/**
 * @openapi
 * /gst/eway-bill/generate:
 *   post:
 *     tags: [GST]
 *     summary: Generate an e-way bill
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceId]
 *             properties:
 *               invoiceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: E-way bill generated
 */
router.post('/eway-bill/generate', authenticate, EWayBillController.generate);

/**
 * @openapi
 * /gst/eway-bill/{no}/cancel:
 *   post:
 *     tags: [GST]
 *     summary: Cancel an e-way bill (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: no
 *         required: true
 *         schema:
 *           type: string
 *         description: E-way bill number
 *     responses:
 *       200:
 *         description: E-way bill cancelled
 */
router.post('/eway-bill/:no/cancel', authenticate, EWayBillController.cancel);

/**
 * @openapi
 * /gst/eway-bill/{no}/vehicle:
 *   patch:
 *     tags: [GST]
 *     summary: Update vehicle details for e-way bill
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: no
 *         required: true
 *         schema:
 *           type: string
 *         description: E-way bill number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleNo]
 *             properties:
 *               vehicleNo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle details updated
 */
router.patch('/eway-bill/:no/vehicle', authenticate, EWayBillController.updateVehicle);

/**
 * @openapi
 * /gst/eway-bill/invoice/{invoiceId}:
 *   get:
 *     tags: [GST]
 *     summary: Get e-way bill by invoice ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-way bill retrieved
 */
router.get('/eway-bill/invoice/:invoiceId', authenticate, EWayBillController.getByInvoice);

/**
 * @openapi
 * /gst/eway-bill/check/{invoiceId}:
 *   get:
 *     tags: [GST]
 *     summary: Check if e-way bill is required for an invoice
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Requirement check result
 */
router.get('/eway-bill/check/:invoiceId', authenticate, EWayBillController.checkRequired);

// ─── E-Invoice / IRN (Phase 2) ────────────────────────────────────────────────

/**
 * @openapi
 * /gst/e-invoice/generate/{invoiceId}:
 *   post:
 *     tags: [GST]
 *     summary: Generate e-invoice (IRN) for an invoice
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: IRN generated successfully
 */
router.post('/e-invoice/generate/:invoiceId', authenticate, EInvoiceController.generateIRN);

/**
 * @openapi
 * /gst/e-invoice/{irn}/cancel:
 *   post:
 *     tags: [GST]
 *     summary: Cancel e-invoice by IRN
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: irn
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-invoice cancelled
 */
router.post('/e-invoice/:irn/cancel', authenticate, EInvoiceController.cancelIRN);

/**
 * @openapi
 * /gst/e-invoice/invoice/{invoiceId}:
 *   get:
 *     tags: [GST]
 *     summary: Get e-invoice by invoice ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-invoice retrieved
 */
router.get('/e-invoice/invoice/:invoiceId', authenticate, EInvoiceController.getByInvoice);

// ─── GSTR-9 Annual Return (Phase 2) ──────────────────────────────────────────

/**
 * @openapi
 * /gst/gstr9/generate:
 *   post:
 *     tags: [GST]
 *     summary: Generate GSTR-9 annual return
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, financialYear]
 *             properties:
 *               clientId:
 *                 type: string
 *               financialYear:
 *                 type: string
 *                 description: YYYY-YYYY format
 *     responses:
 *       201:
 *         description: GSTR-9 generated
 */
router.post('/gstr9/generate', authenticate, GSTR9Controller.generate);

/**
 * @openapi
 * /gst/gstr9/download:
 *   get:
 *     tags: [GST]
 *     summary: Download GSTR-9 return
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: financialYear
 *         schema:
 *           type: string
 *         description: YYYY-YYYY format
 *     responses:
 *       200:
 *         description: File download
 */
router.get('/gstr9/download', authenticate, GSTR9Controller.download);

export default router;
