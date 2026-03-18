'use strict';

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database.config');
const { writeAuditLog } = require('../utils/db-helpers');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * Middleware to verify Super Admin access token
 */
async function verifySuperAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }

    if (decoded.role !== 'super_admin' || decoded.type !== 'access') {
      throw new ForbiddenError('Access denied');
    }

    const client = await pool.connect();
    try {
      await client.query("SET LOCAL app.bypass_rls = 'true'");
      const result = await client.query(
        'SELECT id, name, email, is_active FROM super_admins WHERE id = $1 AND deleted_at IS NULL',
        [decoded.sub]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError('Account not found');
      }

      const admin = result.rows[0];
      if (!admin.is_active) {
        throw new ForbiddenError('Account suspended');
      }

      req.superAdmin = admin;
      next();
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware factory to automatically log audit events
 */
const auditLogMiddleware = (action, entityType) => async (req, res, next) => {
  // Capture the original res.send to intercept successful responses
  const originalSend = res.send;
  res.send = function (body) {
    res.send = originalSend;
    
    // Only log if the request was successful
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const payload = res.locals.auditPayload || {};
      const client = pool; // Use pool for standalone insert if not in transaction

      // We don't await this to avoid blocking the response, but we catch errors
      (async () => {
        try {
          const dbClient = await pool.connect();
          try {
            await dbClient.query("SET LOCAL app.bypass_rls = 'true'");
            await writeAuditLog(dbClient, {
              organization_id: payload.organization_id || null,
              user_id: req.superAdmin ? req.superAdmin.id : null,
              action: action,
              entity_type: entityType,
              entity_id: payload.entity_id || null,
              description: payload.description || `Action ${action} performed on ${entityType}`,
              old_values: payload.old_values || null,
              new_values: payload.new_values || req.body, // Default to sanitized body
              ip_address: req.ip,
              user_agent: req.headers['user-agent'],
              request_id: req.id
            });
          } finally {
            dbClient.release();
          }
        } catch (auditErr) {
          console.error('Audit Log Error:', auditErr);
        }
      })();
    }
    
    return originalSend.apply(res, arguments);
  };
  next();
};

module.exports = {
  verifySuperAdminToken,
  auditLogMiddleware
};
