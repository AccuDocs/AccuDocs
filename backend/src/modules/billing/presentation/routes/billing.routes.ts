import { Router } from 'express';
import { BillingController } from '../controllers/BillingController';
import { validate } from '../../../../middlewares/validate.middleware';
import { CreateInvoiceSchema, UpdateInvoiceStatusSchema } from '../validators/billing.validators';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Billing
 *   description: Invoices and billing management
 */

router.use(authenticate);

/**
 * @openapi
 * /billing/invoices:
 *   post:
 *     tags: [Billing]
 *     summary: Create a new invoice
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Invoice created successfully
 */
router.post('/invoices', validate(CreateInvoiceSchema), BillingController.createInvoice);

/**
 * @openapi
 * /billing/invoices:
 *   get:
 *     tags: [Billing]
 *     summary: Get all invoices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices retrieved
 */
router.get('/invoices', BillingController.getInvoices);

/**
 * @openapi
 * /billing/invoices/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: Get invoice by ID
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
 *         description: Invoice details retrieved
 */
router.get('/invoices/:id', BillingController.getInvoiceById);

/**
 * @openapi
 * /billing/invoices/{id}/pdf:
 *   get:
 *     tags: [Billing]
 *     summary: Generate and download invoice PDF
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
 *         description: PDF file generated
 */
router.get('/invoices/:id/pdf', BillingController.generatePdf);

/**
 * @openapi
 * /billing/invoices/{id}/status:
 *   patch:
 *     tags: [Billing]
 *     summary: Update invoice status
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch('/invoices/:id/status', validate(UpdateInvoiceStatusSchema), BillingController.updateStatus);

/**
 * @openapi
 * /billing/metrics:
 *   get:
 *     tags: [Billing]
 *     summary: Get billing metrics and statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved
 */
router.get('/metrics', BillingController.getMetrics);

/**
 * @openapi
 * /billing/service-templates:
 *   get:
 *     tags: [Billing]
 *     summary: Get available service templates for billing
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service templates retrieved
 */
router.get('/service-templates', BillingController.getServiceTemplates);

/**
 * @openapi
 * /billing/recurring-templates:
 *   get:
 *     tags: [Billing]
 *     summary: Get recurring billing templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recurring templates retrieved
 */
router.get('/recurring-templates', BillingController.getRecurringTemplates);

export default router;
