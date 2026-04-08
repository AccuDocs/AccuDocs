/**
 * Data Controller — Handles Sales, Purchases, Expenses CRUD + Excel Upload + GST Summary
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/types/auth.types';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ClientSale } from '../../models/client-sale.model';
import { ClientPurchase } from '../../models/client-purchase.model';
import { ClientExpense } from '../../models/client-expense.model';
import { pool } from '../../config/database.config';
import { getFinancialYear, getMonthFromDate } from '../../utils/gstCalculator';
import { parseSalesExcel, parsePurchasesExcel, parseExpensesExcel } from '../../utils/excelParser';
import { logger } from '../../utils/logger';

// ===================== SALES =====================

export const getSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const { month, financial_year } = req.query;
    const orgId = req.user!.organizationId;

    const where: any = { clientId, organizationId: orgId };
    if (month) where.month = Number(month);
    if (financial_year) where.financialYear = financial_year;

    const sales = await ClientSale.findAll({
      where,
      order: [['invoice_date', 'DESC']],
    });

    res.json(successResponse(sales));
  } catch (error: any) {
    logger.error('getSales error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const createSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const { invoiceNo, invoiceDate, customerName, description, hsnSacCode, quantity, rate, baseAmount, gstRate } = req.body;

    const date = new Date(invoiceDate);
    const sale = await ClientSale.create({
      clientId,
      organizationId: orgId,
      invoiceNo,
      invoiceDate,
      customerName,
      description,
      hsnSacCode,
      quantity: quantity || 1,
      rate: rate || 0,
      baseAmount,
      gstRate: gstRate || 18,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
    });

    // Re-fetch to get computed columns
    const result = await ClientSale.findByPk(sale.id);
    res.status(201).json(successResponse(result));
  } catch (error: any) {
    logger.error('createSale error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const updateSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId, saleId } = req.params;
    const orgId = req.user!.organizationId;

    const sale = await ClientSale.findOne({ where: { id: saleId, clientId, organizationId: orgId } });
    if (!sale) { res.status(404).json(errorResponse('NOT_FOUND', 'Sale entry not found')); return; }

    const { invoiceNo, invoiceDate, customerName, description, hsnSacCode, quantity, rate, baseAmount, gstRate } = req.body;

    const updateData: any = {};
    if (invoiceNo !== undefined) updateData.invoiceNo = invoiceNo;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (description !== undefined) updateData.description = description;
    if (hsnSacCode !== undefined) updateData.hsnSacCode = hsnSacCode;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (rate !== undefined) updateData.rate = rate;
    if (baseAmount !== undefined) updateData.baseAmount = baseAmount;
    if (gstRate !== undefined) updateData.gstRate = gstRate;

    if (invoiceDate) {
      const date = new Date(invoiceDate);
      updateData.invoiceDate = invoiceDate;
      updateData.month = getMonthFromDate(date);
      updateData.financialYear = getFinancialYear(date);
    }

    await sale.update(updateData);
    const result = await ClientSale.findByPk(sale.id);
    res.json(successResponse(result));
  } catch (error: any) {
    logger.error('updateSale error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const deleteSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId, saleId } = req.params;
    const orgId = req.user!.organizationId;

    const sale = await ClientSale.findOne({ where: { id: saleId, clientId, organizationId: orgId } });
    if (!sale) { res.status(404).json(errorResponse('NOT_FOUND', 'Sale entry not found')); return; }

    await sale.destroy();
    res.json(successResponse({ message: 'Sale entry deleted' }));
  } catch (error: any) {
    logger.error('deleteSale error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const uploadSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const file = (req as any).file;
    if (!file) { res.status(400).json(errorResponse('BAD_REQUEST', 'No file uploaded')); return; }

    const { valid, errors } = parseSalesExcel(file.buffer);

    // Bulk insert valid rows
    if (valid.length > 0) {
      await ClientSale.bulkCreate(
        valid.map(row => ({ ...row, clientId, organizationId: orgId }))
      );
    }

    // Log the upload
    await pool.query(
      `INSERT INTO data_uploads (client_id, organization_id, uploaded_by, upload_type, file_name, rows_imported, rows_failed, error_log)
       VALUES ($1, $2, $3, 'sales', $4, $5, $6, $7)`,
      [clientId, orgId, req.user!.userId, file.originalname, valid.length, errors.length, JSON.stringify(errors)]
    );

    res.json(successResponse({
      imported: valid.length,
      failed: errors.length,
      errors: errors.slice(0, 20), // Limit error details
    }));
  } catch (error: any) {
    logger.error('uploadSales error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

// ===================== PURCHASES =====================

export const getPurchases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const { month, financial_year } = req.query;
    const orgId = req.user!.organizationId;

    const where: any = { clientId, organizationId: orgId };
    if (month) where.month = Number(month);
    if (financial_year) where.financialYear = financial_year;

    const purchases = await ClientPurchase.findAll({
      where,
      order: [['bill_date', 'DESC']],
    });

    res.json(successResponse(purchases));
  } catch (error: any) {
    logger.error('getPurchases error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const createPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const { billNo, billDate, vendorName, description, hsnSacCode, quantity, rate, baseAmount, gstRate } = req.body;

    const date = new Date(billDate);
    const purchase = await ClientPurchase.create({
      clientId,
      organizationId: orgId,
      billNo,
      billDate,
      vendorName,
      description,
      hsnSacCode,
      quantity: quantity || 1,
      rate: rate || 0,
      baseAmount,
      gstRate: gstRate || 18,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
    });

    const result = await ClientPurchase.findByPk(purchase.id);
    res.status(201).json(successResponse(result));
  } catch (error: any) {
    logger.error('createPurchase error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const updatePurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId, purchaseId } = req.params;
    const orgId = req.user!.organizationId;

    const purchase = await ClientPurchase.findOne({ where: { id: purchaseId, clientId, organizationId: orgId } });
    if (!purchase) { res.status(404).json(errorResponse('NOT_FOUND', 'Purchase entry not found')); return; }

    const { billNo, billDate, vendorName, description, hsnSacCode, quantity, rate, baseAmount, gstRate } = req.body;

    const updateData: any = {};
    if (billNo !== undefined) updateData.billNo = billNo;
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (description !== undefined) updateData.description = description;
    if (hsnSacCode !== undefined) updateData.hsnSacCode = hsnSacCode;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (rate !== undefined) updateData.rate = rate;
    if (baseAmount !== undefined) updateData.baseAmount = baseAmount;
    if (gstRate !== undefined) updateData.gstRate = gstRate;

    if (billDate) {
      const date = new Date(billDate);
      updateData.billDate = billDate;
      updateData.month = getMonthFromDate(date);
      updateData.financialYear = getFinancialYear(date);
    }

    await purchase.update(updateData);
    const result = await ClientPurchase.findByPk(purchase.id);
    res.json(successResponse(result));
  } catch (error: any) {
    logger.error('updatePurchase error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const deletePurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId, purchaseId } = req.params;
    const orgId = req.user!.organizationId;

    const purchase = await ClientPurchase.findOne({ where: { id: purchaseId, clientId, organizationId: orgId } });
    if (!purchase) { res.status(404).json(errorResponse('NOT_FOUND', 'Purchase entry not found')); return; }

    await purchase.destroy();
    res.json(successResponse({ message: 'Purchase entry deleted' }));
  } catch (error: any) {
    logger.error('deletePurchase error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const uploadPurchases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const file = (req as any).file;
    if (!file) { res.status(400).json(errorResponse('BAD_REQUEST', 'No file uploaded')); return; }

    const { valid, errors } = parsePurchasesExcel(file.buffer);

    if (valid.length > 0) {
      await ClientPurchase.bulkCreate(
        valid.map(row => ({ ...row, clientId, organizationId: orgId }))
      );
    }

    await pool.query(
      `INSERT INTO data_uploads (client_id, organization_id, uploaded_by, upload_type, file_name, rows_imported, rows_failed, error_log)
       VALUES ($1, $2, $3, 'purchases', $4, $5, $6, $7)`,
      [clientId, orgId, req.user!.userId, file.originalname, valid.length, errors.length, JSON.stringify(errors)]
    );

    res.json(successResponse({
      imported: valid.length,
      failed: errors.length,
      errors: errors.slice(0, 20),
    }));
  } catch (error: any) {
    logger.error('uploadPurchases error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

// ===================== EXPENSES =====================

export const getExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const { month, financial_year } = req.query;
    const orgId = req.user!.organizationId;

    const where: any = { clientId, organizationId: orgId };
    if (month) where.month = Number(month);
    if (financial_year) where.financialYear = financial_year;

    const expenses = await ClientExpense.findAll({
      where,
      order: [['expense_date', 'DESC']],
    });

    res.json(successResponse(expenses));
  } catch (error: any) {
    logger.error('getExpenses error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const { expenseDate, category, description, vendorName, amount, paymentMode, referenceNo } = req.body;

    const date = new Date(expenseDate);
    const expense = await ClientExpense.create({
      clientId,
      organizationId: orgId,
      expenseDate,
      category: category || 'general',
      description,
      vendorName,
      amount,
      paymentMode: paymentMode || 'cash',
      referenceNo,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
    });

    res.status(201).json(successResponse(expense));
  } catch (error: any) {
    logger.error('createExpense error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const updateExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId, expenseId } = req.params;
    const orgId = req.user!.organizationId;

    const expense = await ClientExpense.findOne({ where: { id: expenseId, clientId, organizationId: orgId } });
    if (!expense) { res.status(404).json(errorResponse('NOT_FOUND', 'Expense entry not found')); return; }

    const { expenseDate, category, description, vendorName, amount, paymentMode, referenceNo } = req.body;

    const updateData: any = {};
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (amount !== undefined) updateData.amount = amount;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (referenceNo !== undefined) updateData.referenceNo = referenceNo;

    if (expenseDate) {
      const date = new Date(expenseDate);
      updateData.expenseDate = expenseDate;
      updateData.month = getMonthFromDate(date);
      updateData.financialYear = getFinancialYear(date);
    }

    await expense.update(updateData);
    res.json(successResponse(expense));
  } catch (error: any) {
    logger.error('updateExpense error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId, expenseId } = req.params;
    const orgId = req.user!.organizationId;

    const expense = await ClientExpense.findOne({ where: { id: expenseId, clientId, organizationId: orgId } });
    if (!expense) { res.status(404).json(errorResponse('NOT_FOUND', 'Expense entry not found')); return; }

    await expense.destroy();
    res.json(successResponse({ message: 'Expense entry deleted' }));
  } catch (error: any) {
    logger.error('deleteExpense error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

// ===================== GST SUMMARY =====================

export const getGstSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const { financial_year } = req.query;
    const orgId = req.user!.organizationId;

    let query = `SELECT * FROM client_gst_summary WHERE client_id = $1 AND organization_id = $2`;
    const params: any[] = [clientId, orgId];

    if (financial_year) {
      query += ` AND financial_year = $3`;
      params.push(financial_year);
    }

    query += ` ORDER BY financial_year DESC, month ASC`;

    const result = await pool.query(query, params);

    // Also get total expenses for each month
    let expenseQuery = `SELECT month, financial_year, SUM(amount) as total_expenses
                        FROM client_expenses
                        WHERE client_id = $1 AND organization_id = $2`;
    const expenseParams: any[] = [clientId, orgId];

    if (financial_year) {
      expenseQuery += ` AND financial_year = $3`;
      expenseParams.push(financial_year);
    }

    expenseQuery += ` GROUP BY month, financial_year ORDER BY financial_year DESC, month ASC`;

    const expenseResult = await pool.query(expenseQuery, expenseParams);

    // Merge expenses into summary
    const expenseMap = new Map<string, number>();
    expenseResult.rows.forEach((row: any) => {
      expenseMap.set(`${row.financial_year}-${row.month}`, parseFloat(row.total_expenses));
    });

    const summary = result.rows.map((row: any) => ({
      ...row,
      total_sales: parseFloat(row.total_sales) || 0,
      output_gst: parseFloat(row.output_gst) || 0,
      total_purchases: parseFloat(row.total_purchases) || 0,
      input_gst: parseFloat(row.input_gst) || 0,
      gst_payable: parseFloat(row.gst_payable) || 0,
      total_expenses: expenseMap.get(`${row.financial_year}-${row.month}`) || 0,
    }));

    res.json(successResponse(summary));
  } catch (error: any) {
    logger.error('getGstSummary error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};
