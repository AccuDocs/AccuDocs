'use strict';

const { pool } = require('../../../config/database.config');
const { withBypassRLS } = require('../../../utils/db-helpers');

class AnalyticsService {
  /**
   * Get platform-wide overview snapshot
   */
  async getOverview() {
    return await withBypassRLS(async (client) => {
      const sql = `
        WITH org_stats AS (
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_active = TRUE AND deleted_at IS NULL) AS active,
            COUNT(*) FILTER (WHERE is_active = FALSE AND deleted_at IS NULL) AS suspended,
            COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted,
            COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
                               AND deleted_at IS NULL) AS new_this_month,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'
                               AND deleted_at IS NULL) AS new_this_week
          FROM organizations
        ),
        user_stats AS (
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_active = TRUE AND deleted_at IS NULL) AS active,
            COUNT(*) FILTER (WHERE role = 'admin' AND deleted_at IS NULL) AS admins,
            COUNT(*) FILTER (WHERE role = 'staff' AND deleted_at IS NULL) AS staff,
            COUNT(*) FILTER (WHERE role = 'client' AND deleted_at IS NULL) AS clients
          FROM users
        ),
        invoice_stats AS (
          SELECT
            COUNT(*) AS total,
            COALESCE(SUM(total_amount), 0) AS total_billed,
            COALESCE(SUM(amount_paid), 0) AS total_collected,
            COALESCE(SUM(balance_due) FILTER (WHERE status IN ('issued','partially_paid','overdue')), 0) AS total_outstanding,
            COALESCE(SUM(balance_due) FILTER (WHERE status = 'overdue'), 0) AS total_overdue,
            COALESCE(SUM(total_amount) FILTER (WHERE DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', NOW())), 0) AS this_month_billed,
            COALESCE(SUM(amount_paid) FILTER (WHERE DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())), 0) AS this_month_collected
          FROM invoices
          WHERE deleted_at IS NULL
        ),
        plan_stats AS (
          SELECT
            json_build_object(
              'trial', COUNT(*) FILTER (WHERE subscription_plan = 'trial'),
              'starter', COUNT(*) FILTER (WHERE subscription_plan = 'starter'),
              'professional', COUNT(*) FILTER (WHERE subscription_plan = 'professional'),
              'enterprise', COUNT(*) FILTER (WHERE subscription_plan = 'enterprise')
            ) AS by_plan
          FROM organizations
          WHERE deleted_at IS NULL AND is_active = TRUE
        ),
        sub_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE status = 'active') AS active,
            COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
            COUNT(*) FILTER (WHERE status = 'active'
                               AND current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days') AS expiring_in_7_days,
            COUNT(*) FILTER (WHERE status = 'active'
                               AND current_period_end BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS expiring_in_30_days,
            COALESCE(SUM(amount) FILTER (WHERE status='active' AND billing_cycle='monthly'), 0) AS monthly_recurring_revenue,
            COALESCE(SUM(amount/12) FILTER (WHERE status='active' AND billing_cycle='annual'), 0) AS annual_recurring_revenue
          FROM subscriptions
        ),
        client_stats AS (
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = TRUE AND deleted_at IS NULL) as active
          FROM clients
        )
        SELECT
          row_to_json(org_stats.*) AS organizations,
          row_to_json(user_stats.*) AS users,
          row_to_json(invoice_stats.*) AS invoices,
          (plan_stats.by_plan) AS plans,
          row_to_json(sub_stats.*) AS subscriptions,
          row_to_json(client_stats.*) AS clients
        FROM org_stats, user_stats, invoice_stats, plan_stats, sub_stats, client_stats;
      `;
      const result = await client.query(sql);
      return result.rows[0];
    });
  }

  /**
   * Get organizations health metrics
   */
  async getOrganizationsHealth({ from_date, to_date }) {
    const values = [];
    let dateFilter = '';
    if (from_date && to_date) {
      dateFilter = 'AND o.created_at BETWEEN $1 AND $2';
      values.push(from_date, to_date);
    }

    return await withBypassRLS(async (client) => {
      const sql = `
        SELECT 
          o.id, o.name, o.subscription_plan as plan, o.is_active,
          (SELECT COUNT(*) FROM clients c WHERE c.organization_id = o.id AND c.deleted_at IS NULL) as client_count,
          (SELECT COUNT(*) FROM invoices i WHERE i.organization_id = o.id AND i.deleted_at IS NULL) as invoice_count,
          (SELECT COALESCE(SUM(amount_paid), 0) FROM invoices i WHERE i.organization_id = o.id AND i.deleted_at IS NULL) as revenue_collected,
          (SELECT COALESCE(SUM(balance_due), 0) FROM invoices i WHERE i.organization_id = o.id AND i.deleted_at IS NULL AND i.status IN ('issued','partially_paid','overdue')) as outstanding_amount,
          (SELECT COALESCE(SUM(balance_due), 0) FROM invoices i WHERE i.organization_id = o.id AND i.deleted_at IS NULL AND i.status = 'overdue') as overdue_amount,
          (SELECT MAX(created_at) FROM audit_logs al WHERE al.organization_id = o.id) as last_activity_at
        FROM organizations o
        WHERE o.deleted_at IS NULL ${dateFilter}
        ORDER BY revenue_collected DESC
      `;
      const result = await client.query(sql, values);
      return result.rows;
    });
  }

  /**
   * Get revenue time-series data
   */
  async getRevenue({ period = 'monthly', year = new Date().getFullYear() }) {
    const interval = period === 'monthly' ? 'month' : period === 'quarterly' ? 'quarter' : 'year';
    
    return await withBypassRLS(async (client) => {
      const sql = `
        SELECT 
          TO_CHAR(DATE_TRUNC('${interval}', invoice_date), 'Mon YYYY') as month,
          COALESCE(SUM(total_amount), 0) as billed,
          COALESCE(SUM(amount_paid), 0) as collected,
          COALESCE(SUM(balance_due), 0) as outstanding
        FROM invoices
        WHERE deleted_at IS NULL AND EXTRACT(YEAR FROM invoice_date) = $1
        GROUP BY DATE_TRUNC('${interval}', invoice_date)
        ORDER BY DATE_TRUNC('${interval}', invoice_date) ASC
      `;
      const result = await client.query(sql, [year]);
      
      const totals = result.rows.reduce((acc, curr) => {
        acc.billed += parseFloat(curr.billed);
        acc.collected += parseFloat(curr.collected);
        acc.outstanding += parseFloat(curr.outstanding);
        return acc;
      }, { billed: 0, collected: 0, outstanding: 0 });

      totals.collection_rate_pct = totals.billed > 0 ? (totals.collected / totals.billed) * 100 : 0;

      return {
        period,
        year,
        data: result.rows,
        totals
      };
    });
  }

  /**
   * Get growth metrics over last 12 months
   */
  async getGrowth() {
    return await withBypassRLS(async (client) => {
      const orgsGrowth = await client.query(`
        SELECT 
          TO_CHAR(month, 'Mon YYYY') as month,
          count as new_orgs,
          SUM(count) OVER (ORDER BY month) as cumulative
        FROM (
          SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
          FROM organizations
          WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '12 months'
          GROUP BY 1
        ) s
      `);

      const clientsGrowth = await client.query(`
        SELECT 
          TO_CHAR(month, 'Mon YYYY') as month,
          count as new_clients,
          SUM(count) OVER (ORDER BY month) as cumulative
        FROM (
          SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
          FROM clients
          WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '12 months'
          GROUP BY 1
        ) s
      `);

      const invoiceGrowth = await client.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', invoice_date), 'Mon YYYY') as month,
          COUNT(*) as invoice_count,
          SUM(total_amount) as total_amount
        FROM invoices
        WHERE deleted_at IS NULL AND invoice_date >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', invoice_date)
        ORDER BY DATE_TRUNC('month', invoice_date)
      `);

      return {
        orgs_growth: orgsGrowth.rows,
        client_growth: clientsGrowth.rows,
        invoice_growth: invoiceGrowth.rows
      };
    });
  }
}

module.exports = new AnalyticsService();
