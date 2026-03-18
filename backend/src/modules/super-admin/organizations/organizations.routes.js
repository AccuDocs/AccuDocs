'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./organizations.controller');
const { validate } = require('../../../utils/validate');
const { createOrgSchema, updateOrgSchema, suspendSchema, deleteSchema } = require('./organizations.validation');

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createOrgSchema), controller.create);
router.patch('/:id', validate(updateOrgSchema), controller.update);
router.post('/:id/suspend', validate(suspendSchema), controller.suspend);
router.post('/:id/activate', controller.activate);
router.delete('/:id', validate(deleteSchema), controller.delete);
router.post('/:id/impersonate', controller.impersonate);

module.exports = router;
