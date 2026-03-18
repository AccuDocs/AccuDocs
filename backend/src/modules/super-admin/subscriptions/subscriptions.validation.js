'use strict';

const { z } = require('zod');

const assignPlanSchema = z.object({
  organization_id: z.string().uuid(),
  plan: z.enum(['trial', 'starter', 'professional', 'enterprise']),
  billing_cycle: z.enum(['monthly', 'annual']),
  amount: z.number().min(0),
  current_period_start: z.string().datetime(),
  current_period_end: z.string().datetime(),
  max_clients: z.number().int().positive(),
  max_users: z.number().int().positive(),
  max_storage_gb: z.number().int().positive(),
  features: z.record(z.boolean()).optional(),
  notes: z.string().optional(),
});

const extendSchema = z.object({
  extend_days: z.number().int().min(1).max(365),
  reason: z.string().min(5),
});

const cancelSchema = z.object({
  reason: z.string().min(10),
  cancel_at_period_end: z.boolean(),
});

module.exports = {
  assignPlanSchema,
  extendSchema,
  cancelSchema
};
