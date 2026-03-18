'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success, paginated } = require('../../../utils/response');
const service = require('./service-templates.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await service.list(req.query);
  return paginated(res, result.data, result.pagination, 'Service templates retrieved');
});

exports.getById = asyncHandler(async (req, res) => {
  const result = await service.getById(req.params.id);
  return success(res, result, 'Service template details retrieved');
});

exports.create = asyncHandler(async (req, res) => {
  const result = await service.create(req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Service template created successfully', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const result = await service.update(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Service template updated successfully');
});

exports.delete = asyncHandler(async (req, res) => {
  const result = await service.delete(req.params.id, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
    });
  return success(res, result, 'Service template deleted successfully');
});
