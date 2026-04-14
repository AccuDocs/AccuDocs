import { Request } from 'express';
import { BadRequestError } from '../../../utils/errors';
import {
  SaveScannerDocumentInput,
  ScannerDocType,
  ScannerLineItem,
  ScannerPaymentMode,
} from '../types';

const DOC_TYPES: ScannerDocType[] = ['sale', 'purchase', 'expense'];
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const PAYMENT_MODES: Exclude<ScannerPaymentMode, null>[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Credit'];

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestError('Numeric fields must contain valid numbers.');
  }

  return Number(parsed.toFixed(2));
};

const toNullableQuantity = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestError('Line item quantity must be a valid number.');
  }

  return Number(parsed.toFixed(3));
};

const parseLineItems = (value: unknown): ScannerLineItem[] => {
  if (!value) return [];

  let parsed: unknown;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new BadRequestError('line_items must be valid JSON.');
    }
  } else {
    parsed = value;
  }

  if (!Array.isArray(parsed)) {
    throw new BadRequestError('line_items must be an array.');
  }

  return parsed.map((lineItem, index) => {
    if (!lineItem || typeof lineItem !== 'object') {
      throw new BadRequestError(`Line item #${index + 1} is invalid.`);
    }

    const record = lineItem as Record<string, unknown>;
    const description = toNullableString(record.description);
    if (!description) {
      throw new BadRequestError(`Line item #${index + 1} must include a description.`);
    }

    const quantity = toNullableQuantity(record.quantity);
    const unitPrice = toNullableNumber(record.unit_price ?? record.unitPrice);
    const amount =
      toNullableNumber(record.amount) ??
      (quantity !== null && unitPrice !== null ? Number((quantity * unitPrice).toFixed(2)) : null);

    return {
      description,
      quantity,
      unit_price: unitPrice,
      amount,
      hsn_sac_code: toNullableString(record.hsn_sac_code ?? record.hsnSacCode),
      tax_rate_percent: toNullableNumber(record.tax_rate_percent ?? record.taxRatePercent),
    };
  });
};

export const getValidatedPreviewDocType = (req: Request): ScannerDocType => {
  const docType = String(req.body.doc_type || '').trim().toLowerCase();
  if (!DOC_TYPES.includes(docType as ScannerDocType)) {
    throw new BadRequestError('doc_type must be one of sale, purchase, or expense.');
  }

  return docType as ScannerDocType;
};

export const buildSavePayload = (
  req: Request,
  organizationId: string,
): SaveScannerDocumentInput => {
  const docType = String(req.body.doc_type || '').trim().toLowerCase();
  if (!DOC_TYPES.includes(docType as ScannerDocType)) {
    throw new BadRequestError('doc_type is required and must be sale, purchase, or expense.');
  }

  const date = toNullableString(req.body.date);
  if (!date) {
    throw new BadRequestError('date is required.');
  }

  const totalAmount = toNullableNumber(req.body.total_amount ?? req.body.totalAmount);
  if (totalAmount === null) {
    throw new BadRequestError('total_amount is required.');
  }

  const gstin = toNullableString(req.body.gstin);
  if (gstin && !GSTIN_REGEX.test(gstin)) {
    throw new BadRequestError('GSTIN format is invalid.');
  }

  const paymentMode = toNullableString(req.body.payment_mode ?? req.body.paymentMode);
  if (paymentMode && !PAYMENT_MODES.includes(paymentMode as Exclude<ScannerPaymentMode, null>)) {
    throw new BadRequestError('payment_mode is invalid.');
  }

  return {
    organization_id: organizationId,
    doc_type: docType as ScannerDocType,
    document_number: toNullableString(req.body.document_number ?? req.body.documentNumber),
    date,
    vendor_or_customer: toNullableString(req.body.vendor_or_customer ?? req.body.vendorOrCustomer),
    gstin,
    subtotal: toNullableNumber(req.body.subtotal),
    tax_amount: toNullableNumber(req.body.tax_amount ?? req.body.taxAmount),
    discount: toNullableNumber(req.body.discount) ?? 0,
    total_amount: totalAmount,
    currency: toNullableString(req.body.currency) || 'INR',
    payment_mode: (paymentMode as ScannerPaymentMode) || null,
    notes: toNullableString(req.body.notes),
    email: toNullableString(req.body.email),
    phone: toNullableString(req.body.phone),
    line_items: parseLineItems(req.body.line_items ?? req.body.lineItems),
    ocr_confidence:
      req.body.ocr_confidence === undefined || req.body.ocr_confidence === ''
        ? null
        : Number(req.body.ocr_confidence),
    s3_url: null,
    s3_key: null,
    local_path: null,
    image_filename: null,
    raw_ocr_text: toNullableString(req.body.raw_ocr_text ?? req.body.rawOcrText),
  };
};

export const buildUpdatePayload = (req: Request): Partial<SaveScannerDocumentInput> => {
  const body = req.body as Record<string, unknown>;
  const payload: Partial<SaveScannerDocumentInput> = {};

  if ('doc_type' in body) {
    const docType = String(body.doc_type || '').trim().toLowerCase();
    if (!DOC_TYPES.includes(docType as ScannerDocType)) {
      throw new BadRequestError('doc_type must be sale, purchase, or expense.');
    }
    payload.doc_type = docType as ScannerDocType;
  }

  if ('document_number' in body) payload.document_number = toNullableString(body.document_number);
  if ('date' in body) payload.date = toNullableString(body.date);
  if ('vendor_or_customer' in body) payload.vendor_or_customer = toNullableString(body.vendor_or_customer);
  if ('gstin' in body) {
    const gstin = toNullableString(body.gstin);
    if (gstin && !GSTIN_REGEX.test(gstin)) {
      throw new BadRequestError('GSTIN format is invalid.');
    }
    payload.gstin = gstin;
  }
  if ('subtotal' in body) payload.subtotal = toNullableNumber(body.subtotal);
  if ('tax_amount' in body) payload.tax_amount = toNullableNumber(body.tax_amount);
  if ('discount' in body) payload.discount = toNullableNumber(body.discount);
  if ('total_amount' in body) payload.total_amount = toNullableNumber(body.total_amount);
  if ('currency' in body) payload.currency = toNullableString(body.currency) || 'INR';
  if ('payment_mode' in body) {
    const paymentMode = toNullableString(body.payment_mode);
    if (paymentMode && !PAYMENT_MODES.includes(paymentMode as Exclude<ScannerPaymentMode, null>)) {
      throw new BadRequestError('payment_mode is invalid.');
    }
    payload.payment_mode = (paymentMode as ScannerPaymentMode) || null;
  }
  if ('notes' in body) payload.notes = toNullableString(body.notes);
  if ('email' in body) payload.email = toNullableString(body.email);
  if ('phone' in body) payload.phone = toNullableString(body.phone);
  if ('ocr_confidence' in body) payload.ocr_confidence = body.ocr_confidence ? Number(body.ocr_confidence) : null;
  if ('raw_ocr_text' in body) payload.raw_ocr_text = toNullableString(body.raw_ocr_text);
  if ('line_items' in body) payload.line_items = parseLineItems(body.line_items);

  return payload;
};

export const getValidatedDocumentId = (req: Request): number => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError('Document id must be a positive integer.');
  }

  return id;
};

export const parseListPagination = (req: Request): { page: number; limit: number } => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  return { page, limit };
};
