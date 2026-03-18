'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success } = require('../../../utils/response');
const service = require('./analytics.service');

exports.getOverview = asyncHandler(async (req, res) => {
  const result = await service.getOverview();
  return success(res, result, 'Platform overview retrieved successfully');
});

exports.getOrganizationsHealth = asyncHandler(async (req, res) => {
  const result = await service.getOrganizationsHealth(req.query);
  return success(res, result, 'Organization health metrics retrieved');
});

exports.getRevenue = asyncHandler(async (req, res) => {
  const result = await service.getRevenue(req.query);
  return success(res, result, 'Revenue analytics retrieved');
});

exports.getGrowth = asyncHandler(async (req, res) => {
  const result = await service.getGrowth();
  return success(res, result, 'Growth analytics retrieved');
});
