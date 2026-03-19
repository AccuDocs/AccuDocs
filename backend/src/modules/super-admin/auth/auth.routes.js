'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { validate } = require('../../../utils/validate');
const { loginSchema, refreshTokenSchema } = require('./auth.validation');
const { verifySuperAdminToken, auditLogMiddleware } = require('../../../middleware/superAdminAuth');

// Public routes
/**
 * @openapi
 * tags:
 *   name: SuperAdminAuth
 *   description: Authentication for Super Admins
 */

/**
 * @openapi
 * /super-admin/auth/login:
 *   post:
 *     tags: [SuperAdminAuth]
 *     summary: Login for Super Admins
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', validate(loginSchema), controller.login);

/**
 * @openapi
 * /super-admin/auth/refresh:
 *   post:
 *     tags: [SuperAdminAuth]
 *     summary: Refresh Super Admin access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh', validate(refreshTokenSchema), controller.refresh);

// Protected routes
router.use(verifySuperAdminToken);

/**
 * @openapi
 * /super-admin/auth/logout:
 *   post:
 *     tags: [SuperAdminAuth]
 *     summary: Logout Super Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', auditLogMiddleware('super_admin.logout', 'super_admin'), controller.logout);

/**
 * @openapi
 * /super-admin/auth/me:
 *   get:
 *     tags: [SuperAdminAuth]
 *     summary: Get current super admin profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 */
router.get('/me', controller.getMe);

module.exports = router;
