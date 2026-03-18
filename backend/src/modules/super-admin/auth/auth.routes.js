'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { validate } = require('../../../utils/validate');
const { loginSchema, refreshTokenSchema } = require('./auth.validation');
const { verifySuperAdminToken, auditLogMiddleware } = require('../../../middleware/superAdminAuth');

// Public routes
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshTokenSchema), controller.refresh);

// Protected routes
router.use(verifySuperAdminToken);

router.post('/logout', auditLogMiddleware('super_admin.logout', 'super_admin'), controller.logout);
router.get('/me', controller.getMe);

module.exports = router;
