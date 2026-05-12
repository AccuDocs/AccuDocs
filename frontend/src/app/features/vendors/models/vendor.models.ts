export type VendorType = 'goods_supplier' | 'service_provider' | 'contractor' | 'consultant';
export type VendorStatus = 'active' | 'blocked';
export type VendorPoStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'completed'
  | 'cancelled';
export type VendorBillStatus = 'draft' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type VendorPaymentMethod = 'upi' | 'bank_transfer' | 'cheque' | 'cash';
export type VendorDocumentType = 'gst_certificate' | 'contract' | 'agreement' | 'quotation' | 'bill' | 'other';

export interface VendorMetrics {
  totalPurchases: number;
  totalOutstanding: number;
  overdueAmount: number;
  lastPurchaseDate?: string | null;
  paymentPerformance: number;
}

export interface Vendor {
  id: string;
  clientId?: string | null;
  vendorCode: string;
  vendorName: string;
  businessName?: string | null;
  vendorType: VendorType;
  gstNumber?: string | null;
  panNumber?: string | null;
  contactPerson?: string | null;
  mobile?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  paymentTerms?: string | null;
  creditDays: number;
  creditLimit: number;
  status: VendorStatus;
  notes?: string | null;
  metrics?: VendorMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDashboard {
  totalVendors: number;
  activeVendors: number;
  totalPurchases: number;
  totalOutstanding: number;
  overdueAmount: number;
  upcomingDue: number;
}

export interface VendorPurchaseOrderItem {
  description: string;
  hsnSacCode?: string | null;
  quantity: number;
  rate: number;
  gstRate: number;
}

export interface VendorPurchaseOrder {
  id: string;
  vendorId: string;
  poNumber: string;
  poDate: string;
  deliveryDate?: string | null;
  status: VendorPoStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  approvalNote?: string | null;
  notes?: string | null;
  vendor?: Pick<Vendor, 'id' | 'vendorCode' | 'vendorName' | 'gstNumber'>;
  items?: VendorPurchaseOrderItem[];
}

export interface VendorBill {
  id: string;
  vendorId: string;
  purchaseOrderId?: string | null;
  billNumber: string;
  invoiceDate: string;
  dueDate: string;
  category?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: VendorBillStatus;
  attachmentUrl?: string | null;
  notes?: string | null;
  vendor?: Pick<Vendor, 'id' | 'vendorCode' | 'vendorName' | 'gstNumber'>;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  billId?: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: VendorPaymentMethod;
  referenceNumber?: string | null;
  status: 'paid' | 'pending';
  notes?: string | null;
  vendor?: Pick<Vendor, 'id' | 'vendorCode' | 'vendorName'>;
  bill?: Pick<VendorBill, 'id' | 'billNumber' | 'totalAmount' | 'balanceDue'>;
}

export interface AccountsPayableRow {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  totalOutstanding: number;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90Plus: number;
  nextDueDate?: string | null;
}

export interface VendorDocument {
  id: string;
  vendorId: string;
  documentType: VendorDocumentType;
  name: string;
  fileUrl?: string | null;
  notes?: string | null;
  vendor?: Pick<Vendor, 'id' | 'vendorCode' | 'vendorName'>;
  createdAt: string;
}
