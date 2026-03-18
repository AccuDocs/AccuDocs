'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success, paginated } = require('../../../utils/response');
const service = require('./subscriptions.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await service.list(req.query);
  return paginated(res, result.data, result.pagination, 'Subscriptions retrieved successfully');
});

exports.getById = asyncHandler(async (req, res) => {
  const result = await service.getById(req.params.id);
  return success(res, result, 'Subscription details retrieved');
});

exports.assign = asyncHandler(async (req, res) => {
  const result = await service.assign(req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Plan assigned successfully', 201);
});

exports.extend = asyncHandler(async (req, res) => {
  const result = await service.extend(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Subscription extended successfully');
});

exports.cancel = asyncHandler(async (req, res) => {
  const result = await service.cancel(req.params.id, req.validatedBody, {
    superAdminId: req.superAdmin.id,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, 'Subscription cancellation processed');
});
