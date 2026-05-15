import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { SubLedgerController } from '../controllers/SubLedgerController';

const router = Router();

router.use(authenticate, requireRole('admin', 'accountant'));

router.get('/dashboard', SubLedgerController.dashboard);
router.get('/customers', SubLedgerController.customers);
router.get('/vendors', SubLedgerController.vendors);
router.get('/inventory', SubLedgerController.inventory);
router.get('/employees', SubLedgerController.emptyLedger);
router.get('/tax', SubLedgerController.tax);
router.get('/bank', SubLedgerController.emptyLedger);
router.get('/outstanding', SubLedgerController.outstanding);
router.get('/reports', SubLedgerController.reports);
router.get('/audit-logs', SubLedgerController.auditLogs);

export default router;
