'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./announcements.controller');
const { validate } = require('../../../utils/validate');
const { broadcastSchema } = require('./announcements.validation');

router.post('/broadcast', validate(broadcastSchema), controller.broadcast);
router.get('/history', controller.getHistory);

module.exports = router;
