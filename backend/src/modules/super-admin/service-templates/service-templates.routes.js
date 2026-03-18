'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./service-templates.controller');
const { validate } = require('../../../utils/validate');
const { createTemplateSchema, updateTemplateSchema } = require('./service-templates.validation');

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createTemplateSchema), controller.create);
router.patch('/:id', validate(updateTemplateSchema), controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
