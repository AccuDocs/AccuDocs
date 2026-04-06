'use strict';

const { pool } = require('../../../config/database.config');
const { withBypassRLS, writeAuditLog, buildPagination } = require('../../../utils/db-helpers');
const { NotFoundError, AppError } = require('../../../utils/errors');

class SubscriptionsService {
  /**
   * List subscriptions across all organizations
   */
  async list({ page = 1, limit = 20, org_id, plan, status, billing_cycle }) {
    const offset = (page - 1) * limit;
    const values = [];
    let paramIndex = 1;

    let whereClause = 'WHERE 1=1';
    if (org_id) {
      whereClause += ` AND s.organization_id = $${paramIndex++}`;
      values.push(org_id);
    }
    if (plan) {
      whereClause += ` AND s.plan = $${paramIndex++}`;
      values.push(plan);
    }
    if (status) {
      whereClause += ` AND s.status = $${paramIndex++}`;
      values.push(status);
    }
    if (billing_cycle) {
      whereClause += ` AND s.billing_cycle = $${paramIndex++}`;
      values.push(billing_cycle);
    }

    return await withBypassRLS(async (client) => {
      const sql = `
        SELECT s.*, o.name as organization_name
        FROM subscriptions s
        JOIN organizations o ON s.organization_id = o.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      
      const countSql = `SELECT COUNT(*) FROM subscriptions s ${whereClause}`;
      
      const [dataResult, countResult] = await Promise.all([
        client.query(sql, [...values, limit, offset]),
        client.query(countSql, values)
      ]);

      return {
        data: dataResult.rows,
        pagination: buildPagination(page, limit, countResult.rows[0].count)
      };
    });
  }

  /**
   * Get subscription by ID
   */
  async getById(id) {
    return await withBypassRLS(async (client) => {
      const result = await client.query(
        `SELECT s.*, o.name as organization_name
         FROM subscriptions s
         JOIN organizations o ON s.organization_id = o.id
         WHERE s.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Subscription');
      }

      return result.rows[0];
    });
  }

  /**
   * Manually assign a plan to an organization
   */
  async assign(data, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      // 1. Verify organization exists
      const orgResult = await client.query('SELECT name, current_subscription_id FROM organizations WHERE id = $1', [data.organization_id]);
      if (orgResult.rows.length === 0) throw new NotFoundError('Organization');
      const org = orgResult.rows[0];

      // 2. Insert new subscription
      const subResult = await client.query(
        `INSERT INTO subscriptions 
          (organization_id, plan, status, billing_cycle, amount, 
           current_period_start, current_period_end, next_billing_date,
           max_clients, max_users, max_storage_gb, features, notes)
         VALUES ($1, $2, 'active', $3, $4, $5, $6, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          data.organization_id, data.plan, data.billing_cycle, data.amount,
          data.current_period_start, data.current_period_end,
          data.max_clients, data.max_users, data.max_storage_gb,
          JSON.stringify(data.features || {}), data.notes
        ]
      );
      const newSub = subResult.rows[0];

      // 3. Mark old subscription as cancelled if it exists
      if (org.current_subscription_id) {
        await client.query(
          "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = 'Plan reassigned by super admin' WHERE id = $1",
          [org.current_subscription_id]
        );
      }

      // 4. Update organization
      await client.query(
        'UPDATE organizations SET current_subscription_id = $1, subscription_plan = $2 WHERE id = $3',
        [newSub.id, data.plan, data.organization_id]
      );

      // 5. Write audit log
      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'subscription.assigned',
        entity_type: 'subscription',
        entity_id: newSub.id,
        organization_id: data.organization_id,
        description: `Plan ${data.plan} assigned to ${org.name}`,
        new_values: newSub,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return newSub;
    });
  }

  /**
   * Extend a subscription
   */
  async extend(id, { extend_days, reason }, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const subResult = await client.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
      if (subResult.rows.length === 0) throw new NotFoundError('Subscription');
      const sub = subResult.rows[0];

      const updatedSubResult = await client.query(
        `UPDATE subscriptions SET 
          current_period_end = current_period_end + interval '$1 days',
          next_billing_date = next_billing_date + interval '$1 days',
          updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [extend_days, id]
      );
      const updatedSub = updatedSubResult.rows[0];

      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'subscription.extended',
        entity_type: 'subscription',
        entity_id: id,
        organization_id: sub.organization_id,
        description: `Subscription extended by ${extend_days} days. Reason: ${reason}`,
        new_values: { extend_days, reason },
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return updatedSub;
    });
  }

  /**
   * Cancel a subscription
   */
  async cancel(id, { reason, cancel_at_period_end }, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const subResult = await client.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
      if (subResult.rows.length === 0) throw new NotFoundError('Subscription');
      const sub = subResult.rows[0];

      let updatedSub;
      if (cancel_at_period_end) {
        // Schedule cancellation
        const result = await client.query(
          "UPDATE subscriptions SET status = 'cancelled', cancel_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
          [reason, id]
        );
        updatedSub = result.rows[0];
      } else {
        // Cancel immediately
        const result = await client.query(
          "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
          [reason, id]
        );
        updatedSub = result.rows[0];

        // Suspend organization as it no longer has an active subscription
        await client.query('UPDATE organizations SET is_active = FALSE WHERE id = $1', [sub.organization_id]);
      }

      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'subscription.cancelled',
        entity_type: 'subscription',
        entity_id: id,
        organization_id: sub.organization_id,
        description: `Subscription cancelled. ${cancel_at_period_end ? 'Scheduled for period end.' : 'Immediate.'} Reason: ${reason}`,
        new_values: { reason, cancel_at_period_end },
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return updatedSub;
    });
  }
}

module.exports = new SubscriptionsService();
