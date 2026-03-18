'use strict';

const { z } = require('zod');

const broadcastSchema = z.object({
  title: z.string().min(5).max(150),
  message: z.string().min(10).max(2000),
  target: z.enum(['all', 'specific_orgs', 'plan_based']),
  org_ids: z.array(z.string().uuid()).optional(),
  plans: z.array(z.enum(['starter', 'professional', 'enterprise'])).optional(),
  channel: z.enum(['in_app', 'email', 'both']),
  scheduled_at: z.string().datetime().optional().nullable(),
}).refine((data) => {
  if (data.target === 'specific_orgs' && (!data.org_ids || data.org_ids.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "org_ids must be non-empty when target is 'specific_orgs'",
  path: ["org_ids"]
}).refine((data) => {
  if (data.target === 'plan_based' && (!data.plans || data.plans.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "plans must be non-empty when target is 'plan_based'",
  path: ["plans"]
});

module.exports = {
  broadcastSchema
};
