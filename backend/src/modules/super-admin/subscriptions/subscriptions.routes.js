'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./subscriptions.controller');
const { validate } = require('../../../utils/validate');
const { assignPlanSchema, extendSchema, cancelSchema } = require('./subscriptions.validation');

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/assign', validate(assignPlanSchema), controller.assign);
router.patch('/:id/extend', validate(extendSchema), controller.extend);
router.patch('/:id/cancel', validate(cancelSchema), controller.cancel);

module.exports = router;
