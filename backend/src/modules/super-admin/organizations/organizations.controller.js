'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success, paginated } = require('../../../utils/response');
const service = require('./organizations.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await service.list(req.query);
  return paginated(res, result.data, result.pagination, 'Organizations retrieved successfully');
});

exports.getById = asyncHandler(async (req, res) => {
  const result = await service.getById(req.params.id);
  return success(res, result, 'Organization details retrieved');
});

exports.create = asyncHandler(async (req, res) => {
  const result = await service.create(req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Organization created successfully', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const result = await service.update(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Organization updated successfully');
});

exports.suspend = asyncHandler(async (req, res) => {
  const result = await service.suspend(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Organization suspended successfully');
});

exports.activate = asyncHandler(async (req, res) => {
  const result = await service.activate(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Organization activated successfully');
});

exports.delete = asyncHandler(async (req, res) => {
  const result = await service.delete(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Organization soft-deleted successfully');
});

exports.impersonate = asyncHandler(async (req, res) => {
  const result = await service.impersonate(req.params.id, {
    superAdminId: req.superAdmin.id,
    superAdminEmail: req.superAdmin.email
  });
  return success(res, result, 'Impersonation token generated');
});
