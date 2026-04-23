import { Router } from 'express';
import { BillingController } from '../controllers/BillingController';
import { InvoiceTemplateController } from '../controllers/InvoiceTemplateController';
import { PaymentLinkController } from '../controllers/PaymentLinkController';
import { RecurringInvoiceController } from '../controllers/RecurringInvoiceController';
import { BulkInvoiceController } from '../controllers/BulkInvoiceController';
import { CurrencyController } from '../controllers/CurrencyController';
import { validate } from '../../../../middlewares/validate.middleware';
import { CreateInvoiceSchema, UpdateInvoiceStatusSchema } from '../validators/billing.validators';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Billing
 *   description: Invoices, templates, payment links, recurring billing, bulk generation, and currency management
 */

router.use(authenticate);

// ─── Invoice CRUD ─────────────────────────────────────────────────────────────
router.post('/invoices', validate(CreateInvoiceSchema), BillingController.createInvoice);
router.get('/invoices', BillingController.getInvoices);
router.get('/invoices/:id', BillingController.getInvoiceById);
router.patch('/invoices/:id/status', validate(UpdateInvoiceStatusSchema), BillingController.updateStatus);

// ─── Proforma → Tax Invoice Conversion ───────────────────────────────────────

/**
 * @openapi
 * /billing/invoices/{id}/convert-to-tax:
 *   post:
 *     tags: [Billing]
 *     summary: Convert proforma invoice to tax invoice
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
 *         description: Invoice converted successfully
 */
router.post('/invoices/:id/convert-to-tax', InvoiceTemplateController.convertToTax);

// ─── PDF Generation (template-aware POST, legacy GET) ────────────────────────

/**
 * @openapi
 * /billing/invoices/{id}/pdf:
 *   post:
 *     tags: [Billing]
 *     summary: Generate PDF for an invoice (template-aware)
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
 *         description: PDF generated
 */
router.post('/invoices/:id/pdf', InvoiceTemplateController.generatePdf);

/**
 * @openapi
 * /billing/invoices/{id}/pdf:
 *   get:
 *     tags: [Billing]
 *     summary: Download invoice PDF (legacy)
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
 *         description: PDF downloaded
 */
router.get('/invoices/:id/pdf', BillingController.generatePdf);

// ─── Payment Links ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /billing/invoices/{id}/payment-link:
 *   post:
 *     tags: [Billing]
 *     summary: Generate payment link for an invoice
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
 *         description: Payment link generated
 */
router.post('/invoices/:id/payment-link', PaymentLinkController.generateLink);

// ─── Invoice Templates ────────────────────────────────────────────────────────

/**
 * @openapi
 * /billing/templates:
 *   get:
 *     tags: [Billing]
 *     summary: List all invoice templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved
 */
router.get('/templates', InvoiceTemplateController.getTemplates);

/**
 * @openapi
 * /billing/templates/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: Get invoice template by ID
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
 *         description: Template retrieved
 */
router.get('/templates/:id', InvoiceTemplateController.getTemplateById);

/**
 * @openapi
 * /billing/templates:
 *   post:
 *     tags: [Billing]
 *     summary: Create a new invoice template
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               layout:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template created
 */
router.post('/templates', InvoiceTemplateController.createTemplate);

/**
 * @openapi
 * /billing/templates/{id}/set-default:
 *   patch:
 *     tags: [Billing]
 *     summary: Set template as default
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
 *         description: Default template updated
 */
router.patch('/templates/:id/set-default', InvoiceTemplateController.setDefault);

// ─── Metrics & Reference Data ─────────────────────────────────────────────────

/**
 * @openapi
 * /billing/metrics:
 *   get:
 *     tags: [Billing]
 *     summary: Get billing metrics and KPIs
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
 *     summary: Get available service templates
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
 *     summary: Get recurring invoice templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recurring templates retrieved
 */
router.get('/recurring-templates', BillingController.getRecurringTemplates);

// ─── Recurring Invoices (Phase 2) ─────────────────────────────────────────────

/**
 * @openapi
 * /billing/recurring-invoices:
 *   post:
 *     tags: [Billing]
 *     summary: Create a recurring invoice schedule
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientId, frequency, startDate]
 *             properties:
 *               clientId:
 *                 type: string
 *               frequency:
 *                 type: string
 *                 enum: [weekly, monthly, quarterly, yearly]
 *               startDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Recurring invoice created
 */
router.post('/recurring-invoices', RecurringInvoiceController.create);

/**
 * @openapi
 * /billing/recurring-invoices:
 *   get:
 *     tags: [Billing]
 *     summary: List all recurring invoices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recurring invoices retrieved
 */
router.get('/recurring-invoices', RecurringInvoiceController.list);

/**
 * @openapi
 * /billing/recurring-invoices/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: Get recurring invoice by ID
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
 *         description: Recurring invoice retrieved
 */
router.get('/recurring-invoices/:id', RecurringInvoiceController.getById);

/**
 * @openapi
 * /billing/recurring-invoices/{id}/pause:
 *   patch:
 *     tags: [Billing]
 *     summary: Pause a recurring invoice
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
 *         description: Recurring invoice paused
 */
router.patch('/recurring-invoices/:id/pause', RecurringInvoiceController.pause);

/**
 * @openapi
 * /billing/recurring-invoices/{id}/resume:
 *   patch:
 *     tags: [Billing]
 *     summary: Resume a recurring invoice
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
 *         description: Recurring invoice resumed
 */
router.patch('/recurring-invoices/:id/resume', RecurringInvoiceController.resume);

// ─── Bulk Invoice Generation (Phase 2) ────────────────────────────────────────

/**
 * @openapi
 * /billing/invoices/bulk-generate:
 *   post:
 *     tags: [Billing]
 *     summary: Create a bulk invoice generation job
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientIds, templateId]
 *             properties:
 *               clientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               templateId:
 *                 type: string
 *     responses:
 *       202:
 *         description: Bulk job created
 */
router.post('/invoices/bulk-generate', BulkInvoiceController.createJob);

/**
 * @openapi
 * /billing/invoices/bulk-job/{jobId}:
 *   get:
 *     tags: [Billing]
 *     summary: Get bulk invoice generation job status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status retrieved
 */
router.get('/invoices/bulk-job/:jobId', BulkInvoiceController.getJobStatus);

// ─── Currency Rates (Phase 2) ─────────────────────────────────────────────────

/**
 * @openapi
 * /billing/currency-rates:
 *   get:
 *     tags: [Billing]
 *     summary: Get current currency exchange rates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Currency rates retrieved
 */
router.get('/currency-rates', CurrencyController.getRates);

export default router;
