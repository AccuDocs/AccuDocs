/**
 * Dashboard Controller — Client GST Dashboard endpoints
 * Provides aggregated data for the client dashboard UI
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/types/auth.types';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ClientSale } from '../../models/client-sale.model';
import { ClientPurchase } from '../../models/client-purchase.model';
import { ClientExpense } from '../../models/client-expense.model';
import { GstReturn } from '../../models/gst-return.model';
import { ValidationError } from '../../models/validation-error.model';
import { ActivityLog } from '../../models/activity-log.model';
import { Client } from '../../models/client.model';
import { pool } from '../../config/database.config';
import { calculateITC, generateGSTR3BSummary, getFinancialYear } from '../../utils/gstCalculator';
import { runFullValidation } from '../../utils/gstValidator';
import { logger } from '../../utils/logger';
import { Op, fn, col, literal } from 'sequelize';

/**
 * GET /clients/:clientId/dashboard/summary
 * 8-card summary with current + previous period comparison
 */
export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const fy = (req.query.financial_year as string) || getCurrentFY();
    const month = req.query.month ? Number(req.query.month) : undefined;

    // Get the client info
    const client = await Client.findOne({ where: { id: clientId, organizationId: orgId } });
    if (!client) { res.status(404).json(errorResponse('NOT_FOUND', 'Client not found')); return; }

    // Current period query
    const currentWhere: any = { clientId, organizationId: orgId, financialYear: fy };
    if (month) currentWhere.month = month;

    // Sales aggregation
    const salesResult = await pool.query(
      `SELECT
         COUNT(*) as count,
         COALESCE(SUM(base_amount), 0) as total_sales,
         COALESCE(SUM(gst_amount), 0) as output_gst,
         COALESCE(SUM(cgst_amount), 0) as output_cgst,
         COALESCE(SUM(sgst_amount), 0) as output_sgst,
         COALESCE(SUM(igst_amount), 0) as output_igst,
         COUNT(*) FILTER (WHERE invoice_type = 'B2B') as b2b_count,
         COALESCE(SUM(base_amount) FILTER (WHERE invoice_type = 'B2B'), 0) as b2b_value,
         COUNT(*) FILTER (WHERE invoice_type = 'B2C') as b2c_count,
         COALESCE(SUM(base_amount) FILTER (WHERE invoice_type = 'B2C'), 0) as b2c_value,
         COUNT(*) FILTER (WHERE invoice_type IN ('EXPORT', 'SEZ')) as export_count,
         COALESCE(SUM(base_amount) FILTER (WHERE invoice_type IN ('EXPORT', 'SEZ')), 0) as export_value
       FROM client_sales
       WHERE client_id = $1 AND organization_id = $2 AND financial_year = $3
       ${month ? 'AND month = $4' : ''}`,
      month ? [clientId, orgId, fy, month] : [clientId, orgId, fy]
    );

    // Purchases aggregation
    const purchasesResult = await pool.query(
      `SELECT
         COUNT(*) as count,
         COALESCE(SUM(base_amount), 0) as total_purchases,
         COALESCE(SUM(gst_amount), 0) as input_gst,
         COALESCE(SUM(cgst_amount), 0) as input_cgst,
         COALESCE(SUM(sgst_amount), 0) as input_sgst,
         COALESCE(SUM(igst_amount), 0) as input_igst,
         COUNT(*) FILTER (WHERE itc_eligible = true) as itc_eligible_count,
         COALESCE(SUM(gst_amount) FILTER (WHERE itc_eligible = true), 0) as eligible_itc,
         COUNT(*) FILTER (WHERE itc_eligible = false) as itc_blocked_count,
         COALESCE(SUM(gst_amount) FILTER (WHERE itc_eligible = false), 0) as blocked_itc,
         COUNT(*) FILTER (WHERE rcm_applicable = true) as rcm_count,
         COALESCE(SUM(gst_amount) FILTER (WHERE rcm_applicable = true), 0) as rcm_liability
       FROM client_purchases
       WHERE client_id = $1 AND organization_id = $2 AND financial_year = $3
       ${month ? 'AND month = $4' : ''}`,
      month ? [clientId, orgId, fy, month] : [clientId, orgId, fy]
    );

    // Expenses aggregation
    const expensesResult = await pool.query(
      `SELECT
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as total_expenses,
         COUNT(*) FILTER (WHERE gst_applicable = true) as gst_applicable_count,
         COALESCE(SUM(gst_amount) FILTER (WHERE gst_applicable = true), 0) as expense_gst,
         COUNT(*) FILTER (WHERE gst_applicable = false) as non_gst_count,
         COUNT(*) FILTER (WHERE itc_allowed = true) as itc_allowed_count,
         COALESCE(SUM(gst_amount) FILTER (WHERE itc_allowed = true), 0) as expense_itc,
         COUNT(*) FILTER (WHERE gst_applicable = true AND itc_allowed = false) as itc_blocked_count,
         COALESCE(SUM(gst_amount) FILTER (WHERE gst_applicable = true AND itc_allowed = false), 0) as expense_blocked_itc
       FROM client_expenses
       WHERE client_id = $1 AND organization_id = $2 AND financial_year = $3
       ${month ? 'AND month = $4' : ''}`,
      month ? [clientId, orgId, fy, month] : [clientId, orgId, fy]
    );

    // Validation errors count
    const errorsResult = await pool.query(
      `SELECT COUNT(*) as count FROM validation_errors
       WHERE client_id = $1 AND organization_id = $2 AND financial_year = $3 AND is_resolved = false`,
      [clientId, orgId, fy]
    );

    const s = salesResult.rows[0];
    const p = purchasesResult.rows[0];
    const e = expensesResult.rows[0];

    const outputGST = parseFloat(s.output_gst);
    const eligibleITC = parseFloat(p.eligible_itc) + parseFloat(e.expense_itc || 0);
    const blockedITC = parseFloat(p.blocked_itc) + parseFloat(e.expense_blocked_itc || 0);
    const rcmLiability = parseFloat(p.rcm_liability);
    const netGSTPayable = outputGST - eligibleITC + rcmLiability;

    res.json(successResponse({
      client: {
        id: client.id,
        name: client.name,
        businessName: client.businessName,
        gstin: client.gstin,
        stateCode: client.stateCode,
      },
      financialYear: fy,
      month,
      cards: {
        totalSales: parseFloat(s.total_sales),
        totalPurchases: parseFloat(p.total_purchases),
        totalExpenses: parseFloat(e.total_expenses),
        outputGST,
        inputITC: eligibleITC,
        blockedITC,
        rcmLiability,
        netGSTPayable: Math.max(0, netGSTPayable),
      },
      salesBreakdown: {
        count: parseInt(s.count),
        b2b: { count: parseInt(s.b2b_count), value: parseFloat(s.b2b_value) },
        b2c: { count: parseInt(s.b2c_count), value: parseFloat(s.b2c_value) },
        export: { count: parseInt(s.export_count), value: parseFloat(s.export_value) },
      },
      purchasesBreakdown: {
        count: parseInt(p.count),
        itcEligible: { count: parseInt(p.itc_eligible_count), value: parseFloat(p.eligible_itc) },
        itcBlocked: { count: parseInt(p.itc_blocked_count), value: parseFloat(p.blocked_itc) },
        rcm: { count: parseInt(p.rcm_count), value: parseFloat(p.rcm_liability) },
      },
      expensesBreakdown: {
        count: parseInt(e.count),
        gstApplicable: parseInt(e.gst_applicable_count),
        nonGst: parseInt(e.non_gst_count),
        itcBlocked: parseInt(e.itc_blocked_count),
      },
      taxSplit: {
        cgst: parseFloat(s.output_cgst) - parseFloat(p.input_cgst),
        sgst: parseFloat(s.output_sgst) - parseFloat(p.input_sgst),
        igst: parseFloat(s.output_igst) - parseFloat(p.input_igst),
      },
      validationErrorCount: parseInt(errorsResult.rows[0].count),
    }));
  } catch (error: any) {
    logger.error('getDashboardSummary error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * GET /clients/:clientId/dashboard/analytics
 * Monthly trend data for charts
 */
export const getDashboardAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const fy = (req.query.financial_year as string) || getCurrentFY();

    const result = await pool.query(
      `SELECT * FROM client_gst_summary
       WHERE client_id = $1 AND organization_id = $2 AND financial_year = $3
       ORDER BY month ASC`,
      [clientId, orgId, fy]
    );

    // Also get monthly expenses
    const expResult = await pool.query(
      `SELECT month, SUM(amount) as total_expenses,
              SUM(gst_amount) FILTER (WHERE gst_applicable = true) as expense_gst,
              SUM(gst_amount) FILTER (WHERE itc_allowed = true) as expense_itc
       FROM client_expenses
       WHERE client_id = $1 AND organization_id = $2 AND financial_year = $3
       GROUP BY month ORDER BY month ASC`,
      [clientId, orgId, fy]
    );

    const expMap = new Map<number, any>();
    expResult.rows.forEach((r: any) => expMap.set(r.month, r));

    const months = result.rows.map((r: any) => {
      const exp = expMap.get(r.month) || {};
      return {
        month: r.month,
        totalSales: parseFloat(r.total_sales || 0),
        outputGST: parseFloat(r.output_gst || 0),
        outputCGST: parseFloat(r.output_cgst || 0),
        outputSGST: parseFloat(r.output_sgst || 0),
        outputIGST: parseFloat(r.output_igst || 0),
        totalPurchases: parseFloat(r.total_purchases || 0),
        inputGST: parseFloat(r.input_gst || 0),
        inputCGST: parseFloat(r.input_cgst || 0),
        inputSGST: parseFloat(r.input_sgst || 0),
        inputIGST: parseFloat(r.input_igst || 0),
        gstPayable: parseFloat(r.gst_payable || 0),
        totalExpenses: parseFloat(exp.total_expenses || 0),
        expenseGST: parseFloat(exp.expense_gst || 0),
        expenseITC: parseFloat(exp.expense_itc || 0),
      };
    });

    res.json(successResponse({ financialYear: fy, months }));
  } catch (error: any) {
    logger.error('getDashboardAnalytics error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * GET /clients/:clientId/dashboard/return-status
 */
export const getReturnStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const fy = (req.query.financial_year as string) || getCurrentFY();

    const returns = await GstReturn.findAll({
      where: { clientId, organizationId: orgId, financialYear: fy },
      order: [['period_month', 'ASC'], ['return_type', 'ASC']],
    });

    res.json(successResponse(returns));
  } catch (error: any) {
    logger.error('getReturnStatus error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * GET /clients/:clientId/dashboard/alerts
 */
export const getAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const fy = (req.query.financial_year as string) || getCurrentFY();

    const errors = await ValidationError.findAll({
      where: { clientId, organizationId: orgId, financialYear: fy, isResolved: false },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    // Group by type
    const grouped: Record<string, { count: number; severity: string; items: any[] }> = {};
    errors.forEach((e: any) => {
      if (!grouped[e.errorType]) {
        grouped[e.errorType] = { count: 0, severity: e.severity, items: [] };
      }
      grouped[e.errorType].count++;
      grouped[e.errorType].items.push(e);
    });

    res.json(successResponse({
      total: errors.length,
      errorCount: errors.filter((e: any) => e.severity === 'error').length,
      warningCount: errors.filter((e: any) => e.severity === 'warning').length,
      grouped,
      items: errors,
    }));
  } catch (error: any) {
    logger.error('getAlerts error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * GET /clients/:clientId/dashboard/activity
 */
export const getActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;

    const logs = await ActivityLog.findAll({
      where: { clientId, organizationId: orgId },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    res.json(successResponse(logs));
  } catch (error: any) {
    logger.error('getActivity error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * GET /clients/:clientId/dashboard/upload-status
 */
export const getUploadStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;

    const uploads = await pool.query(
      `SELECT * FROM data_uploads
       WHERE client_id = $1 AND organization_id = $2
       ORDER BY created_at DESC LIMIT 20`,
      [clientId, orgId]
    );

    res.json(successResponse(uploads.rows));
  } catch (error: any) {
    logger.error('getUploadStatus error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * POST /clients/:clientId/compute-gst
 * Run full GST computation + validation for a period
 */
export const computeGST = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const { financial_year, month } = req.body;
    const fy = financial_year || getCurrentFY();

    // Get all transactions
    const salesWhere: any = { clientId, organizationId: orgId, financialYear: fy };
    const purchasesWhere: any = { ...salesWhere };
    const expensesWhere: any = { ...salesWhere };
    if (month) { salesWhere.month = month; purchasesWhere.month = month; expensesWhere.month = month; }

    const [sales, purchases, expenses] = await Promise.all([
      ClientSale.findAll({ where: salesWhere, raw: true }),
      ClientPurchase.findAll({ where: purchasesWhere, raw: true }),
      ClientExpense.findAll({ where: expensesWhere, raw: true }),
    ]);

    // Run GSTR-3B computation
    const gstr3b = generateGSTR3BSummary(sales, purchases, expenses);

    // Run validation
    const validation = runFullValidation(sales, purchases, expenses);

    // Store validation errors (clear old ones first)
    const whereClause: any = { clientId, organizationId: orgId, financialYear: fy };
    if (month) whereClause.month = month;
    await ValidationError.destroy({ where: whereClause });

    if (validation.issues.length > 0) {
      await ValidationError.bulkCreate(
        validation.issues.map(i => ({
          clientId,
          organizationId: orgId,
          errorCategory: i.errorCategory,
          errorType: i.errorType,
          severity: i.severity,
          message: i.message,
          entityType: i.entityType,
          entityId: i.entityId,
          fieldName: i.fieldName,
          financialYear: fy,
          month: month || null,
        }))
      );
    }

    // Log activity
    await ActivityLog.create({
      clientId,
      organizationId: orgId,
      userId: req.user!.userId,
      action: 'GST_COMPUTED',
      details: {
        financialYear: fy,
        month,
        salesCount: sales.length,
        purchasesCount: purchases.length,
        expensesCount: expenses.length,
        netPayable: gstr3b.net_payable.total,
        validationErrors: validation.total,
      },
    });

    res.json(successResponse({
      gstr3b,
      validation: {
        total: validation.total,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      transactionCounts: {
        sales: sales.length,
        purchases: purchases.length,
        expenses: expenses.length,
      },
    }));
  } catch (error: any) {
    logger.error('computeGST error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * POST /clients/:clientId/gst-returns
 * Create/update a GST return record
 */
export const saveGstReturn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const { returnType, periodMonth, periodYear, financialYear, status, jsonData, remarks } = req.body;

    const existing = await GstReturn.findOne({
      where: { clientId, organizationId: orgId, returnType, periodMonth, periodYear },
    });

    if (existing) {
      await existing.update({
        status: status || existing.status,
        jsonData: jsonData || existing.jsonData,
        remarks: remarks || existing.remarks,
        filedDate: status === 'filed' ? new Date() : existing.filedDate,
        filedBy: status === 'filed' ? req.user!.userId : existing.filedBy,
      });
      res.json(successResponse(existing));
    } else {
      const gstReturn = await GstReturn.create({
        clientId,
        organizationId: orgId,
        returnType,
        periodMonth,
        periodYear,
        financialYear: financialYear || getCurrentFY(),
        status: status || 'draft',
        jsonData: jsonData || {},
        remarks,
        dueDate: req.body.dueDate,
      });
      res.status(201).json(successResponse(gstReturn));
    }

    // Log activity
    await ActivityLog.create({
      clientId,
      organizationId: orgId,
      userId: req.user!.userId,
      action: status === 'filed' ? 'RETURN_FILED' : 'RETURN_SAVED',
      entityType: 'gst_return',
      details: { returnType, periodMonth, periodYear, status },
    });
  } catch (error: any) {
    logger.error('saveGstReturn error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

/**
 * POST /clients/:clientId/validate
 * Run validation only (no GST computation)
 */
export const validateTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const fy = (req.body.financial_year as string) || getCurrentFY();

    const [sales, purchases, expenses] = await Promise.all([
      ClientSale.findAll({ where: { clientId, organizationId: orgId, financialYear: fy }, raw: true }),
      ClientPurchase.findAll({ where: { clientId, organizationId: orgId, financialYear: fy }, raw: true }),
      ClientExpense.findAll({ where: { clientId, organizationId: orgId, financialYear: fy }, raw: true }),
    ]);

    const validation = runFullValidation(sales, purchases, expenses);
    res.json(successResponse(validation));
  } catch (error: any) {
    logger.error('validateTransactions error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

function getCurrentFY(): string {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return m >= 4 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;
}
