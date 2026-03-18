'use strict';

const { z } = require('zod');

const createSuperAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Password must contain one uppercase letter').regex(/[0-9]/, 'Password must contain one number'),
  role: z.enum(['super_admin', 'read_only_admin']).default('super_admin'),
});

const updateSuperAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['super_admin', 'read_only_admin']).optional(),
  is_active: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

module.exports = {
  createSuperAdminSchema,
  updateSuperAdminSchema,
  changePasswordSchema
};
