'use strict';

const asyncHandler = require('../../../utils/asyncHandler');
const { success, paginated } = require('../../../utils/response');
const service = require('./audit-logs.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await service.list(req.query);
  return paginated(res, result.data, result.pagination, 'Audit logs retrieved');
});

exports.export = asyncHandler(async (req, res) => {
  const format = req.query.format || 'json';
  const data = await service.export(req.query);

  if (format === 'csv') {
    const fields = ['id', 'org_name', 'actor_name', 'admin_id', 'action', 'entity_type', 'entity_id', 'description', 'ip_address', 'created_at'];
    
    // Manual CSV generation
    const csvRows = [];
    csvRows.push(fields.join(',')); // Add header
    
    for (const row of data) {
      const values = fields.map(field => {
        const val = row[field] === null ? '' : row[field];
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    const csv = csvRows.join('\n');
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`audit-logs-${new Date().toISOString()}.csv`);
    return res.send(csv);
  }

  // Default JSON export
  res.header('Content-Type', 'application/json');
  res.attachment(`audit-logs-${new Date().toISOString()}.json`);
  return res.json(data);
});
