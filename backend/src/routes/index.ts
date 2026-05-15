import { Router } from 'express';
import { logger } from '../utils/logger';

import authRoutes from '../modules/auth/presentation/routes/auth.routes';
import clientRoutes from '../modules/client/presentation/client.routes';
import billingRoutes from '../modules/billing/presentation/routes/billing.routes';
import documentRoutes from '../modules/documents/presentation/routes/documents.routes';
import intelligenceRoutes from '../modules/intelligence/presentation/routes/intelligence.routes';
import taskRoutes from '../modules/tasks/presentation/routes/tasks.routes';
import notificationRoutes from '../modules/notifications/presentation/routes/notifications.routes';
import workspaceRoutes from '../modules/documents/presentation/routes/workspace.routes';
import complianceRoutes from '../modules/compliance/presentation/routes/compliance.routes';
import checklistRoutes from '../modules/checklist/presentation/routes/checklist.routes';
import logRoutes from '../modules/auth/presentation/routes/log.routes';
import userRoutes from '../modules/auth/presentation/routes/user.routes';
import whatsappRoutes from '../modules/notifications/presentation/routes/whatsapp.routes';
import dataRoutes from '../modules/data/data.routes';
import gstRoutes from '../modules/gst/presentation/routes/gst.routes';
import inventoryRoutes from '../modules/inventory/presentation/routes/inventory.routes';
import vendorRoutes from '../modules/vendors/presentation/routes/vendor.routes';
import subLedgerRoutes from '../modules/sub-ledger/presentation/routes/sub-ledger.routes';
import publicRoutes from './public.routes';

const router = Router();


// Middleware to log API hits
router.use((req, res, next) => {
  logger.info(`Incoming API Request: ${req.method} ${req.url}`);
  next();
});

import superAdminRoutes from '../modules/super-admin';

// App Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'AccuDocs API is healthy' });
});

// Mount modular routes
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/billing', billingRoutes);
router.use('/documents', documentRoutes);
router.use('/intelligence', intelligenceRoutes);
router.use('/tasks', taskRoutes);
router.use('/notifications', notificationRoutes);
router.use('/workspace', workspaceRoutes);
router.use('/compliance', complianceRoutes);
router.use('/checklists', checklistRoutes);
router.use('/logs', logRoutes);
router.use('/users', userRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/clients', dataRoutes); // Data module: /:clientId/sales, /purchases, /expenses, /gst-summary
router.use('/gst', gstRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/vendors', vendorRoutes);
router.use('/sub-ledger', subLedgerRoutes);

// Public endpoints (no authentication required)
router.use('/public', publicRoutes);

// Super Admin Module
router.use('/super-admin', superAdminRoutes);

export default router;
