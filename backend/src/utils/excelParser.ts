/**
 * Excel Parser Utility
 * Parses Sales, Purchases, Expenses data from Excel files
 */
import * as XLSX from 'xlsx';
import { getFinancialYear, getMonthFromDate } from './gstCalculator';

export interface ParsedSaleRow {
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  description?: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  baseAmount: number;
  gstRate: number;
  month: number;
  financialYear: string;
  // V2
  gstin?: string | null;
  invoiceType?: string;
  placeOfSupply?: string | null;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
  isNilRated?: boolean;
  isAdvance?: boolean;
}

export interface ParsedPurchaseRow {
  billNo: string;
  billDate: string;
  vendorName: string;
  description?: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  baseAmount: number;
  gstRate: number;
  month: number;
  financialYear: string;
  // V2
  gstin?: string | null;
  purchaseType?: string;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  itcEligible?: boolean;
  rcmApplicable?: boolean;
  isCapitalGoods?: boolean;
}

export interface ParsedExpenseRow {
  expenseDate: string;
  category: string;
  description?: string;
  vendorName?: string;
  amount: number;
  paymentMode?: string;
  referenceNo?: string;
  month: number;
  financialYear: string;
  // V2
  gstApplicable?: boolean;
  gstRate?: number;
  gstAmount?: number;
  itcAllowed?: boolean;
  itcBlockedReason?: string;
}

export interface ParseError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult<T> {
  valid: T[];
  errors: ParseError[];
}

function parseExcelDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  
  if (typeof raw === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    return new Date(d.y, d.m - 1, d.d);
  }
  
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Handle DD.MM.YYYY
    const normalized = trimmed.replace(/\./g, '-').replace(/\//g, '-');
    const parts = normalized.split('-');
    
    if (parts.length === 3) {
      let p1 = parseInt(parts[0], 10);
      let p2 = parseInt(parts[1], 10);
      let p3 = parseInt(parts[2], 10);

      // YYYY-MM-DD (ISO)
      if (p1 > 1000) {
        return new Date(p1, p2 - 1, p3);
      }
      
      // Handle 2-digit years in DD-MM-YY
      if (p3 < 100) {
        p3 += 2000;
      }

      if (p1 > 12) {
        // Assume DD-MM-YYYY
        return new Date(p3, p2 - 1, p1);
      } else if (p2 > 12) {
        // Assume MM-DD-YYYY
        return new Date(p3, p1 - 1, p2);
      } else {
        // Ambiguous, default to DD-MM-YYYY
        return new Date(p3, p2 - 1, p1);
      }
    }
  }

  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeKeys(row: any): Record<string, any> {
  const norm: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    norm[cleanKey] = row[key];
  }
  return norm;
}

function parseBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const clean = val.trim().toLowerCase();
    return clean === 'yes' || clean === 'y' || clean === 'true' || clean === '1';
  }
  if (typeof val === 'number') return val === 1;
  return false;
}

/** Safely parse a number, returning the fallback if NaN */
function safeNum(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

/** Extract 2-digit state code from place of supply (e.g. '27-Maharashtra' -> '27', '27' -> '27') */
function extractStateCode(pos: string): string | null {
  if (!pos) return null;
  const trimmed = pos.trim();
  // If it contains a separator, grab the first part
  const match = trimmed.match(/^(\d{1,2})/);
  if (match) {
    return match[1].padStart(2, '0');
  }
  return trimmed.length <= 2 ? trimmed : null;
}

export function parseSalesExcel(buffer: Buffer): ParseResult<ParsedSaleRow> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const valid: ParsedSaleRow[] = [];
  const errors: ParseError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header row
    const norm = normalizeKeys(row);

    const invoiceNo = String(norm['invoiceno'] || norm['invoice'] || '').trim();
    if (!invoiceNo) { errors.push({ row: rowNum, field: 'Invoice No', message: 'Required' }); return; }

    const dateRaw = norm['invoicedate'] || norm['date'] || row['Invoice Date'];
    const date = parseExcelDate(dateRaw);
    if (!date) { errors.push({ row: rowNum, field: 'Invoice Date', message: 'Invalid date format' }); return; }

    const customerName = String(norm['customername'] || norm['partyname'] || norm['party'] || norm['customer'] || '').trim();
    if (!customerName) { errors.push({ row: rowNum, field: 'Customer Name', message: 'Required' }); return; }

    const baseAmount = safeNum(norm['baseamount'] || norm['amount'] || norm['taxablevalue'] || norm['taxable'], 0);
    if (baseAmount <= 0) { errors.push({ row: rowNum, field: 'Base Amount', message: 'Must be > 0' }); return; }

    const gstRate = safeNum(norm['gstrate'] || norm['gst'], 18);

    valid.push({
      invoiceNo,
      invoiceDate: date.toISOString().split('T')[0],
      customerName,
      description: String(norm['description'] || norm['desc'] || ''),
      hsnSacCode: String(norm['hsnsac'] || norm['hsn'] || norm['sac'] || ''),
      quantity: safeNum(norm['quantity'] || norm['qty'], 1),
      rate: safeNum(norm['rate'] || norm['price'], 0),
      baseAmount,
      gstRate,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
      // V2
      gstin: String(norm['gstin'] || norm['gstinuin'] || '').toUpperCase() || null,
      invoiceType: String(norm['invoicetype'] || norm['type'] || 'B2B'),
      placeOfSupply: extractStateCode(String(norm['placeofsupply'] || norm['pos'] || '')),
      cgstAmount: safeNum(norm['cgstamount'] || norm['cgst'], 0),
      sgstAmount: safeNum(norm['sgstamount'] || norm['sgst'], 0),
      igstAmount: safeNum(norm['igstamount'] || norm['igst'], 0),
      cessAmount: safeNum(norm['cessamount'] || norm['cess'], 0),
      isNilRated: parseBoolean(norm['isnilrated'] || norm['nilrated']),
      isAdvance: parseBoolean(norm['isadvance'] || norm['advance']),
    });
  });

  return { valid, errors };
}

export function parsePurchasesExcel(buffer: Buffer): ParseResult<ParsedPurchaseRow> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const valid: ParsedPurchaseRow[] = [];
  const errors: ParseError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const norm = normalizeKeys(row);

    const billNo = String(norm['billno'] || norm['invoiceno'] || norm['invoice'] || '').trim();
    if (!billNo) { errors.push({ row: rowNum, field: 'Bill No', message: 'Required' }); return; }

    const dateRaw = norm['billdate'] || norm['invoicedate'] || norm['date'];
    const date = parseExcelDate(dateRaw);
    if (!date) { errors.push({ row: rowNum, field: 'Bill Date', message: 'Invalid date format' }); return; }

    const vendorName = String(norm['vendorname'] || norm['partyname'] || norm['vendor'] || norm['party'] || '').trim();
    if (!vendorName) { errors.push({ row: rowNum, field: 'Vendor Name', message: 'Required' }); return; }

    const baseAmount = safeNum(norm['baseamount'] || norm['amount'] || norm['taxablevalue'] || norm['taxable'], 0);
    if (baseAmount <= 0) { errors.push({ row: rowNum, field: 'Base Amount', message: 'Must be > 0' }); return; }

    const gstRate = safeNum(norm['gstrate'] || norm['gst'], 18);

    valid.push({
      billNo,
      billDate: date.toISOString().split('T')[0],
      vendorName,
      description: String(norm['description'] || norm['desc'] || ''),
      hsnSacCode: String(norm['hsnsac'] || norm['hsn'] || norm['sac'] || ''),
      quantity: safeNum(norm['quantity'] || norm['qty'], 1),
      rate: safeNum(norm['rate'] || norm['price'], 0),
      baseAmount,
      gstRate,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
      // V2
      gstin: String(norm['gstin'] || norm['gstinuin'] || '').toUpperCase() || null,
      purchaseType: String(norm['purchasetype'] || norm['type'] || 'local'),
      cgstAmount: safeNum(norm['cgstamount'] || norm['cgst'], 0),
      sgstAmount: safeNum(norm['sgstamount'] || norm['sgst'], 0),
      igstAmount: safeNum(norm['igstamount'] || norm['igst'], 0),
      itcEligible: norm['itceligible'] !== undefined ? parseBoolean(norm['itceligible']) : true,
      rcmApplicable: parseBoolean(norm['rcmapplicable'] || norm['rcm']),
      isCapitalGoods: parseBoolean(norm['iscapitalgoods'] || norm['capitalgoods']),
    });
  });

  return { valid, errors };
}

export function parseExpensesExcel(buffer: Buffer): ParseResult<ParsedExpenseRow> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const valid: ParsedExpenseRow[] = [];
  const errors: ParseError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const norm = normalizeKeys(row);

    const dateRaw = norm['expensedate'] || norm['date'];
    const date = parseExcelDate(dateRaw);
    if (!date) { errors.push({ row: rowNum, field: 'Expense Date', message: 'Invalid date format' }); return; }

    const description = String(norm['description'] || norm['desc'] || '').trim();
    // Description is optional in V3

    const amount = parseFloat(norm['amount'] || norm['expenseamount'] || norm['totalamount'] || '0');
    if (isNaN(amount) || amount <= 0) { errors.push({ row: rowNum, field: 'Amount', message: 'Must be > 0' }); return; }

    const gstRate = safeNum(norm['gstrate'] || norm['gst'], 0);
    const gstAmount = safeNum(norm['gstamount'] || norm['taxamount'], (amount * gstRate) / (100 + gstRate));
    
    valid.push({
      expenseDate: date.toISOString().split('T')[0],
      category: String(norm['category'] || norm['expensecategory'] || 'general'),
      description,
      vendorName: String(norm['vendorname'] || norm['vendor'] || norm['partyname'] || norm['party'] || ''),
      amount,
      paymentMode: String(norm['paymentmode'] || norm['payment'] || norm['mode'] || 'cash'),
      referenceNo: String(norm['referenceno'] || norm['refno'] || norm['ref'] || ''),
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
      // V2
      gstApplicable: parseBoolean(norm['gstapplicable'] || norm['isgst']),
      gstRate,
      gstAmount,
      itcAllowed: parseBoolean(norm['itcallowed'] || norm['itc'] || norm['itceligible']),
      itcBlockedReason: String(norm['itcblockedreason'] || norm['blockedreason'] || ''),
    });
  });

  return { valid, errors };
}
