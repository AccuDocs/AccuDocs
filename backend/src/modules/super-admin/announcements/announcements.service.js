'use strict';

const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../../config/database.config');
const { withBypassRLS, writeAuditLog, buildPagination } = require('../../../utils/db-helpers');

class AnnouncementsService {
  /**
   * Broadcast a system announcement to targeted organizations
   */
  async broadcast(data, { superAdminId, superAdminEmail, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      let orgIds = [];

      // 1. Determine target organization IDs
      if (data.target === 'all') {
        const result = await client.query(
          'SELECT id FROM organizations WHERE is_active = TRUE AND deleted_at IS NULL'
        );
        orgIds = result.rows.map(row => row.id);
      } else if (data.target === 'specific_orgs') {
        orgIds = data.org_ids;
      } else if (data.target === 'plan_based') {
        const result = await client.query(
          'SELECT id FROM organizations WHERE subscription_plan = ANY($1) AND is_active = TRUE AND deleted_at IS NULL',
          [data.plans]
        );
        orgIds = result.rows.map(row => row.id);
      }

      if (orgIds.length === 0) {
        return { broadcast_id: null, orgs_targeted: 0, notifications_created: 0, message: 'No target organizations found' };
      }

      const broadcastId = uuidv4();
      let totalNotifications = 0;

      // 2. Create notifications for admin users of each target org
      for (const orgId of orgIds) {
        const adminsResult = await client.query(
          "SELECT id FROM users WHERE organization_id = $1 AND role = 'admin' AND deleted_at IS NULL AND is_active = TRUE",
          [orgId]
        );

        for (const admin of adminsResult.rows) {
          await client.query(
            `INSERT INTO notifications 
              (organization_id, user_id, type, title, message, channel, is_read, delivery_status, metadata, scheduled_at)
             VALUES ($1, $2, 'system', $3, $4, $5, FALSE, 'pending', $6, $7)`,
            [
              orgId, 
              admin.id, 
              data.title, 
              data.message, 
              data.channel, 
              JSON.stringify({ announced_by: superAdminEmail, broadcast_id: broadcastId }),
              data.scheduled_at || null
            ]
          );
          totalNotifications++;
        }
      }

      // 3. Write audit log
      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'announcement.broadcast',
        entity_type: 'super_admin',
        entity_id: superAdminId,
        description: `Broadcast "${data.title}" sent to ${orgIds.length} organizations`,
        new_values: { 
          broadcast_id: broadcastId,
          target: data.target, 
          org_count: orgIds.length, 
          channel: data.channel,
          title: data.title
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return {
        broadcast_id: broadcastId,
        orgs_targeted: orgIds.length,
        notifications_created: totalNotifications,
        message: data.scheduled_at ? 'Broadcast scheduled' : 'Broadcast sent'
      };
    });
  }

  /**
   * Get announcement history from audit logs
   */
  async getHistory({ page = 1, limit = 20, from_date, to_date }) {
    const offset = (page - 1) * limit;
    const values = ['announcement.broadcast'];
    let paramIndex = 2;

    let whereClause = "WHERE action = $1";
    if (from_date) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(to_date);
    }

    return await withBypassRLS(async (client) => {
      const sql = `
        SELECT id, action, description, new_values as metadata, created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      
      const countSql = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
      
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
}

module.exports = new AnnouncementsService();
