'use strict';

const { z } = require('zod');

const createOrgSchema = z.object({
  name: z.string().min(2).max(150),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Indian mobile format +91XXXXXXXXXX').optional(),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  state_code: z.string().length(2).optional(),
  address: z.string().optional(),
  subscription_plan: z.enum(['starter', 'professional', 'enterprise']),
  admin_name: z.string().min(2).max(100).optional(),
  admin_mobile: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
  admin_email: z.string().email().optional(),
  admin_password: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character')
    .optional(),
  settings: z.record(z.any()).optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/).optional(),
  address: z.string().optional(),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
  state_code: z.string().length(2).optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_branch: z.string().optional(),
  udin: z.string().optional(),
  settings: z.record(z.any()).optional(),
  logo_s3_key: z.string().optional(),
});

const suspendSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

const deleteSchema = z.object({
  confirm_slug: z.string().min(1, 'Please confirm the organization slug'),
});

module.exports = {
  createOrgSchema,
  updateOrgSchema,
  suspendSchema,
  deleteSchema
};
