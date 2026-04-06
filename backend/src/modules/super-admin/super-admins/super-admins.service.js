'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../../../config/database.config');
const { withBypassRLS, writeAuditLog, buildUpdateQuery } = require('../../../utils/db-helpers');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../../utils/errors');

class SuperAdminsService {
  /**
   * List all super admin accounts
   */
  async list() {
    return await withBypassRLS(async (client) => {
      const result = await client.query(
        'SELECT id, name, email, role, is_active, last_login_at, created_at FROM super_admins ORDER BY created_at ASC'
      );
      return result.rows;
    });
  }

  /**
   * Create a new super admin account
   */
  async create(data, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      // Check if email exists
      const emailCheck = await client.query('SELECT id FROM super_admins WHERE email = $1', [data.email]);
      if (emailCheck.rows.length > 0) throw new ConflictError('Email already registered as Super Admin');

      const hashedPassword = await bcrypt.hash(data.password, 12);
      
      const result = await client.query(
        `INSERT INTO super_admins (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING id, name, email, role, is_active, created_at`,
        [data.name, data.email, hashedPassword, data.role || 'super_admin']
      );
      const newAdmin = result.rows[0];

      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'super_admin.created',
        entity_type: 'super_admin',
        entity_id: newAdmin.id,
        description: `New super admin account created for ${newAdmin.email}`,
        new_values: { email: newAdmin.email, role: newAdmin.role },
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return newAdmin;
    });
  }

  /**
   * Update super admin account
   */
  async update(id, data, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const adminResult = await client.query('SELECT * FROM super_admins WHERE id = $1', [id]);
      if (adminResult.rows.length === 0) throw new NotFoundError('Super Admin');

      const { sql, values } = buildUpdateQuery('super_admins', id, ['name', 'email', 'role', 'is_active'], data);
      const result = await client.query(sql, values);
      const updatedAdmin = result.rows[0];
      delete updatedAdmin.password_hash;

      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'super_admin.updated',
        entity_type: 'super_admin',
        entity_id: id,
        description: `Super admin account ${updatedAdmin.email} updated`,
        new_values: data,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return updatedAdmin;
    });
  }

  /**
   * Change own password
   */
  async changePassword(id, { oldPassword, newPassword }, { requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const result = await client.query('SELECT password_hash FROM super_admins WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new NotFoundError('Super Admin');
      
      const isValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
      if (!isValid) throw new ForbiddenError('Invalid current password');

      const newHash = await bcrypt.hash(newPassword, 12);
      await client.query('UPDATE super_admins SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, id]);

      await writeAuditLog(client, {
        super_admin_id: id,
        action: 'super_admin.password_changed',
        entity_type: 'super_admin',
        entity_id: id,
        description: 'Super admin changed their own password',
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return { message: 'Password updated successfully' };
    });
  }
}

module.exports = new SuperAdminsService();
