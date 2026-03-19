'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./audit-logs.controller');

/**
 * @openapi
 * tags:
 *   name: AuditLogs
 *   description: System audit logs for Super Admins
 */

/**
 * @openapi
 * /super-admin/audit-logs:
 *   get:
 *     tags: [AuditLogs]
 *     summary: List all system audit logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 */
router.get('/', controller.list);

/**
 * @openapi
 * /super-admin/audit-logs/export:
 *   get:
 *     tags: [AuditLogs]
 *     summary: Export audit logs as CSV/Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Export file generated
 */
router.get('/export', controller.export);

module.exports = router;
