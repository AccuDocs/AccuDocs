'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./analytics.controller');

router.get('/overview', controller.getOverview);
router.get('/organizations', controller.getOrganizationsHealth);
router.get('/revenue', controller.getRevenue);
router.get('/growth', controller.getGrowth);

module.exports = router;
