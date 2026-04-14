/**
 * Data Controller V2 — Handles Sales, Purchases, Expenses CRUD + Excel Upload + GST Summary
 * Updated with V2 fields: GSTIN, invoice_type, place_of_supply, CGST/SGST/IGST, ITC, RCM, status
 */
import { Response } from 'express';
import { AuthenticatedRequest } from '../../shared/types/auth.types';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ClientSale } from '../../models/client-sale.model';
import { ClientPurchase } from '../../models/client-purchase.model';
import { ClientExpense } from '../../models/client-expense.model';
import { ActivityLog } from '../../models/activity-log.model';
import { pool } from '../../config/database.config';
import { getFinancialYear, getMonthFromDate, splitGST } from '../../utils/gstCalculator';
import { parseSalesExcel, parsePurchasesExcel, parseExpensesExcel } from '../../utils/excelParser';
import { logger } from '../../utils/logger';
import { getScannerUploadFile } from '../scanner/middleware/upload';
import { buildSavePayload } from '../scanner/middleware/validate';
import { persistScannedDocument } from '../scanner/application/services/persist-scanned-document';
import { SaveScannerDocumentInput } from '../scanner/types';

const OCR_IMPORT_PREFIX = 'OCR Imported';

const deriveBaseAmount = (payload: SaveScannerDocumentInput): number => {
  if (payload.subtotal !== null && payload.subtotal !== undefined) {
    return Number(payload.subtotal.toFixed(2));
  }

  const total = payload.total_amount ?? 0;
  const tax = payload.tax_amount ?? 0;
  const discount = payload.discount ?? 0;
  return Number(Math.max(total - tax + discount, 0).toFixed(2));
};

const deriveGstRate = (baseAmount: number, taxAmount: number): number => {
  if (baseAmount <= 0 || taxAmount <= 0) {
    return 0;
  }

  return Number(((taxAmount / baseAmount) * 100).toFixed(2));
};

const deriveQuantity = (payload: SaveScannerDocumentInput): number => {
  const totalQuantity = payload.line_items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  return totalQuantity > 0 ? Number(totalQuantity.toFixed(3)) : 1;
};

const deriveRate = (baseAmount: number, quantity: number): number => {
  if (quantity <= 0) {
    return baseAmount;
  }

  return Number((baseAmount / quantity).toFixed(2));
};

const derivePlaceOfSupply = (gstin: string | null): string | null => {
  if (!gstin || gstin.length < 2) {
    return null;
  }

  return gstin.slice(0, 2);
};

const deriveDescription = (payload: SaveScannerDocumentInput, fallbackLabel: string): string => {
  const lineItemDescription = payload.line_items.find((item) => item.description?.trim())?.description?.trim();
  if (lineItemDescription) {
    return lineItemDescription;
  }

  const notes = payload.notes?.trim();
  if (notes) {
    return notes;
  }

  const party = payload.vendor_or_customer?.trim();
  if (party) {
    return `${fallbackLabel} - ${party}`;
  }

  return fallbackLabel;
};

const buildImportedNotes = (notes: string | null, scannerDocumentId: number): string => {
  const parts = [`${OCR_IMPORT_PREFIX} (Scanner #${scannerDocumentId})`];
  if (notes?.trim()) {
    parts.push(notes.trim());
  }

  return parts.join('\n');
};

const buildFallbackReference = (docType: NonNullable<SaveScannerDocumentInput['doc_type']>, date: string | null): string => {
  const compactDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const suffix = Date.now().toString().slice(-6);
  return `OCR-${docType.toUpperCase()}-${compactDate}-${suffix}`;
};

const normalizeExpensePaymentMode = (paymentMode: SaveScannerDocumentInput['payment_mode']): string => {
  switch (paymentMode) {
    case 'UPI':
      return 'upi';
    case 'Card':
      return 'card';
    case 'Bank Transfer':
      return 'bank';
    case 'Credit':
      return 'credit';
    case 'Cash':
    default:
      return 'cash';
  }
};

const getClientStateCode = async (clientId: string): Promise<string> => {
  const result = await pool.query('SELECT state_code FROM clients WHERE id = $1', [clientId]);
  return result.rows[0]?.state_code || '24';
};

const createClientEntryFromScannedDocument = async (
  clientId: string,
  organizationId: string,
  payload: SaveScannerDocumentInput,
  scannerDocumentId: number,
): Promise<{ id: string; entityType: SaveScannerDocumentInput['doc_type'] }> => {
  const docType = payload.doc_type;
  if (!docType) {
    throw new Error('doc_type is required to create a client entry from OCR.');
  }

  const date = new Date(payload.date || new Date().toISOString());
  const baseAmount = deriveBaseAmount(payload);
  const taxAmount = Number((payload.tax_amount ?? 0).toFixed(2));
  const gstRate = deriveGstRate(baseAmount, taxAmount);
  const quantity = deriveQuantity(payload);
  const rate = deriveRate(baseAmount, quantity);
  const clientStateCode = await getClientStateCode(clientId);
  const placeOfSupply = derivePlaceOfSupply(payload.gstin);
  const gstBreakdown = splitGST(baseAmount, gstRate, placeOfSupply, clientStateCode);
  const notes = buildImportedNotes(payload.notes, scannerDocumentId);

  if (docType === 'sale') {
    const sale = await ClientSale.create({
      clientId,
      organizationId,
      invoiceNo: payload.document_number || buildFallbackReference(docType, payload.date),
      invoiceDate: payload.date,
      customerName: payload.vendor_or_customer || 'OCR Customer',
      description: deriveDescription(payload, 'OCR sale import'),
      quantity,
      rate,
      baseAmount,
      gstRate,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
      gstin: payload.gstin || null,
      invoiceType: payload.gstin ? 'B2B' : 'B2C',
      placeOfSupply,
      cgstAmount: gstBreakdown.cgstAmount,
      sgstAmount: gstBreakdown.sgstAmount,
      igstAmount: gstBreakdown.igstAmount,
      cessAmount: gstBreakdown.cessAmount,
      isNilRated: taxAmount <= 0,
      isAdvance: false,
      status: 'draft',
      notes,
    });

    return { id: sale.id, entityType: 'sale' };
  }

  if (docType === 'purchase') {
    const purchase = await ClientPurchase.create({
      clientId,
      organizationId,
      billNo: payload.document_number || buildFallbackReference(docType, payload.date),
      billDate: payload.date,
      vendorName: payload.vendor_or_customer || 'OCR Vendor',
      description: deriveDescription(payload, 'OCR purchase import'),
      quantity,
      rate,
      baseAmount,
      gstRate,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
      gstin: payload.gstin || null,
      purchaseType:
        placeOfSupply && placeOfSupply !== clientStateCode
          ? 'interstate'
          : 'local',
      cgstAmount: gstBreakdown.cgstAmount,
      sgstAmount: gstBreakdown.sgstAmount,
      igstAmount: gstBreakdown.igstAmount,
      itcEligible: taxAmount > 0,
      rcmApplicable: false,
      isCapitalGoods: false,
      status: 'draft',
      notes,
    });

    return { id: purchase.id, entityType: docType };
  }

  const expense = await ClientExpense.create({
    clientId,
    organizationId,
    expenseDate: payload.date,
    category: 'general',
    description: deriveDescription(payload, 'OCR expense import'),
    vendorName: payload.vendor_or_customer || null,
    amount: Number((payload.total_amount ?? baseAmount).toFixed(2)),
    paymentMode: normalizeExpensePaymentMode(payload.payment_mode),
    referenceNo: payload.document_number || buildFallbackReference(docType, payload.date),
    month: getMonthFromDate(date),
    financialYear: getFinancialYear(date),
    gstApplicable: taxAmount > 0,
    gstRate,
    gstAmount: taxAmount,
    itcAllowed: taxAmount > 0,
    itcBlockedReason: null,
    status: 'draft',
    notes,
  });

  return { id: expense.id, entityType: docType };
};

// ===================== SALES =====================

export const getSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const { month, financial_year, status, invoice_type } = req.query;
    const orgId = req.user!.organizationId;

    const where: any = { clientId, organizationId: orgId };
    if (month) where.month = Number(month);
    if (financial_year) where.financialYear = financial_year;
    if (status) where.status = status;
    if (invoice_type) where.invoiceType = invoice_type;

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
    const {
      invoiceNo, invoiceDate, customerName, description, hsnSacCode,
      quantity, rate, baseAmount, gstRate,
      // V2 fields
      gstin, invoiceType, placeOfSupply, cgstAmount, sgstAmount, igstAmount,
      cessAmount, isNilRated, isAdvance, status, notes
    } = req.body;

    const date = new Date(invoiceDate);

    // Auto-compute tax split if not provided
    let cgst = cgstAmount || 0, sgst = sgstAmount || 0, igst = igstAmount || 0;
    if (cgst === 0 && sgst === 0 && igst === 0 && baseAmount && gstRate) {
      const client = await pool.query('SELECT state_code FROM clients WHERE id = $1', [clientId]);
      const orgState = client.rows[0]?.state_code || '24';
      const split = splitGST(baseAmount, gstRate || 18, placeOfSupply || null, orgState);
      cgst = split.cgstAmount;
      sgst = split.sgstAmount;
      igst = split.igstAmount;
    }

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
      gstin: gstin || null,
      invoiceType: invoiceType || 'B2B',
      placeOfSupply: placeOfSupply || null,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      cessAmount: cessAmount || 0,
      isNilRated: isNilRated || false,
      isAdvance: isAdvance || false,
      status: status || 'draft',
      notes: notes || null,
    });

    const result = await ClientSale.findByPk(sale.id);

    // Activity log
    await ActivityLog.create({
      clientId, organizationId: orgId, userId: req.user!.userId,
      action: 'SALE_CREATED', entityType: 'sale', entityId: sale.id,
      details: { invoiceNo, amount: baseAmount },
    }).catch(() => {});

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

    const {
      invoiceNo, invoiceDate, customerName, description, hsnSacCode,
      quantity, rate, baseAmount, gstRate,
      gstin, invoiceType, placeOfSupply, cgstAmount, sgstAmount, igstAmount,
      cessAmount, isNilRated, isAdvance, status, notes
    } = req.body;

    const updateData: any = {};
    if (invoiceNo !== undefined) updateData.invoiceNo = invoiceNo;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (description !== undefined) updateData.description = description;
    if (hsnSacCode !== undefined) updateData.hsnSacCode = hsnSacCode;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (rate !== undefined) updateData.rate = rate;
    if (baseAmount !== undefined) updateData.baseAmount = baseAmount;
    if (gstRate !== undefined) updateData.gstRate = gstRate;
    // V2 fields
    if (gstin !== undefined) updateData.gstin = gstin;
    if (invoiceType !== undefined) updateData.invoiceType = invoiceType;
    if (placeOfSupply !== undefined) updateData.placeOfSupply = placeOfSupply;
    if (cgstAmount !== undefined) updateData.cgstAmount = cgstAmount;
    if (sgstAmount !== undefined) updateData.sgstAmount = sgstAmount;
    if (igstAmount !== undefined) updateData.igstAmount = igstAmount;
    if (cessAmount !== undefined) updateData.cessAmount = cessAmount;
    if (isNilRated !== undefined) updateData.isNilRated = isNilRated;
    if (isAdvance !== undefined) updateData.isAdvance = isAdvance;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

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

    if (valid.length > 0) {
      await ClientSale.bulkCreate(
        valid.map(row => ({ ...row, clientId, organizationId: orgId }))
      );
    }

    await pool.query(
      `INSERT INTO data_uploads (client_id, organization_id, uploaded_by, upload_type, file_name, rows_imported, rows_failed, error_log)
       VALUES ($1, $2, $3, 'sales', $4, $5, $6, $7)`,
      [clientId, orgId, req.user!.userId, file.originalname, valid.length, errors.length, JSON.stringify(errors)]
    );

    res.json(successResponse({
      imported: valid.length,
      failed: errors.length,
      errors: errors.slice(0, 20),
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
    const { month, financial_year, status, itc_eligible } = req.query;
    const orgId = req.user!.organizationId;

    const where: any = { clientId, organizationId: orgId };
    if (month) where.month = Number(month);
    if (financial_year) where.financialYear = financial_year;
    if (status) where.status = status;
    if (itc_eligible !== undefined) where.itcEligible = itc_eligible === 'true';

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
    const {
      billNo, billDate, vendorName, description, hsnSacCode,
      quantity, rate, baseAmount, gstRate,
      gstin, purchaseType, cgstAmount, sgstAmount, igstAmount,
      itcEligible, rcmApplicable, isCapitalGoods, status, notes
    } = req.body;

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
      gstin: gstin || null,
      purchaseType: purchaseType || 'local',
      cgstAmount: cgstAmount || 0,
      sgstAmount: sgstAmount || 0,
      igstAmount: igstAmount || 0,
      itcEligible: itcEligible !== false,
      rcmApplicable: rcmApplicable || false,
      isCapitalGoods: isCapitalGoods || false,
      status: status || 'draft',
      notes: notes || null,
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

    const {
      billNo, billDate, vendorName, description, hsnSacCode,
      quantity, rate, baseAmount, gstRate,
      gstin, purchaseType, cgstAmount, sgstAmount, igstAmount,
      itcEligible, rcmApplicable, isCapitalGoods, status, notes
    } = req.body;

    const updateData: any = {};
    if (billNo !== undefined) updateData.billNo = billNo;
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (description !== undefined) updateData.description = description;
    if (hsnSacCode !== undefined) updateData.hsnSacCode = hsnSacCode;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (rate !== undefined) updateData.rate = rate;
    if (baseAmount !== undefined) updateData.baseAmount = baseAmount;
    if (gstRate !== undefined) updateData.gstRate = gstRate;
    if (gstin !== undefined) updateData.gstin = gstin;
    if (purchaseType !== undefined) updateData.purchaseType = purchaseType;
    if (cgstAmount !== undefined) updateData.cgstAmount = cgstAmount;
    if (sgstAmount !== undefined) updateData.sgstAmount = sgstAmount;
    if (igstAmount !== undefined) updateData.igstAmount = igstAmount;
    if (itcEligible !== undefined) updateData.itcEligible = itcEligible;
    if (rcmApplicable !== undefined) updateData.rcmApplicable = rcmApplicable;
    if (isCapitalGoods !== undefined) updateData.isCapitalGoods = isCapitalGoods;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

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
    const { month, financial_year, status, gst_applicable } = req.query;
    const orgId = req.user!.organizationId;

    const where: any = { clientId, organizationId: orgId };
    if (month) where.month = Number(month);
    if (financial_year) where.financialYear = financial_year;
    if (status) where.status = status;
    if (gst_applicable !== undefined) where.gstApplicable = gst_applicable === 'true';

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
    const {
      expenseDate, category, description, vendorName, amount,
      paymentMode, referenceNo,
      gstApplicable, gstRate, gstAmount, itcAllowed, itcBlockedReason, status, notes
    } = req.body;

    const date = new Date(expenseDate);
    const computedGstAmount = gstApplicable && gstRate ? Math.round(amount * gstRate) / 100 : 0;

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
      gstApplicable: gstApplicable || false,
      gstRate: gstRate || 0,
      gstAmount: gstAmount || computedGstAmount,
      itcAllowed: itcAllowed || false,
      itcBlockedReason: itcBlockedReason || null,
      status: status || 'draft',
      notes: notes || null,
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

    const {
      expenseDate, category, description, vendorName, amount,
      paymentMode, referenceNo,
      gstApplicable, gstRate, gstAmount, itcAllowed, itcBlockedReason, status, notes
    } = req.body;

    const updateData: any = {};
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (amount !== undefined) updateData.amount = amount;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (referenceNo !== undefined) updateData.referenceNo = referenceNo;
    if (gstApplicable !== undefined) updateData.gstApplicable = gstApplicable;
    if (gstRate !== undefined) updateData.gstRate = gstRate;
    if (gstAmount !== undefined) updateData.gstAmount = gstAmount;
    if (itcAllowed !== undefined) updateData.itcAllowed = itcAllowed;
    if (itcBlockedReason !== undefined) updateData.itcBlockedReason = itcBlockedReason;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

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

export const uploadExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const orgId = req.user!.organizationId;
    const file = (req as any).file;
    if (!file) { res.status(400).json(errorResponse('BAD_REQUEST', 'No file uploaded')); return; }

    const { valid, errors } = parseExpensesExcel(file.buffer);

    if (valid.length > 0) {
      await ClientExpense.bulkCreate(
        valid.map(row => ({ ...row, clientId, organizationId: orgId }))
      );
    }

    await pool.query(
      `INSERT INTO data_uploads (client_id, organization_id, uploaded_by, upload_type, file_name, rows_imported, rows_failed, error_log)
       VALUES ($1, $2, $3, 'expenses', $4, $5, $6, $7)`,
      [clientId, orgId, req.user!.userId, file.originalname, valid.length, errors.length, JSON.stringify(errors)]
    );

    res.json(successResponse({
      imported: valid.length,
      failed: errors.length,
      errors: errors.slice(0, 20),
    }));
  } catch (error: any) {
    logger.error('uploadExpenses error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};

export const importScannedDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const organizationId = req.user!.organizationId;
    const file = getScannerUploadFile(req);

    if (!file) {
      res.status(400).json(errorResponse('BAD_REQUEST', 'No document image uploaded'));
      return;
    }

    const payload = buildSavePayload(req, organizationId);
    const savedDocument = await persistScannedDocument(file, payload);
    const importedEntry = await createClientEntryFromScannedDocument(
      clientId,
      organizationId,
      payload,
      savedDocument.id,
    );

    await ActivityLog.create({
      clientId,
      organizationId,
      userId: req.user!.userId,
      action: 'OCR_IMPORT_CREATED',
      entityType: importedEntry.entityType,
      entityId: importedEntry.id,
      details: {
        scannerDocumentId: savedDocument.id,
        source: 'workspace-scanner',
        docType: payload.doc_type,
      },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      client_id: clientId,
      client_record_id: importedEntry.id,
      client_record_type: importedEntry.entityType,
      document_id: savedDocument.id,
      data: savedDocument,
    });
  } catch (error: any) {
    logger.error('importScannedDocument error:', error);
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
    let expenseQuery = `SELECT month, financial_year,
                          SUM(amount) as total_expenses,
                          SUM(gst_amount) FILTER (WHERE gst_applicable = true) as expense_gst,
                          SUM(gst_amount) FILTER (WHERE itc_allowed = true) as expense_itc
                        FROM client_expenses
                        WHERE client_id = $1 AND organization_id = $2`;
    const expenseParams: any[] = [clientId, orgId];

    if (financial_year) {
      expenseQuery += ` AND financial_year = $3`;
      expenseParams.push(financial_year);
    }

    expenseQuery += ` GROUP BY month, financial_year ORDER BY financial_year DESC, month ASC`;

    const expenseResult = await pool.query(expenseQuery, expenseParams);

    const expenseMap = new Map<string, any>();
    expenseResult.rows.forEach((row: any) => {
      expenseMap.set(`${row.financial_year}-${row.month}`, row);
    });

    const summary = result.rows.map((row: any) => {
      const exp = expenseMap.get(`${row.financial_year}-${row.month}`) || {};
      return {
        ...row,
        total_sales: parseFloat(row.total_sales) || 0,
        output_gst: parseFloat(row.output_gst) || 0,
        output_cgst: parseFloat(row.output_cgst) || 0,
        output_sgst: parseFloat(row.output_sgst) || 0,
        output_igst: parseFloat(row.output_igst) || 0,
        total_purchases: parseFloat(row.total_purchases) || 0,
        input_gst: parseFloat(row.input_gst) || 0,
        input_cgst: parseFloat(row.input_cgst) || 0,
        input_sgst: parseFloat(row.input_sgst) || 0,
        input_igst: parseFloat(row.input_igst) || 0,
        gst_payable: parseFloat(row.gst_payable) || 0,
        total_expenses: parseFloat(exp.total_expenses) || 0,
        expense_gst: parseFloat(exp.expense_gst) || 0,
        expense_itc: parseFloat(exp.expense_itc) || 0,
      };
    });

    res.json(successResponse(summary));
  } catch (error: any) {
    logger.error('getGstSummary error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message));
  }
};
