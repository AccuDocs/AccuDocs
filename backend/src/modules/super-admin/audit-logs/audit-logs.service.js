'use strict';

const { pool } = require('../../../config/database.config');
const { withBypassRLS, buildPagination } = require('../../../utils/db-helpers');

class AuditLogsService {
  /**
   * List audit logs with pagination and filtering
   */
  async list({ 
    page = 1, 
    limit = 50, 
    org_id, 
    user_id, 
    super_admin_id,
    entity_type, 
    entity_id, 
    action, 
    from_date, 
    to_date, 
    search, 
    sort = 'created_at', 
    order = 'desc' 
  }) {
    const offset = (page - 1) * limit;
    const values = [];
    let paramIndex = 1;

    let whereClause = 'WHERE 1=1';

    if (org_id) {
      whereClause += ` AND al.organization_id = $${paramIndex++}`;
      values.push(org_id);
    }
    if (user_id) {
      whereClause += ` AND (al.user_id = $${paramIndex} OR al.super_admin_id = $${paramIndex})`;
      values.push(user_id);
      paramIndex++;
    }
    if (super_admin_id) {
      whereClause += ` AND al.super_admin_id = $${paramIndex++}`;
      values.push(super_admin_id);
    }
    if (entity_type) {
      whereClause += ` AND al.entity_type = $${paramIndex++}`;
      values.push(entity_type);
    }
    if (entity_id) {
      whereClause += ` AND al.entity_id = $${paramIndex++}`;
      values.push(entity_id);
    }
    if (action) {
      if (action.endsWith('.')) {
        whereClause += ` AND al.action LIKE $${paramIndex++}`;
        values.push(`${action}%`);
      } else {
        whereClause += ` AND al.action = $${paramIndex++}`;
        values.push(action);
      }
    }
    if (from_date) {
      whereClause += ` AND al.created_at >= $${paramIndex++}`;
      values.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND al.created_at <= $${paramIndex++}`;
      values.push(to_date);
    }
    if (search) {
      whereClause += ` AND al.description ILIKE $${paramIndex++}`;
      values.push(`%${search}%`);
    }

    const direction = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    return await withBypassRLS(async (client) => {
      const sql = `
        SELECT 
          al.*, 
          o.name as org_name,
          COALESCE(sa.id, u.id) as actor_id,
          sa.id as admin_id,
          COALESCE(sa.name, u.name) as actor_name,
          COALESCE(sa.name, u.name) as user_name
        FROM audit_logs al
        LEFT JOIN organizations o ON al.organization_id = o.id
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN super_admins sa ON al.super_admin_id = sa.id
        ${whereClause}
        ORDER BY al.${sort} ${direction}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      
      const countSql = `SELECT COUNT(*) FROM audit_logs al ${whereClause}`;
      
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
   * Export audit logs as JSON array
   */
  async export(filters) {
    // Force a high limit for export but capped at 10,000 as per spec
    const result = await this.list({ ...filters, page: 1, limit: 10000 });
    return result.data;
  }
}

module.exports = new AuditLogsService();
