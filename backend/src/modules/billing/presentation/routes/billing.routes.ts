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
router.post('/invoices/:id/convert-to-tax', InvoiceTemplateController.convertToTax);

// ─── PDF Generation (template-aware POST, legacy GET) ────────────────────────
router.post('/invoices/:id/pdf', InvoiceTemplateController.generatePdf);
router.get('/invoices/:id/pdf', BillingController.generatePdf);

// ─── Payment Links ────────────────────────────────────────────────────────────
router.post('/invoices/:id/payment-link', PaymentLinkController.generateLink);

// ─── Invoice Templates ────────────────────────────────────────────────────────
router.get('/templates', InvoiceTemplateController.getTemplates);
router.get('/templates/:id', InvoiceTemplateController.getTemplateById);
router.post('/templates', InvoiceTemplateController.createTemplate);
router.patch('/templates/:id/set-default', InvoiceTemplateController.setDefault);

// ─── Metrics & Reference Data ─────────────────────────────────────────────────
router.get('/metrics', BillingController.getMetrics);
router.get('/service-templates', BillingController.getServiceTemplates);
router.get('/recurring-templates', BillingController.getRecurringTemplates);

// ─── Recurring Invoices (Phase 2) ─────────────────────────────────────────────
router.post('/recurring-invoices', RecurringInvoiceController.create);
router.get('/recurring-invoices', RecurringInvoiceController.list);
router.get('/recurring-invoices/:id', RecurringInvoiceController.getById);
router.patch('/recurring-invoices/:id/pause', RecurringInvoiceController.pause);
router.patch('/recurring-invoices/:id/resume', RecurringInvoiceController.resume);

// ─── Bulk Invoice Generation (Phase 2) ────────────────────────────────────────
router.post('/invoices/bulk-generate', BulkInvoiceController.createJob);
router.get('/invoices/bulk-job/:jobId', BulkInvoiceController.getJobStatus);

// ─── Currency Rates (Phase 2) ─────────────────────────────────────────────────
router.get('/currency-rates', CurrencyController.getRates);

export default router;
