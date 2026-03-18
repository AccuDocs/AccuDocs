'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./audit-logs.controller');

router.get('/', controller.list);
router.get('/export', controller.export);

module.exports = router;
