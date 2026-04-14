import { ScannerDocType } from '../types';

export const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/;
export const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
export const PHONE_REGEX = /(?:\+91[-\s]?)?(?:\d[\s-]?){10,13}\b/;
export const AMOUNT_REGEX =
  /(?:INR|Rs\.?|₹)?\s*(-?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?)/gi;

export const DOCUMENT_NUMBER_PATTERNS: RegExp[] = [
  /\b(?:INV|INVOICE|BILL|PO|RCPT|RECEIPT|GST)[-\/]?[A-Z0-9][A-Z0-9\/-]{1,24}\b/i,
  /\b[A-Z]{1,5}[-/]\d{2,4}[-/]\d{1,6}\b/i,
  /\b\d{1,4}[-/][A-Z0-9]{1,8}[-/]\d{1,6}\b/i,
];

export const DATE_PATTERNS: RegExp[] = [
  /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/g,
  /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})\b/g,
  /\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})\b/g,
];

export const DOC_TYPE_KEYWORDS: Record<ScannerDocType, string[]> = {
  sale: ['sale receipt', 'receipt', 'tax invoice', 'invoice', 'retail invoice', 'cash memo'],
  purchase: ['purchase order', 'po number', 'po no', 'supplier copy', 'purchase'],
  expense: ['expense bill', 'expense voucher', 'expense', 'bill', 'utility bill'],
};

export const PARTY_LABELS = [
  'vendor',
  'supplier',
  'seller',
  'customer',
  'buyer',
  'bill to',
  'ship to',
  'sold by',
  'm/s',
];

export const SUBTOTAL_LABELS = [
  'subtotal',
  'sub total',
  'taxable amount',
  'taxable value',
  'basic amount',
  'gross amount',
];

export const TOTAL_LABELS = [
  'grand total',
  'total amount',
  'invoice total',
  'net amount',
  'amount payable',
  'payable amount',
  'total',
];

export const DISCOUNT_LABELS = ['discount', 'disc'];
export const TAX_LABELS = ['tax amount', 'gst amount', 'tax', 'vat'];
export const CGST_LABELS = ['cgst'];
export const SGST_LABELS = ['sgst'];
export const IGST_LABELS = ['igst'];

export const PAYMENT_MODE_KEYWORDS: Record<
  Exclude<import('../types').ScannerPaymentMode, null>,
  string[]
> = {
  Cash: ['cash', 'cash payment'],
  UPI: ['upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bhim'],
  Card: ['card', 'debit card', 'credit card', 'visa', 'mastercard'],
  'Bank Transfer': ['bank transfer', 'neft', 'rtgs', 'imps', 'wire transfer'],
  Credit: ['credit', 'due', 'on account'],
};

export const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};
