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
}

export interface ParsedExpenseRow {
  expenseDate: string;
  category: string;
  description: string;
  vendorName?: string;
  amount: number;
  paymentMode?: string;
  referenceNo?: string;
  month: number;
  financialYear: string;
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
  if (typeof raw === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function parseSalesExcel(buffer: Buffer): ParseResult<ParsedSaleRow> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const valid: ParsedSaleRow[] = [];
  const errors: ParseError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header row

    const invoiceNo = String(row['Invoice No'] || row['invoice_no'] || '').trim();
    if (!invoiceNo) { errors.push({ row: rowNum, field: 'Invoice No', message: 'Required' }); return; }

    const dateRaw = row['Invoice Date'] || row['invoice_date'];
    const date = parseExcelDate(dateRaw);
    if (!date) { errors.push({ row: rowNum, field: 'Invoice Date', message: 'Invalid date' }); return; }

    const customerName = String(row['Customer Name'] || row['customer_name'] || '').trim();
    if (!customerName) { errors.push({ row: rowNum, field: 'Customer Name', message: 'Required' }); return; }

    const baseAmount = parseFloat(row['Base Amount'] || row['base_amount'] || row['Amount'] || '0');
    if (isNaN(baseAmount) || baseAmount <= 0) { errors.push({ row: rowNum, field: 'Base Amount', message: 'Must be > 0' }); return; }

    const gstRate = parseFloat(row['GST Rate'] || row['gst_rate'] || '18');

    valid.push({
      invoiceNo,
      invoiceDate: date.toISOString().split('T')[0],
      customerName,
      description: String(row['Description'] || row['description'] || ''),
      hsnSacCode: String(row['HSN/SAC'] || row['hsn_sac_code'] || ''),
      quantity: parseFloat(row['Quantity'] || row['quantity'] || '1') || 1,
      rate: parseFloat(row['Rate'] || row['rate'] || '0') || 0,
      baseAmount,
      gstRate,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
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

    const billNo = String(row['Bill No'] || row['bill_no'] || '').trim();
    if (!billNo) { errors.push({ row: rowNum, field: 'Bill No', message: 'Required' }); return; }

    const dateRaw = row['Bill Date'] || row['bill_date'];
    const date = parseExcelDate(dateRaw);
    if (!date) { errors.push({ row: rowNum, field: 'Bill Date', message: 'Invalid date' }); return; }

    const vendorName = String(row['Vendor Name'] || row['vendor_name'] || '').trim();
    if (!vendorName) { errors.push({ row: rowNum, field: 'Vendor Name', message: 'Required' }); return; }

    const baseAmount = parseFloat(row['Base Amount'] || row['base_amount'] || row['Amount'] || '0');
    if (isNaN(baseAmount) || baseAmount <= 0) { errors.push({ row: rowNum, field: 'Base Amount', message: 'Must be > 0' }); return; }

    const gstRate = parseFloat(row['GST Rate'] || row['gst_rate'] || '18');

    valid.push({
      billNo,
      billDate: date.toISOString().split('T')[0],
      vendorName,
      description: String(row['Description'] || row['description'] || ''),
      hsnSacCode: String(row['HSN/SAC'] || row['hsn_sac_code'] || ''),
      quantity: parseFloat(row['Quantity'] || row['quantity'] || '1') || 1,
      rate: parseFloat(row['Rate'] || row['rate'] || '0') || 0,
      baseAmount,
      gstRate,
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
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

    const dateRaw = row['Expense Date'] || row['expense_date'] || row['Date'];
    const date = parseExcelDate(dateRaw);
    if (!date) { errors.push({ row: rowNum, field: 'Expense Date', message: 'Invalid date' }); return; }

    const description = String(row['Description'] || row['description'] || '').trim();
    if (!description) { errors.push({ row: rowNum, field: 'Description', message: 'Required' }); return; }

    const amount = parseFloat(row['Amount'] || row['amount'] || '0');
    if (isNaN(amount) || amount <= 0) { errors.push({ row: rowNum, field: 'Amount', message: 'Must be > 0' }); return; }

    valid.push({
      expenseDate: date.toISOString().split('T')[0],
      category: String(row['Category'] || row['category'] || 'general'),
      description,
      vendorName: String(row['Vendor'] || row['vendor_name'] || ''),
      amount,
      paymentMode: String(row['Payment Mode'] || row['payment_mode'] || 'cash'),
      referenceNo: String(row['Reference No'] || row['reference_no'] || ''),
      month: getMonthFromDate(date),
      financialYear: getFinancialYear(date),
    });
  });

  return { valid, errors };
}
