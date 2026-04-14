import {
  AMOUNT_REGEX,
  CGST_LABELS,
  DATE_PATTERNS,
  DISCOUNT_LABELS,
  DOCUMENT_NUMBER_PATTERNS,
  DOC_TYPE_KEYWORDS,
  EMAIL_REGEX,
  GSTIN_REGEX,
  IGST_LABELS,
  MONTHS,
  PARTY_LABELS,
  PAYMENT_MODE_KEYWORDS,
  PHONE_REGEX,
  SGST_LABELS,
  SUBTOTAL_LABELS,
  TAX_LABELS,
  TOTAL_LABELS,
} from './patterns';
import {
  ExtractedField,
  ExtractionResult,
  ScannerDocType,
  ScannerDocumentDraft,
  ScannerLineItem,
  ScannerPaymentMode,
} from '../types';

const DEFAULT_CURRENCY = 'INR';
const LOW_CONFIDENCE_THRESHOLD = 70;

const emptyField = <T>(value: T): ExtractedField<T> => ({ value, confidence: 0 });

const normalizeWhitespace = (value: string): string => value.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();

const normalizeLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

const parseAmount = (value?: string | null): number | null => {
  if (!value) return null;
  const sanitized = value.replace(/[^0-9.-]/g, '');
  if (!sanitized || sanitized === '-' || sanitized === '.' || sanitized === '-.') return null;
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
};

const extractAmountsFromLine = (line: string): number[] => {
  const matches = [...line.matchAll(AMOUNT_REGEX)];
  return matches
    .map((match) => parseAmount(match[1]))
    .filter((value): value is number => value !== null);
};

const asIsoDate = (year: number, month: number, day: number): string | null => {
  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate.toISOString().slice(0, 10);
};

const parseDateToken = (value: string): string | null => {
  const trimmed = value.trim().replace(/,/g, '');

  let match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/.exec(trimmed);
  if (match) {
    return asIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  }

  match = /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/.exec(trimmed);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    return month ? asIsoDate(Number(match[3]), month, Number(match[1])) : null;
  }

  match = /^([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{2,4})$/.exec(trimmed);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    return month ? asIsoDate(Number(match[3]), month, Number(match[2])) : null;
  }

  return null;
};

const findLabelAmount = (lines: string[], labels: string[]): ExtractedField<number | null> => {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (labels.some((label) => lower.includes(label))) {
      const amounts = extractAmountsFromLine(line);
      if (amounts.length > 0) {
        return {
          value: amounts[amounts.length - 1],
          confidence: 90,
          source: line,
        };
      }
    }
  }

  return emptyField<number | null>(null);
};

const extractDocType = (text: string, hint?: string | null): ExtractedField<ScannerDocType | null> => {
  if (hint === 'sale' || hint === 'purchase' || hint === 'expense') {
    return { value: hint, confidence: 99, source: 'user-selected' };
  }

  const normalized = text.toLowerCase();
  let winner: ScannerDocType | null = null;
  let score = 0;

  (Object.keys(DOC_TYPE_KEYWORDS) as ScannerDocType[]).forEach((docType) => {
    const hits = DOC_TYPE_KEYWORDS[docType].reduce((count, keyword) => count + (normalized.includes(keyword) ? 1 : 0), 0);
    if (hits > score) {
      score = hits;
      winner = docType;
    }
  });

  return winner ? { value: winner, confidence: Math.min(92, 50 + score * 15) } : emptyField<ScannerDocType | null>(null);
};

const extractDate = (text: string): ExtractedField<string | null> => {
  for (const pattern of DATE_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const candidate = parseDateToken(match[0]);
      if (candidate) {
        const confidence = /date/i.test(text.slice(Math.max(0, match.index! - 16), match.index! + 24)) ? 92 : 82;
        return { value: candidate, confidence, source: match[0] };
      }
    }
  }

  return emptyField<string | null>(null);
};

const extractDocNumber = (lines: string[]): ExtractedField<string | null> => {
  for (const line of lines) {
    if (/(invoice|bill|receipt|rcpt|po|document)\s*(no|number|#)?/i.test(line)) {
      for (const pattern of DOCUMENT_NUMBER_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          return { value: match[0], confidence: 90, source: line };
        }
      }
    }
  }

  for (const line of lines) {
    for (const pattern of DOCUMENT_NUMBER_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        return { value: match[0], confidence: 70, source: line };
      }
    }
  }

  return emptyField<string | null>(null);
};

const extractGSTIN = (text: string): ExtractedField<string | null> => {
  const match = text.match(GSTIN_REGEX);
  return match ? { value: match[0], confidence: 95, source: match[0] } : emptyField<string | null>(null);
};

const extractPartyName = (lines: string[]): ExtractedField<string | null> => {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();
    if (PARTY_LABELS.some((label) => lower.includes(label))) {
      const withoutLabel = line.replace(/^(vendor|supplier|seller|customer|buyer|bill to|ship to|sold by|m\/s)\s*[:\-]?\s*/i, '').trim();
      if (withoutLabel && withoutLabel.length > 2 && !/\d{2,}/.test(withoutLabel)) {
        return { value: withoutLabel, confidence: 85, source: line };
      }

      const nextLine = lines[index + 1];
      if (nextLine && nextLine.length > 2 && !/(gstin|invoice|date|total)/i.test(nextLine)) {
        return { value: nextLine, confidence: 80, source: nextLine };
      }
    }
  }

  const fallback = lines.find((line, index) => index < 8 && /^[A-Za-z][A-Za-z0-9&.,'() -]{3,}$/.test(line) && !/(invoice|receipt|purchase|expense|gstin|date|tax|total)/i.test(line));
  return fallback ? { value: fallback, confidence: 62, source: fallback } : emptyField<string | null>(null);
};

const extractPaymentMode = (text: string): ExtractedField<ScannerPaymentMode> => {
  const normalized = text.toLowerCase();

  for (const [mode, keywords] of Object.entries(PAYMENT_MODE_KEYWORDS) as [Exclude<ScannerPaymentMode, null>, string[]][]) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return { value: mode, confidence: 86 };
    }
  }

  return emptyField<ScannerPaymentMode>(null);
};

const extractContact = (text: string): { email: ExtractedField<string | null>; phone: ExtractedField<string | null> } => {
  const emailMatch = text.match(EMAIL_REGEX);
  const phoneMatch = text.match(PHONE_REGEX);
  return {
    email: emailMatch ? { value: emailMatch[0], confidence: 90 } : emptyField<string | null>(null),
    phone: phoneMatch ? { value: phoneMatch[0].replace(/[^\d+]/g, ''), confidence: 78 } : emptyField<string | null>(null),
  };
};

const extractLineItems = (lines: string[]): ExtractedField<ScannerLineItem[]> => {
  const headerIndex = lines.findIndex((line) => /(description|item|particular).*(qty|quantity).*(rate|price|amount)/i.test(line));
  const candidateLines = headerIndex >= 0 ? lines.slice(headerIndex + 1, headerIndex + 11) : lines;
  const items: ScannerLineItem[] = [];

  for (const line of candidateLines) {
    if (/(subtotal|total|tax|discount|gst|amount payable|thank you)/i.test(line)) {
      continue;
    }

    const amounts = extractAmountsFromLine(line);
    if (amounts.length < 2) {
      continue;
    }

    const tokens = line.split(/\s{2,}|\t+/).map((token) => token.trim()).filter(Boolean);
    const quantityCandidate = tokens.find((token) => /^\d+(?:\.\d{1,3})?$/.test(token));
    const description = tokens[0] && !/^\d/.test(tokens[0]) ? tokens[0] : line.replace(/(?:\d[\d., ]*){2,}/g, '').trim();

    if (!description || description.length < 2) {
      continue;
    }

    const quantity = quantityCandidate ? Number.parseFloat(quantityCandidate) : amounts.length >= 3 ? amounts[0] : 1;
    const unitPrice = amounts.length >= 3 ? amounts[amounts.length - 2] : amounts[0];
    const amount = amounts[amounts.length - 1];

    if (Number.isFinite(amount) && amount > 0) {
      items.push({
        description,
        quantity: Number.isFinite(quantity) ? Number(quantity.toFixed(3)) : null,
        unit_price: Number.isFinite(unitPrice) ? Number(unitPrice.toFixed(2)) : null,
        amount: Number(amount.toFixed(2)),
      });
    }
  }

  return {
    value: items.slice(0, 20),
    confidence: items.length > 0 ? 72 : 0,
  };
};

const extractAmounts = (lines: string[]): {
  subtotal: ExtractedField<number | null>;
  tax_amount: ExtractedField<number | null>;
  discount: ExtractedField<number | null>;
  total_amount: ExtractedField<number | null>;
} => {
  const subtotal = findLabelAmount(lines, SUBTOTAL_LABELS);
  const discount = findLabelAmount(lines, DISCOUNT_LABELS);
  const total = findLabelAmount(lines, TOTAL_LABELS);
  const cgst = findLabelAmount(lines, CGST_LABELS);
  const sgst = findLabelAmount(lines, SGST_LABELS);
  const igst = findLabelAmount(lines, IGST_LABELS);
  const tax = findLabelAmount(lines, TAX_LABELS);

  let taxAmount = tax;
  if (cgst.value !== null || sgst.value !== null) {
    taxAmount = {
      value: Number(((cgst.value || 0) + (sgst.value || 0)).toFixed(2)),
      confidence: Math.max(cgst.confidence, sgst.confidence, 84),
      source: `${cgst.source || ''} ${sgst.source || ''}`.trim(),
    };
  } else if (igst.value !== null) {
    taxAmount = igst;
  }

  let totalAmount = total;
  if (totalAmount.value === null && subtotal.value !== null) {
    totalAmount = {
      value: Number((subtotal.value + (taxAmount.value || 0) - (discount.value || 0)).toFixed(2)),
      confidence: 68,
      source: 'calculated',
    };
  }

  return {
    subtotal,
    tax_amount: taxAmount,
    discount: discount.value !== null ? discount : { value: 0, confidence: 60, source: 'defaulted' },
    total_amount: totalAmount,
  };
};

export const extract = (text: string, hint?: string | null): ExtractionResult => {
  const normalizedText = normalizeWhitespace(text);
  const lines = normalizeLines(text);

  const docType = extractDocType(normalizedText, hint);
  const date = extractDate(normalizedText);
  const documentNumber = extractDocNumber(lines);
  const gstin = extractGSTIN(normalizedText);
  const partyName = extractPartyName(lines);
  const paymentMode = extractPaymentMode(normalizedText);
  const lineItems = extractLineItems(lines);
  const { email, phone } = extractContact(normalizedText);
  const amounts = extractAmounts(lines);

  const data: ScannerDocumentDraft = {
    doc_type: docType.value,
    document_number: documentNumber.value,
    date: date.value,
    vendor_or_customer: partyName.value,
    gstin: gstin.value,
    subtotal: amounts.subtotal.value,
    tax_amount: amounts.tax_amount.value,
    discount: amounts.discount.value,
    total_amount: amounts.total_amount.value,
    currency: DEFAULT_CURRENCY,
    payment_mode: paymentMode.value,
    notes: null,
    email: email.value,
    phone: phone.value,
    line_items: lineItems.value.map((item) => ({
      ...item,
      amount:
        item.amount ??
        (item.quantity !== null && item.unit_price !== null
          ? Number((item.quantity * item.unit_price).toFixed(2))
          : null),
    })),
  };

  const field_confidences: Record<string, number> = {
    doc_type: docType.confidence,
    document_number: documentNumber.confidence,
    date: date.confidence,
    vendor_or_customer: partyName.confidence,
    gstin: gstin.confidence,
    subtotal: amounts.subtotal.confidence,
    tax_amount: amounts.tax_amount.confidence,
    discount: amounts.discount.confidence,
    total_amount: amounts.total_amount.confidence,
    payment_mode: paymentMode.confidence,
    email: email.confidence,
    phone: phone.confidence,
    line_items: lineItems.confidence,
  };

  const low_confidence_fields = Object.entries(field_confidences)
    .filter(([, confidence]) => confidence > 0 && confidence < LOW_CONFIDENCE_THRESHOLD)
    .map(([field]) => field);

  const warnings: string[] = [];
  if (!data.total_amount) warnings.push('Could not confidently detect total amount.');
  if (!data.date) warnings.push('Could not confidently detect document date.');
  if (lineItems.value.length === 0) warnings.push('No line items were detected from the OCR text.');

  return {
    data,
    field_confidences,
    low_confidence_fields,
    warnings,
    raw_text: normalizedText,
  };
};
