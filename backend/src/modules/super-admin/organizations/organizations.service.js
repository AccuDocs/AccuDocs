'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../../config/database.config');
const {
  uuidv4,
  withBypassRLS,
  writeAuditLog,
  buildPagination,
  buildUpdateQuery,
  getCurrentFinancialYear
} = require('../../../utils/db-helpers');
const { NotFoundError, ConflictError, AppError } = require('../../../utils/errors');

class OrganizationsService {
  /**
   * List organizations with pagination and filtering
   */
  async list({ page = 1, limit = 20, search, plan, is_active, state_code, sort = 'created_at', order = 'desc' }) {
    const offset = (page - 1) * limit;
    const values = [];
    let paramIndex = 1;

    let whereClause = 'WHERE o.deleted_at IS NULL';
    if (search) {
      whereClause += ` AND (o.name ILIKE $${paramIndex} OR o.slug ILIKE $${paramIndex} OR o.email ILIKE $${paramIndex} OR o.gstin ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }
    if (plan) {
      whereClause += ` AND o.subscription_plan = $${paramIndex}`;
      values.push(plan);
      paramIndex++;
    }
    if (is_active !== undefined) {
      whereClause += ` AND o.is_active = $${paramIndex}`;
      values.push(is_active === 'true');
      paramIndex++;
    }
    if (state_code) {
      whereClause += ` AND o.state_code = $${paramIndex}`;
      values.push(state_code);
      paramIndex++;
    }

    const sortColumns = {
      name: 'o.name',
      created_at: 'o.created_at',
      client_count: 'client_count'
    };
    const orderBy = sortColumns[sort] || 'o.created_at';
    const direction = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    return await withBypassRLS(async (client) => {
      const sql = `
        SELECT 
          o.id, o.name, o.slug, o.email, o.phone, o.gstin, o.pan, o.state_code, 
          o.subscription_plan, o.is_active, o.trial_ends_at, o.created_at,
          json_build_object(
            'plan', s.plan,
            'status', s.status,
            'current_period_end', s.current_period_end,
            'max_clients', s.max_clients
          ) as current_subscription,
          (SELECT COUNT(*) FROM clients c WHERE c.organization_id = o.id AND c.deleted_at IS NULL) as client_count,
          (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL) as user_count
        FROM organizations o
        LEFT JOIN subscriptions s ON o.current_subscription_id = s.id
        ${whereClause}
        ORDER BY ${orderBy} ${direction}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      
      const countSql = `SELECT COUNT(*) FROM organizations o ${whereClause}`;
      
      const [dataResult, countResult] = await Promise.all([
        client.query(sql, [...values, limit, offset]),
        client.query(countSql, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      return {
        data: dataResult.rows,
        pagination: buildPagination(page, limit, total)
      };
    });
  }

  /**
   * Get organization by ID
   */
  async getById(id) {
    return await withBypassRLS(async (client) => {
      const orgResult = await client.query(
        `SELECT o.*, 
                (SELECT COUNT(*) FROM clients c WHERE c.organization_id = o.id AND c.deleted_at IS NULL) as total_clients,
                (SELECT COUNT(*) FROM invoices i WHERE i.organization_id = o.id AND i.deleted_at IS NULL) as total_invoices,
                (SELECT COALESCE(SUM(amount_paid), 0) FROM invoices i WHERE i.organization_id = o.id AND i.deleted_at IS NULL) as total_revenue_collected,
                (SELECT COALESCE(SUM(balance_due), 0) FROM invoices i WHERE i.organization_id = o.id AND i.deleted_at IS NULL AND i.status IN ('issued', 'partially_paid', 'overdue')) as outstanding_amount,
                (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL AND u.is_active = TRUE) as active_users,
                (SELECT COUNT(*) FROM documents d WHERE d.organization_id = o.id AND d.deleted_at IS NULL) as document_count
         FROM organizations o 
         WHERE o.id = $1 AND o.deleted_at IS NULL`,
        [id]
      );

      if (orgResult.rows.length === 0) {
        throw new NotFoundError('Organization');
      }

      const org = orgResult.rows[0];

      const subResult = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1',
        [org.current_subscription_id]
      );

      const historyResult = await client.query(
        'SELECT * FROM subscriptions WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 5',
        [id]
      );

      return {
        ...org,
        current_subscription: subResult.rows[0],
        subscription_history: historyResult.rows,
        stats: {
          total_clients: parseInt(org.total_clients),
          total_invoices: parseInt(org.total_invoices),
          total_revenue_collected: parseFloat(org.total_revenue_collected),
          outstanding_amount: parseFloat(org.outstanding_amount),
          active_users: parseInt(org.active_users),
          document_count: parseInt(org.document_count)
        }
      };
    });
  }

  /**
   * Create new organization
   */
  async create(data, { superAdminId, requestId, ipAddress, userAgent }) {
    // 0. Handle defaults for missing optional fields
    const finalData = {
      ...data,
      state_code: data.state_code || '27', // Default to Maharashtra
      admin_name: data.admin_name || `Admin - ${data.name}`,
      admin_email: data.admin_email || data.email,
      admin_mobile: data.admin_mobile || data.phone,
      admin_password: data.admin_password || 'Admin@123#'
    };

    return await withBypassRLS(async (client) => {
      // 1. Check slug uniqueness
      const existing = await client.query('SELECT 1 FROM organizations WHERE slug = $1', [finalData.slug]);
      if (existing.rows.length > 0) {
        throw new ConflictError('Slug already in use');
      }

      // 2. Insert organization
      const orgId = uuidv4();
      const orgResult = await client.query(
        `INSERT INTO organizations (id, name, slug, email, phone, gstin, pan, state_code, address, subscription_plan, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *`,
        [orgId, finalData.name, finalData.slug, finalData.email, finalData.phone, finalData.gstin, finalData.pan, finalData.state_code, finalData.address, finalData.subscription_plan, JSON.stringify(finalData.settings || {})]
      );
      const org = orgResult.rows[0];

      // 3. Create admin user
      const hashedPassword = await bcrypt.hash(finalData.admin_password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      const userResult = await client.query(
        `INSERT INTO users (id, name, role, email, mobile, password, organization_id, is_active, created_at, updated_at)
         VALUES ($1, $2, 'admin', $3, $4, $5, $6, TRUE, NOW(), NOW()) RETURNING id, name, email, mobile`,
        [uuidv4(), finalData.admin_name, finalData.admin_email, finalData.admin_mobile, hashedPassword, org.id]
      );
      const adminUser = userResult.rows[0];

      // 4. Create subscription
      const subResult = await client.query(
        `INSERT INTO subscriptions (id, organization_id, plan, status, current_period_start, current_period_end, max_clients, max_users, max_storage_gb, created_at, updated_at)
         VALUES ($1, $2, $3, 'active', NOW(), NOW() + INTERVAL '30 days', $4, $5, $6, NOW(), NOW()) RETURNING *`,
        [uuidv4(), org.id, data.subscription_plan, 100, 5, 2] // Defaults
      );
      const subscription = subResult.rows[0];

      // 5. Link subscription to org
      await client.query('UPDATE organizations SET current_subscription_id = $1 WHERE id = $2', [subscription.id, org.id]);

      // 6. Initialize invoice number sequence
      const fy = getCurrentFinancialYear();
      await client.query(
        'INSERT INTO invoice_number_sequences (id, organization_id, financial_year, last_sequence) VALUES ($1, $2, $3, 0)',
        [uuidv4(), org.id, fy]
      );

      // 7. Write audit log
      await writeAuditLog(client, {
        user_id: superAdminId,
        action: 'organization.created',
        entity_type: 'organization',
        entity_id: org.id,
        description: `Organization ${org.name} created by super admin`,
        new_values: { org, adminUser, subscription },
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return {
        ...org,
        adminUser,
        subscription
      };
    });
  }

  /**
   * Update organization
   */
  async update(id, data, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const oldOrgResult = await client.query('SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (oldOrgResult.rows.length === 0) throw new NotFoundError('Organization');
      const oldOrg = oldOrgResult.rows[0];

      const allowedFields = [
        'name', 'email', 'phone', 'address', 'gstin', 'pan', 'state_code',
        'bank_name', 'bank_account_number', 'bank_ifsc', 'bank_branch',
        'udin', 'settings', 'logo_s3_key'
      ];

      const { sql, values } = buildUpdateQuery('organizations', id, allowedFields, data);
      const result = await client.query(sql, values);
      const newOrg = result.rows[0];

      // Diff for audit log
      const diff = {};
      for (const field of allowedFields) {
        if (data[field] !== undefined && JSON.stringify(data[field]) !== JSON.stringify(oldOrg[field])) {
          diff[field] = { old: oldOrg[field], new: data[field] };
        }
      }

      await writeAuditLog(client, {
        user_id: superAdminId,
        action: 'organization.updated',
        entity_type: 'organization',
        entity_id: id,
        description: `Organization ${newOrg.name} updated`,
        old_values: diff, // Store only changes
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return newOrg;
    });
  }

  /**
   * Suspend organization
   */
  async suspend(id, { reason }, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const orgResult = await client.query('SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (orgResult.rows.length === 0) throw new NotFoundError('Organization');
      const org = orgResult.rows[0];

      if (!org.is_active) throw new AppError('Organization is already suspended', 400);

      const updatedOrgResult = await client.query(
        'UPDATE organizations SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      await client.query(
        "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $1 WHERE id = $2",
        [reason, org.current_subscription_id]
      );

      await writeAuditLog(client, {
        user_id: superAdminId,
        action: 'organization.suspended',
        entity_type: 'organization',
        entity_id: id,
        description: `Organization ${org.name} suspended. Reason: ${reason}`,
        new_values: { reason },
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return updatedOrgResult.rows[0];
    });
  }

  /**
   * Activate organization
   */
  async activate(id, { reason }, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const orgResult = await client.query('SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (orgResult.rows.length === 0) throw new NotFoundError('Organization');
      const org = orgResult.rows[0];

      if (org.is_active) throw new AppError('Organization is already active', 400);

      // Reactivate org
      const updatedOrgResult = await client.query(
        'UPDATE organizations SET is_active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      // Create new subscription (reactivate with starter plan or original plan if valid)
      const subResult = await client.query(
        `INSERT INTO subscriptions (organization_id, plan, status, current_period_start, current_period_end, max_clients, max_users, max_storage_gb)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days', 100, 5, 2) RETURNING *`,
        [id, org.subscription_plan || 'starter']
      );
      const subscription = subResult.rows[0];

      await client.query('UPDATE organizations SET current_subscription_id = $1 WHERE id = $2', [subscription.id, id]);

      await writeAuditLog(client, {
        user_id: superAdminId,
        action: 'organization.activated',
        entity_type: 'organization',
        entity_id: id,
        description: `Organization ${org.name} activated. ${reason ? 'Reason: ' + reason : ''}`,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return updatedOrgResult.rows[0];
    });
  }

  /**
   * Soft delete organization
   */
  async delete(id, { confirm_slug }, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const orgResult = await client.query('SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (orgResult.rows.length === 0) throw new NotFoundError('Organization');
      const org = orgResult.rows[0];

      if (org.slug !== confirm_slug) {
        throw new AppError('Slug confirmation mismatch', 400);
      }

      // Check for unpaid invoices
      const unpaidResult = await client.query(
        "SELECT COUNT(*) FROM invoices WHERE organization_id = $1 AND balance_due > 0 AND deleted_at IS NULL AND status IN ('issued', 'partially_paid', 'overdue')",
        [id]
      );
      if (parseInt(unpaidResult.rows[0].count) > 0) {
        throw new ConflictError('Cannot delete organization with unpaid invoices');
      }

      // Soft delete org and users
      await client.query('UPDATE organizations SET deleted_at = NOW(), is_active = FALSE WHERE id = $1', [id]);
      await client.query('UPDATE users SET deleted_at = NOW(), is_active = FALSE WHERE organization_id = $1', [id]);

      await writeAuditLog(client, {
        user_id: superAdminId,
        action: 'organization.deleted',
        entity_type: 'organization',
        entity_id: id,
        description: `Organization ${org.name} soft-deleted`,
        old_values: org,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return { message: 'Organization soft-deleted successfully' };
    });
  }

  /**
   * Impersonate org admin
   */
  async impersonate(id, { superAdminId, superAdminEmail }) {
    return await withBypassRLS(async (client) => {
      const orgResult = await client.query('SELECT name FROM organizations WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (orgResult.rows.length === 0) throw new NotFoundError('Organization');
      const org = orgResult.rows[0];

      const userResult = await client.query(
        "SELECT id, name, email, role FROM users WHERE organization_id = $1 AND role = 'admin' AND deleted_at IS NULL AND is_active = TRUE LIMIT 1",
        [id]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('No active admin user found for this organization', 404);
      }

      const adminUser = userResult.rows[0];

      const impersonationToken = jwt.sign(
        {
          sub: adminUser.id,
          org_id: id,
          role: adminUser.role,
          impersonated_by: superAdminId,
          impersonated_by_email: superAdminEmail,
          type: 'impersonation'
        },
        process.env.JWT_SECRET, // Use regular JWT secret for impersonation
        { expiresIn: '15m' }
      );

      await writeAuditLog(client, {
        user_id: superAdminId,
        action: 'organization.impersonated',
        entity_type: 'organization',
        entity_id: id,
        description: `Super admin ${superAdminEmail} impersonated org ${org.name} admin ${adminUser.email}`
      });

      return {
        impersonationToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        org: { id, name: org.name },
        adminUser: { id: adminUser.id, name: adminUser.name, email: adminUser.email }
      };
    });
  }
}

module.exports = new OrganizationsService();
