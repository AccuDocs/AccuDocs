export type ScannerDocType = 'sale' | 'purchase' | 'expense';

export type ScannerPaymentMode =
  | 'Cash'
  | 'UPI'
  | 'Card'
  | 'Bank Transfer'
  | 'Credit'
  | null;

export interface ScannerLineItem {
  id?: number;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  hsn_sac_code?: string | null;
  tax_rate_percent?: number | null;
}

export interface ScannerDocumentDraft {
  doc_type: ScannerDocType | null;
  document_number: string | null;
  date: string | null;
  vendor_or_customer: string | null;
  gstin: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount: number | null;
  total_amount: number | null;
  currency: string;
  payment_mode: ScannerPaymentMode;
  notes: string | null;
  email: string | null;
  phone: string | null;
  line_items: ScannerLineItem[];
}

export interface ScannerDocumentRecord extends ScannerDocumentDraft {
  id: number;
  organization_id: string;
  ocr_confidence: number | null;
  s3_url: string | null;
  s3_key: string | null;
  local_path: string | null;
  image_filename: string | null;
  raw_ocr_text: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExtractedField<T> {
  value: T;
  confidence: number;
  source?: string;
}

export interface ExtractionResult {
  data: ScannerDocumentDraft;
  field_confidences: Record<string, number>;
  low_confidence_fields: string[];
  warnings: string[];
  raw_text: string;
}

export interface StorageDescriptor {
  extension: string;
  file_name: string;
  local_absolute_path: string;
  local_relative_path: string;
  month: string;
  s3_key: string;
  year: string;
  year_month: string;
}

export interface SaveScannerDocumentInput extends ScannerDocumentDraft {
  organization_id: string;
  ocr_confidence: number | null;
  s3_url: string | null;
  s3_key: string | null;
  local_path: string | null;
  image_filename: string | null;
  raw_ocr_text: string | null;
}

export interface ScannerListFilters {
  organizationId: string;
  type?: ScannerDocType;
  from?: string;
  to?: string;
  vendor?: string;
  page: number;
  limit: number;
}

export interface ScannerExportFilters {
  organizationId: string;
  type?: ScannerDocType;
  from?: string;
  to?: string;
}

export interface ScannerSummaryRow {
  month: string;
  doc_type: ScannerDocType;
  document_count: number;
  subtotal_total: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
}

export interface PreviewOcrResult {
  confidence: number;
  text: string;
}
