import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { VendorController } from '../controllers/VendorController';

const router = Router();

router.use(authenticate, requireRole('admin', 'accountant'));

router.get('/dashboard', VendorController.getDashboard);
router.get('/accounts-payable', VendorController.getAccountsPayable);

router.get('/purchase-orders/list/all', VendorController.listPurchaseOrders);
router.post('/purchase-orders', VendorController.createPurchaseOrder);
router.patch('/purchase-orders/:id/status', VendorController.updatePurchaseOrderStatus);

router.get('/bills/list/all', VendorController.listBills);
router.post('/bills', VendorController.createBill);

router.get('/payments/list/all', VendorController.listPayments);
router.post('/payments', VendorController.createPayment);

router.get('/documents/list/all', VendorController.listDocuments);
router.post('/documents', VendorController.createDocument);

router.get('/', VendorController.listVendors);
router.post('/', VendorController.createVendor);
router.get('/:id', VendorController.getVendor);
router.put('/:id', VendorController.updateVendor);
router.delete('/:id', VendorController.deleteVendor);

export default router;
