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

// ===================== SALES =====================
router.get('/:clientId/sales', DataController.getSales);
router.post('/:clientId/sales', DataController.createSale);
router.put('/:clientId/sales/:saleId', DataController.updateSale);
router.delete('/:clientId/sales/:saleId', DataController.deleteSale);
router.post('/:clientId/sales/upload', upload.single('file'), DataController.uploadSales);

// ===================== PURCHASES =====================
router.get('/:clientId/purchases', DataController.getPurchases);
router.post('/:clientId/purchases', DataController.createPurchase);
router.put('/:clientId/purchases/:purchaseId', DataController.updatePurchase);
router.delete('/:clientId/purchases/:purchaseId', DataController.deletePurchase);
router.post('/:clientId/purchases/upload', upload.single('file'), DataController.uploadPurchases);

// ===================== EXPENSES =====================
router.get('/:clientId/expenses', DataController.getExpenses);
router.post('/:clientId/expenses', DataController.createExpense);
router.put('/:clientId/expenses/:expenseId', DataController.updateExpense);
router.delete('/:clientId/expenses/:expenseId', DataController.deleteExpense);
router.post('/:clientId/expenses/upload', upload.single('file'), DataController.uploadExpenses);
router.post('/:clientId/scanner/import', uploadScannerSaveDocument, DataController.importScannedDocument);

// ===================== GST SUMMARY =====================
router.get('/:clientId/gst-summary', DataController.getGstSummary);

// ===================== DASHBOARD V2 =====================
router.get('/:clientId/dashboard/summary', DashboardController.getDashboardSummary);
router.get('/:clientId/dashboard/analytics', DashboardController.getDashboardAnalytics);
router.get('/:clientId/dashboard/return-status', DashboardController.getReturnStatus);
router.get('/:clientId/dashboard/alerts', DashboardController.getAlerts);
router.get('/:clientId/dashboard/activity', DashboardController.getActivity);
router.get('/:clientId/dashboard/upload-status', DashboardController.getUploadStatus);

// ===================== GST ACTIONS =====================
router.post('/:clientId/compute-gst', DashboardController.computeGST);
router.post('/:clientId/validate', DashboardController.validateTransactions);
router.post('/:clientId/gst-returns', DashboardController.saveGstReturn);

export default router;
