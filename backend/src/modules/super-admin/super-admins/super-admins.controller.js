'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success } = require('../../../utils/response');
const service = require('./super-admins.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await service.list();
  return success(res, result, 'Super admins retrieved');
});

exports.getMe = asyncHandler(async (req, res) => {
  return success(res, req.superAdmin, 'My profile retrieved');
});

exports.create = asyncHandler(async (req, res) => {
  const result = await service.create(req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Super admin account created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const result = await service.update(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Super admin account updated');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const result = await service.changePassword(req.superAdmin.id, req.validatedBody, {
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Password changed successfully');
});
