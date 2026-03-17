export type PaymentMode =
  | 'cash'
  | 'cheque'
  | 'bank_transfer'
  | 'upi'
  | 'neft'
  | 'rtgs'
  | 'other';

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode | string;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}
