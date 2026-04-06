'use strict';

const { pool } = require('../../../config/database.config');
const { withBypassRLS, writeAuditLog, buildPagination, buildUpdateQuery } = require('../../../utils/db-helpers');
const { NotFoundError, ConflictError } = require('../../../utils/errors');

class ServiceTemplatesService {
  /**
   * List system service templates
   */
  async list({ page = 1, limit = 20, is_active, search }) {
    const offset = (page - 1) * limit;
    const values = [];
    let paramIndex = 1;

    let whereClause = 'WHERE is_system = TRUE AND organization_id IS NULL AND deleted_at IS NULL';
    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      values.push(is_active === 'true');
    }
    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR sac_code ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    return await withBypassRLS(async (client) => {
      const sql = `
        SELECT * FROM service_templates
        ${whereClause}
        ORDER BY sort_order ASC, name ASC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      
      const countSql = `SELECT COUNT(*) FROM service_templates ${whereClause}`;
      
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
   * Get template by ID
   */
  async getById(id) {
    return await withBypassRLS(async (client) => {
      const result = await client.query(
        'SELECT * FROM service_templates WHERE id = $1 AND is_system = TRUE AND deleted_at IS NULL',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Service Template');
      }

      return result.rows[0];
    });
  }

  /**
   * Create new system template
   */
  async create(data, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const result = await client.query(
        `INSERT INTO service_templates (name, description, sac_code, default_rate, default_gst_rate, sort_order, is_system, organization_id)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, NULL) RETURNING *`,
        [data.name, data.description, data.sac_code, data.default_rate, data.default_gst_rate, data.sort_order || 0]
      );
      const template = result.rows[0];

      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'service_template.created',
        entity_type: 'service_template',
        entity_id: template.id,
        description: `System service template ${template.name} created`,
        new_values: template,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return template;
    });
  }

  /**
   * Update system template
   */
  async update(id, data, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const oldTemplateResult = await client.query('SELECT * FROM service_templates WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (oldTemplateResult.rows.length === 0) throw new NotFoundError('Service Template');
      const oldTemplate = oldTemplateResult.rows[0];

      const allowedFields = ['name', 'description', 'sac_code', 'default_rate', 'default_gst_rate', 'is_active', 'sort_order'];
      const { sql, values } = buildUpdateQuery('service_templates', id, allowedFields, data);
      
      const result = await client.query(sql, values);
      const newTemplate = result.rows[0];

      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'service_template.updated',
        entity_type: 'service_template',
        entity_id: id,
        description: `System service template ${newTemplate.name} updated`,
        new_values: data,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return newTemplate;
    });
  }

  /**
   * Soft delete system template
   */
  async delete(id, { superAdminId, requestId, ipAddress, userAgent }) {
    return await withBypassRLS(async (client) => {
      const result = await client.query('SELECT name FROM service_templates WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (result.rows.length === 0) throw new NotFoundError('Service Template');
      const name = result.rows[0].name;

      // Reject if referenced by invoices
      const refCheck = await client.query('SELECT COUNT(*) FROM invoice_line_items WHERE service_template_id = $1', [id]);
      if (parseInt(refCheck.rows[0].count) > 0) {
        throw new ConflictError('Cannot delete template referenced by invoices');
      }

      await client.query('UPDATE service_templates SET deleted_at = NOW(), is_active = FALSE WHERE id = $1', [id]);

      await writeAuditLog(client, {
        super_admin_id: superAdminId,
        action: 'service_template.deleted',
        entity_type: 'service_template',
        entity_id: id,
        description: `System service template ${name} deleted`,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId
      });

      return { message: 'Service template deleted' };
    });
  }
}

module.exports = new ServiceTemplatesService();
