'use strict';

const { z } = require('zod');

const createTemplateSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  sac_code: z.string().regex(/^\d{6}$/, 'SAC code must be 6 digits'),
  default_rate: z.number().min(0),
  default_gst_rate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]),
  sort_order: z.number().int().min(0).optional().default(0),
});

const updateTemplateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(500).optional(),
  sac_code: z.string().regex(/^\d{6}$/).optional(),
  default_rate: z.number().min(0).optional(),
  default_gst_rate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

module.exports = {
  createTemplateSchema,
  updateTemplateSchema
};
