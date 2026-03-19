'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./analytics.controller');

/**
 * @openapi
 * tags:
 *   name: Analytics
 *   description: Platform analytics and insights for Super Admins
 */

/**
 * @openapi
 * /super-admin/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Get platform overview metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview metrics retrieved
 */
router.get('/overview', controller.getOverview);

/**
 * @openapi
 * /super-admin/analytics/organizations:
 *   get:
 *     tags: [Analytics]
 *     summary: Get organizations health and usage stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health stats retrieved
 */
router.get('/organizations', controller.getOrganizationsHealth);

/**
 * @openapi
 * /super-admin/analytics/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Get revenue and billing analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue metrics retrieved
 */
router.get('/revenue', controller.getRevenue);

/**
 * @openapi
 * /super-admin/analytics/growth:
 *   get:
 *     tags: [Analytics]
 *     summary: Get user and organization growth trends
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Growth metrics retrieved
 */
router.get('/growth', controller.getGrowth);

module.exports = router;
