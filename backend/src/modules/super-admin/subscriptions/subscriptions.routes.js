'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./subscriptions.controller');
const { validate } = require('../../../utils/validate');
const { assignPlanSchema, extendSchema, cancelSchema } = require('./subscriptions.validation');

/**
 * @openapi
 * tags:
 *   name: Subscriptions
 *   description: Subscription management for Super Admins
 */

/**
 * @openapi
 * /super-admin/subscriptions:
 *   get:
 *     tags: [Subscriptions]
 *     summary: List all subscriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscriptions retrieved
 */
router.get('/', controller.list);

/**
 * @openapi
 * /super-admin/subscriptions/{id}:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get subscription details by ID
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
 *         description: Subscription retrieved
 */
router.get('/:id', controller.getById);

/**
 * @openapi
 * /super-admin/subscriptions/assign:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Assign a plan to an organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organizationId, planId]
 *             properties:
 *               organizationId: { type: string }
 *               planId: { type: string }
 *     responses:
 *       201:
 *         description: Plan assigned
 */
router.post('/assign', validate(assignPlanSchema), controller.assign);

/**
 * @openapi
 * /super-admin/subscriptions/{id}/extend:
 *   patch:
 *     tags: [Subscriptions]
 *     summary: Extend subscription duration
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
 *             required: [extensionDays]
 *             properties:
 *               extensionDays: { type: integer }
 *     responses:
 *       200:
 *         description: Subscription extended
 */
router.patch('/:id/extend', validate(extendSchema), controller.extend);

/**
 * @openapi
 * /super-admin/subscriptions/{id}/cancel:
 *   patch:
 *     tags: [Subscriptions]
 *     summary: Cancel subscription
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
 *         description: Subscription cancelled
 */
router.patch('/:id/cancel', validate(cancelSchema), controller.cancel);

module.exports = router;
