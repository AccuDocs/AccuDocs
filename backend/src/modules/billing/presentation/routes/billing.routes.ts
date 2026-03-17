import { Router } from 'express';
import { BillingController } from '../controllers/BillingController';
import { validate } from '../../../../middlewares/validate.middleware';
import { CreateInvoiceSchema, UpdateInvoiceStatusSchema } from '../validators/billing.validators';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/invoices', validate(CreateInvoiceSchema), BillingController.createInvoice);
router.get('/invoices', BillingController.getInvoices);
router.get('/invoices/:id', BillingController.getInvoiceById);
router.get('/invoices/:id/pdf', BillingController.generatePdf);
router.patch('/invoices/:id/status', validate(UpdateInvoiceStatusSchema), BillingController.updateStatus);
router.get('/metrics', BillingController.getMetrics);
router.get('/service-templates', BillingController.getServiceTemplates);

export default router;
