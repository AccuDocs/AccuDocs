'use strict';

import express from 'express';
const router = express.Router();
import rateLimit from 'express-rate-limit';
const { verifySuperAdminToken } = require('../../middleware/superAdminAuth');

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests.' },
});

// Auth routes (no token required, but rate limited)
router.use('/auth', require('./auth/auth.routes'));

// All other routes: require super admin token
// router.use(generalLimiter); // Removed for development testing
router.use(verifySuperAdminToken);

// Mount sub-modules
router.use('/organizations', require('./organizations/organizations.routes'));
router.use('/subscriptions', require('./subscriptions/subscriptions.routes'));
router.use('/analytics', require('./analytics/analytics.routes'));
router.use('/service-templates', require('./service-templates/service-templates.routes'));
router.use('/audit-logs', require('./audit-logs/audit-logs.routes'));
router.use('/announcements', require('./announcements/announcements.routes'));
router.use('/super-admins', require('./super-admins/super-admins.routes'));

export default router;
