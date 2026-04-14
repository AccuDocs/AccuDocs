export type DocumentType = 'sale' | 'purchase' | 'expense';
export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit' | null;

export interface ScannerLineItem {
  id?: number;
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  hsn_sac_code?: string | null;
  tax_rate_percent?: number | null;
}

export interface ScannerDocumentData {
  id?: number;
  doc_type: DocumentType;
  document_number: string | null;
  date: string | null;
  vendor_or_customer: string | null;
  gstin: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount: number | null;
  total_amount: number | null;
  currency: string;
  payment_mode: PaymentMode;
  notes: string | null;
  email?: string | null;
  phone?: string | null;
  ocr_confidence?: number | null;
  raw_ocr_text?: string | null;
  line_items: ScannerLineItem[];
  s3_url?: string | null;
  local_path?: string | null;
  created_at?: string;
}

export interface PreviewResponse {
  success: boolean;
  ocr_confidence: number;
  image_base64: string;
  data: ScannerDocumentData;
  field_confidences: Record<string, number>;
  low_confidence_fields: string[];
  warnings: string[];
  raw_ocr_text: string;
}

export interface SaveResponse {
  success: boolean;
  document_id: number;
  s3_url: string | null;
  local_path: string | null;
  data: ScannerDocumentData;
}

export interface ClientScannerSaveResponse {
  success: boolean;
  client_id: string;
  client_record_id: string;
  client_record_type: DocumentType;
  document_id: number;
  data: ScannerDocumentData;
}

export interface ScannedDocumentsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  data: ScannerDocumentData[];
}

export interface SingleDocumentResponse {
  success: boolean;
  data: ScannerDocumentData;
}

export interface ScannerListFilters {
  type?: DocumentType | '';
  from?: string;
  to?: string;
  vendor?: string;
  page?: number;
  limit?: number;
}
