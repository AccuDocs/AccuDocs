'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../../config/database.config');
const { withBypassRLS, writeAuditLog } = require('../../../utils/db-helpers');
const { UnauthorizedError, ForbiddenError } = require('../../../utils/errors');

/**
 * Super Admin authentication service
 */
class AuthService {
  /**
   * Authenticate super admin
   */
  async login({ email, password, ipAddress, userAgent, requestId }) {
    return await withBypassRLS(async (client) => {
      // 1. Find super_admin by email
      const result = await client.query(
        'SELECT id, name, email, password, is_active, mfa_enabled FROM super_admins WHERE email = $1 AND deleted_at IS NULL',
        [email]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const admin = result.rows[0];

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // 3. Check if active
      if (!admin.is_active) {
        throw new ForbiddenError('Account suspended');
      }

      // 4. Generate tokens
      const accessToken = jwt.sign(
        { sub: admin.id, email: admin.email, role: 'super_admin', type: 'access' },
        process.env.SUPER_ADMIN_JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = jwt.sign(
        { sub: admin.id, type: 'refresh' },
        process.env.SUPER_ADMIN_JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      // 5. Update last login info
      await client.query(
        'UPDATE super_admins SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2',
        [ipAddress, admin.id]
      );

      // 6. Write audit log
      await writeAuditLog(client, {
        user_id: admin.id,
        action: 'super_admin.login',
        entity_type: 'super_admin',
        entity_id: admin.id,
        description: `Super admin ${admin.email} logged in`,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return {
        accessToken,
        refreshToken,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          mfa_enabled: admin.mfa_enabled
        }
      };
    });
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.SUPER_ADMIN_JWT_SECRET);
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return await withBypassRLS(async (client) => {
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

        const accessToken = jwt.sign(
          { sub: admin.id, email: admin.email, role: 'super_admin', type: 'access' },
          process.env.SUPER_ADMIN_JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );

        return { accessToken };
      });
    } catch (err) {
      if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
        throw err;
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Get current super admin profile
   */
  async getMe(id) {
    return await withBypassRLS(async (client) => {
      const result = await client.query(
        'SELECT id, name, email, is_active, mfa_enabled, last_login_at, last_login_ip, created_at FROM super_admins WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Super admin not found');
      }

      return result.rows[0];
    });
  }
}

module.exports = new AuthService();
