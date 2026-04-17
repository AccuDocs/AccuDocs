export interface EInvoiceData {
  id: string;
  invoiceId: string;
  irn: string | null;
  ackNo: string | null;
  ackDate: string | null;
  signedQrCode: string | null;
  status: 'generated' | 'cancelled' | 'failed';
  errorMessage: string | null;
  createdAt: string;
}
