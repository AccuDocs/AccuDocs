'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success } = require('../../../utils/response');
const authService = require('./auth.service');

/**
 * Super Admin authentication controller
 */
exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    ...req.validatedBody,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.id
  });
  return success(res, result, 'Login successful');
});

exports.refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.validatedBody.refreshToken);
  return success(res, result, 'Token refreshed successfully');
});

exports.logout = asyncHandler(async (req, res) => {
  // Stateless logout - token handled by client
  // res.locals.auditPayload can be set here if auditLogMiddleware is used
  res.locals.auditPayload = {
    action: 'super_admin.logout',
    description: `Super admin ${req.superAdmin.email} logged out`
  };
  return success(res, null, 'Logged out successfully');
});

exports.getMe = asyncHandler(async (req, res) => {
  const admin = await authService.getMe(req.superAdmin.id);
  return success(res, admin, 'Profile retrieved successfully');
});
