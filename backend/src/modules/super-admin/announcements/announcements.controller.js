'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success, paginated } = require('../../../utils/response');
const service = require('./announcements.service');

exports.broadcast = asyncHandler(async (req, res) => {
  const result = await service.broadcast(req.validatedBody, {
    superAdminId: req.superAdmin.id,
    superAdminEmail: req.superAdmin.email,
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  return success(res, result, result.notifications_created > 0 ? 'Broadcast initiated' : 'No target admins found');
});

exports.getHistory = asyncHandler(async (req, res) => {
  const result = await service.getHistory(req.query);
  return paginated(res, result.data, result.pagination, 'Announcement history retrieved');
});
