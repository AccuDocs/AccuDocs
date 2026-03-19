'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./super-admins.controller');
const { validate } = require('../../../utils/validate');
const { createSuperAdminSchema, updateSuperAdminSchema, changePasswordSchema } = require('./super-admins.validation');

/**
 * @openapi
 * tags:
 *   name: SuperAdmins
 *   description: Super Admin account management
 */

/**
 * @openapi
 * /super-admin/super-admins/me:
 *   get:
 *     tags: [SuperAdmins]
 *     summary: Get current super admin profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 */
router.get('/me', controller.getMe);

/**
 * @openapi
 * /super-admin/super-admins/change-password:
 *   post:
 *     tags: [SuperAdmins]
 *     summary: Change super admin password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post('/change-password', validate(changePasswordSchema), controller.changePassword);

/**
 * @openapi
 * /super-admin/super-admins:
 *   get:
 *     tags: [SuperAdmins]
 *     summary: List all super admins
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of super admins retrieved
 */
router.get('/', controller.list);

/**
 * @openapi
 * /super-admin/super-admins:
 *   post:
 *     tags: [SuperAdmins]
 *     summary: Create a new super admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [super_admin, admin] }
 *     responses:
 *       201:
 *         description: Super admin created
 */
router.post('/', validate(createSuperAdminSchema), controller.create);

/**
 * @openapi
 * /super-admin/super-admins/{id}:
 *   patch:
 *     tags: [SuperAdmins]
 *     summary: Update super admin details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string }
 *     responses:
 *       200:
 *         description: Super admin updated
 */
router.patch('/:id', validate(updateSuperAdminSchema), controller.update);

module.exports = router;
