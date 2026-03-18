'use strict';

const { pool } = require('../config/database.config'); // Adjusted to match existing project config

/**
 * Executes a query function with RLS bypassed within a transaction
 * @param {Function} queryFn - Function that takes a DB client and returns a promise
 * @returns {Promise<any>} - The result of the query function
 */
async function withBypassRLS(queryFn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL app.bypass_rls = 'true'");
    const result = await queryFn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Writes an entry to the audit_logs table
 * @param {Object} client - Database client
 * @param {Object} logData - Audit log data
 */
async function writeAuditLog(client, {
  organization_id = null,
  user_id = null,
  action,
  entity_type,
  entity_id = null,
  description,
  old_values = null,
  new_values = null,
  ip_address = null,
  user_agent = null,
  request_id = null,
}) {
  await client.query(
    `INSERT INTO audit_logs
      (organization_id, user_id, action, entity_type, entity_id,
       description, old_values, new_values, ip_address, user_agent, request_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      organization_id,
      user_id,
      action,
      entity_type,
      entity_id,
      description,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      ip_address,
      user_agent,
      request_id
    ]
  );
}

/**
 * Builds pagination metadata
 * @param {number} page - Current page number
 * @param {number} limit - Number of items per page
 * @param {number} total - Total number of items
 * @returns {Object} - Pagination metadata object
 */
function buildPagination(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total: parseInt(total),
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Builds a dynamic UPDATE query
 * @param {string} table - Table name
 * @param {string} id - Row ID
 * @param {Array<string>} allowedFields - List of fields allowed to be updated
 * @param {Object} body - Request body containing updates
 * @returns {Object} - SQL string and values array
 */
function buildUpdateQuery(table, id, allowedFields, body) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      values.push(body[field]);
    }
  }

  if (updates.length === 0) throw new Error('No valid fields to update');

  updates.push(`updated_at = NOW()`);
  values.push(id); // ID is the last parameter

  return {
    sql: `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
    values,
  };
}

/**
 * Gets the current financial year string (e.g., '2425')
 * @returns {string} - Financial year string
 */
function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed (Jan=1, Feb=2, ...)
  if (month >= 4) {
    // April or later: Current year and next year
    return `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;
  } else {
    // Before April: Previous year and current year
    return `${String(year - 1).slice(-2)}${String(year).slice(-2)}`;
  }
}

module.exports = {
  withBypassRLS,
  writeAuditLog,
  buildPagination,
  buildUpdateQuery,
  getCurrentFinancialYear
};
