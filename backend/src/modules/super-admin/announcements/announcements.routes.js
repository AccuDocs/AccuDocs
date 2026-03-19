'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./announcements.controller');
const { validate } = require('../../../utils/validate');
const { broadcastSchema } = require('./announcements.validation');

/**
 * @openapi
 * tags:
 *   name: Announcements
 *   description: System-wide announcements and broadcasts for Super Admins
 */

/**
 * @openapi
 * /super-admin/announcements/broadcast:
 *   post:
 *     tags: [Announcements]
 *     summary: Broadcast a new announcement to all or specific organizations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               targetOrgIds: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Announcement broadcasted
 */
router.post('/broadcast', validate(broadcastSchema), controller.broadcast);

/**
 * @openapi
 * /super-admin/announcements/history:
 *   get:
 *     tags: [Announcements]
 *     summary: Get broadcast history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Broadcast history retrieved
 */
router.get('/history', controller.getHistory);

module.exports = router;
