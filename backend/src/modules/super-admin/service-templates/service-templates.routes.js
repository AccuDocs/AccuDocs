'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./service-templates.controller');
const { validate } = require('../../../utils/validate');
const { createTemplateSchema, updateTemplateSchema } = require('./service-templates.validation');

/**
 * @openapi
 * tags:
 *   name: ServiceTemplates
 *   description: Management of billing service templates for Super Admins
 */

/**
 * @openapi
 * /super-admin/service-templates:
 *   get:
 *     tags: [ServiceTemplates]
 *     summary: List all service templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved
 */
router.get('/', controller.list);

/**
 * @openapi
 * /super-admin/service-templates/{id}:
 *   get:
 *     tags: [ServiceTemplates]
 *     summary: Get service template by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template retrieved
 */
router.get('/:id', controller.getById);

/**
 * @openapi
 * /super-admin/service-templates:
 *   post:
 *     tags: [ServiceTemplates]
 *     summary: Create a new service template
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, defaultPrice]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               defaultPrice: { type: number }
 *     responses:
 *       201:
 *         description: Template created
 */
router.post('/', validate(createTemplateSchema), controller.create);

/**
 * @openapi
 * /super-admin/service-templates/{id}:
 *   patch:
 *     tags: [ServiceTemplates]
 *     summary: Update an existing service template
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
 *               category: { type: string }
 *               defaultPrice: { type: number }
 *     responses:
 *       200:
 *         description: Template updated
 */
router.patch('/:id', validate(updateTemplateSchema), controller.update);

/**
 * @openapi
 * /super-admin/service-templates/{id}:
 *   delete:
 *     tags: [ServiceTemplates]
 *     summary: Delete a service template
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted
 */
router.delete('/:id', controller.delete);

module.exports = router;
