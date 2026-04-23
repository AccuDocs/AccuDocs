'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./organizations.controller');
const { validate } = require('../../../utils/validate');
const { createOrgSchema, updateOrgSchema, suspendSchema, deleteSchema } = require('./organizations.validation');

/**
 * @openapi
 * tags:
 *   name: Organizations
 *   description: Organization management for Super Admins
 */

/**
 * @openapi
 * /super-admin/organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List all organizations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations retrieved
 */
router.get('/', controller.list);

/**
 * @openapi
 * /super-admin/organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization details retrieved
 */
router.get('/:id', controller.getById);

/**
 * @openapi
 * /super-admin/organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create new organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, code]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created
 */
router.post('/', validate(createOrgSchema), controller.create);

/**
 * @openapi
 * /super-admin/organizations/{id}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization updated
 */
router.patch('/:id', validate(updateOrgSchema), controller.update);

/**
 * @openapi
 * /super-admin/organizations/{id}/suspend:
 *   post:
 *     tags: [Organizations]
 *     summary: Suspend organization
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization suspended
 */
router.post('/:id/suspend', validate(suspendSchema), controller.suspend);

/**
 * @openapi
 * /super-admin/organizations/{id}/activate:
 *   post:
 *     tags: [Organizations]
 *     summary: Activate organization
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization activated
 */
router.post('/:id/activate', controller.activate);

/**
 * @openapi
 * /super-admin/organizations/{id}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete organization
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization deleted
 */
router.delete('/:id', validate(deleteSchema), controller.delete);

/**
 * @openapi
 * /super-admin/organizations/{id}/impersonate:
 *   post:
 *     tags: [Organizations]
 *     summary: Impersonate organization
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Impersonation successful
 */
router.post('/:id/impersonate', controller.impersonate);

module.exports = router;
