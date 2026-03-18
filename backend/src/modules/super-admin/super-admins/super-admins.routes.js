'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./super-admins.controller');
const { validate } = require('../../../utils/validate');
const { createSuperAdminSchema, updateSuperAdminSchema, changePasswordSchema } = require('./super-admins.validation');

router.get('/me', controller.getMe);
router.post('/change-password', validate(changePasswordSchema), controller.changePassword);

// Manage other super admins (requires full super_admin role check handled in index.js)
router.get('/', controller.list);
router.post('/', validate(createSuperAdminSchema), controller.create);
router.patch('/:id', validate(updateSuperAdminSchema), controller.update);

module.exports = router;
