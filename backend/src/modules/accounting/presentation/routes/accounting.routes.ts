import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { AccountingController } from '../controllers/AccountingController';

const router = Router();

router.use(authenticate, requireRole('admin', 'accountant'));

router.get('/dashboard', AccountingController.dashboard);
router.get('/accounts', AccountingController.listAccounts);
router.post('/accounts', AccountingController.createAccount);

router.get('/vouchers', AccountingController.listVouchers);
router.post('/vouchers', AccountingController.createVoucher);
router.get('/vouchers/:id', AccountingController.getVoucher);

router.get('/journal-entries', AccountingController.listJournalEntries);
router.get('/ledger', AccountingController.ledger);

router.get('/reports/trial-balance', AccountingController.trialBalance);
router.get('/reports/profit-loss', AccountingController.profitAndLoss);
router.get('/reports/balance-sheet', AccountingController.balanceSheet);
router.get('/reports/cash-flow', AccountingController.cashFlow);

router.get('/receivables', AccountingController.receivables);
router.get('/payables', AccountingController.payables);
router.get('/settings', AccountingController.settings);

router.post('/post/invoices/:invoiceId', AccountingController.postSalesInvoice);
router.post('/post/payments/:paymentId', AccountingController.postCustomerPayment);
router.post('/post/vendor-bills/:billId', AccountingController.postVendorBill);
router.post('/post/vendor-payments/:paymentId', AccountingController.postVendorPayment);

export default router;
