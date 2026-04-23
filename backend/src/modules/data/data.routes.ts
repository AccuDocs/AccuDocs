import { Router } from 'express';
import multer from 'multer';
import { authenticate, adminOnly } from '../../middlewares';
import * as DataController from './DataController';
import * as DashboardController from './DashboardController';
import { uploadScannerSaveDocument } from '../scanner/middleware/upload';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// All routes require authentication + admin role
router.use(authenticate, adminOnly);

/**
 * @openapi
 * tags:
 *   name: Data
 *   description: Client sales, purchases, expenses, GST summary, and dashboard analytics
 */

// ===================== SALES =====================

/**
 * @openapi
 * /clients/{clientId}/sales:
 *   get:
 *     tags: [Data]
 *     summary: Get all sales for a client
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
 *         description: List of sales retrieved
 */
router.get('/:clientId/sales', DataController.getSales);

/**
 * @openapi
 * /clients/{clientId}/sales:
 *   post:
 *     tags: [Data]
 *     summary: Create a new sale for a client
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
 *             required: [invoiceNo, date, amount]
 *             properties:
 *               invoiceNo:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               amount:
 *                 type: number
 *               gstAmount:
 *                 type: number
 *               partyName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sale created successfully
 */
router.post('/:clientId/sales', DataController.createSale);

/**
 * @openapi
 * /clients/{clientId}/sales/{saleId}:
 *   put:
 *     tags: [Data]
 *     summary: Update an existing sale
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: saleId
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
 *         description: Sale updated successfully
 */
router.put('/:clientId/sales/:saleId', DataController.updateSale);

/**
 * @openapi
 * /clients/{clientId}/sales/{saleId}:
 *   delete:
 *     tags: [Data]
 *     summary: Delete a sale
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Sale deleted successfully
 */
router.delete('/:clientId/sales/:saleId', DataController.deleteSale);

/**
 * @openapi
 * /clients/{clientId}/sales/upload:
 *   post:
 *     tags: [Data]
 *     summary: Bulk upload sales from Excel/CSV
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
 *         description: Upload processed successfully
 */
router.post('/:clientId/sales/upload', upload.single('file'), DataController.uploadSales);

// ===================== PURCHASES =====================

/**
 * @openapi
 * /clients/{clientId}/purchases:
 *   get:
 *     tags: [Data]
 *     summary: Get all purchases for a client
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
 *         description: List of purchases retrieved
 */
router.get('/:clientId/purchases', DataController.getPurchases);

/**
 * @openapi
 * /clients/{clientId}/purchases:
 *   post:
 *     tags: [Data]
 *     summary: Create a new purchase for a client
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
 *             required: [invoiceNo, date, amount]
 *             properties:
 *               invoiceNo:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               amount:
 *                 type: number
 *               gstAmount:
 *                 type: number
 *               partyName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase created successfully
 */
router.post('/:clientId/purchases', DataController.createPurchase);

/**
 * @openapi
 * /clients/{clientId}/purchases/{purchaseId}:
 *   put:
 *     tags: [Data]
 *     summary: Update an existing purchase
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: purchaseId
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
 *         description: Purchase updated successfully
 */
router.put('/:clientId/purchases/:purchaseId', DataController.updatePurchase);

/**
 * @openapi
 * /clients/{clientId}/purchases/{purchaseId}:
 *   delete:
 *     tags: [Data]
 *     summary: Delete a purchase
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: purchaseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Purchase deleted successfully
 */
router.delete('/:clientId/purchases/:purchaseId', DataController.deletePurchase);

/**
 * @openapi
 * /clients/{clientId}/purchases/upload:
 *   post:
 *     tags: [Data]
 *     summary: Bulk upload purchases from Excel/CSV
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
 *         description: Upload processed successfully
 */
router.post('/:clientId/purchases/upload', upload.single('file'), DataController.uploadPurchases);

// ===================== EXPENSES =====================

/**
 * @openapi
 * /clients/{clientId}/expenses:
 *   get:
 *     tags: [Data]
 *     summary: Get all expenses for a client
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
 *         description: List of expenses retrieved
 */
router.get('/:clientId/expenses', DataController.getExpenses);

/**
 * @openapi
 * /clients/{clientId}/expenses:
 *   post:
 *     tags: [Data]
 *     summary: Create a new expense for a client
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
 *             required: [date, amount, category]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               gstAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Expense created successfully
 */
router.post('/:clientId/expenses', DataController.createExpense);

/**
 * @openapi
 * /clients/{clientId}/expenses/{expenseId}:
 *   put:
 *     tags: [Data]
 *     summary: Update an existing expense
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: expenseId
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
 *         description: Expense updated successfully
 */
router.put('/:clientId/expenses/:expenseId', DataController.updateExpense);

/**
 * @openapi
 * /clients/{clientId}/expenses/{expenseId}:
 *   delete:
 *     tags: [Data]
 *     summary: Delete an expense
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Expense deleted successfully
 */
router.delete('/:clientId/expenses/:expenseId', DataController.deleteExpense);

/**
 * @openapi
 * /clients/{clientId}/expenses/upload:
 *   post:
 *     tags: [Data]
 *     summary: Bulk upload expenses from Excel/CSV
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
 *         description: Upload processed successfully
 */
router.post('/:clientId/expenses/upload', upload.single('file'), DataController.uploadExpenses);

/**
 * @openapi
 * /clients/{clientId}/scanner/import:
 *   post:
 *     tags: [Data]
 *     summary: Import scanned document into client data
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Scanned document imported successfully
 */
router.post('/:clientId/scanner/import', uploadScannerSaveDocument, DataController.importScannedDocument);

// ===================== GST SUMMARY =====================

/**
 * @openapi
 * /clients/{clientId}/gst-summary:
 *   get:
 *     tags: [Data]
 *     summary: Get GST summary for a client
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
 *         description: GST summary retrieved
 */
router.get('/:clientId/gst-summary', DataController.getGstSummary);

// ===================== DASHBOARD V2 =====================

/**
 * @openapi
 * /clients/{clientId}/dashboard/summary:
 *   get:
 *     tags: [Data]
 *     summary: Get dashboard summary for a client
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
 *         description: Dashboard summary retrieved
 */
router.get('/:clientId/dashboard/summary', DashboardController.getDashboardSummary);

/**
 * @openapi
 * /clients/{clientId}/dashboard/analytics:
 *   get:
 *     tags: [Data]
 *     summary: Get dashboard analytics for a client
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
 *         description: Dashboard analytics retrieved
 */
router.get('/:clientId/dashboard/analytics', DashboardController.getDashboardAnalytics);

/**
 * @openapi
 * /clients/{clientId}/dashboard/return-status:
 *   get:
 *     tags: [Data]
 *     summary: Get GST return status for a client
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
 *         description: Return status retrieved
 */
router.get('/:clientId/dashboard/return-status', DashboardController.getReturnStatus);

/**
 * @openapi
 * /clients/{clientId}/dashboard/alerts:
 *   get:
 *     tags: [Data]
 *     summary: Get dashboard alerts for a client
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
 *         description: Alerts retrieved
 */
router.get('/:clientId/dashboard/alerts', DashboardController.getAlerts);

/**
 * @openapi
 * /clients/{clientId}/dashboard/activity:
 *   get:
 *     tags: [Data]
 *     summary: Get recent activity for a client
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
 *         description: Activity retrieved
 */
router.get('/:clientId/dashboard/activity', DashboardController.getActivity);

/**
 * @openapi
 * /clients/{clientId}/dashboard/upload-status:
 *   get:
 *     tags: [Data]
 *     summary: Get document upload status for a client
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
 *         description: Upload status retrieved
 */
router.get('/:clientId/dashboard/upload-status', DashboardController.getUploadStatus);

// ===================== GST ACTIONS =====================

/**
 * @openapi
 * /clients/{clientId}/compute-gst:
 *   post:
 *     tags: [Data]
 *     summary: Compute GST for a client
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
 *             required: [period]
 *             properties:
 *               period:
 *                 type: string
 *                 description: YYYY-MM format
 *     responses:
 *       200:
 *         description: GST computed successfully
 */
router.post('/:clientId/compute-gst', DashboardController.computeGST);

/**
 * @openapi
 * /clients/{clientId}/validate:
 *   post:
 *     tags: [Data]
 *     summary: Validate client transactions
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
 *         description: Validation results retrieved
 */
router.post('/:clientId/validate', DashboardController.validateTransactions);

/**
 * @openapi
 * /clients/{clientId}/gst-returns:
 *   post:
 *     tags: [Data]
 *     summary: Save GST return for a client
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
 *             required: [returnPeriod, returnType]
 *             properties:
 *               returnPeriod:
 *                 type: string
 *                 description: YYYY-MM format
 *               returnType:
 *                 type: string
 *                 enum: [GSTR1, GSTR3B]
 *     responses:
 *       201:
 *         description: GST return saved successfully
 */
router.post('/:clientId/gst-returns', DashboardController.saveGstReturn);

export default router;
