'use strict';

const { z } = require('zod');

/**
 * Reusable validation middleware factory using Zod
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {Function} - Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
    });
  }
  req.validatedBody = result.data;
  next();
};

module.exports = { validate };
