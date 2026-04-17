export interface TdsEntry {
  id: string;
  clientId: string;
  deductor: string;
  pan: string;
  section: string;
  paymentNature: string;
  amount: number;
  tdsRate: number;
  tdsAmount: number;
  period: string;
  challanNo: string | null;
  status: 'pending' | 'deducted' | 'deposited' | 'filed';
  deductionDate: string | null;
  depositDate: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface TcsEntry {
  id: string;
  sellerGstin: string;
  buyerGstin: string;
  transactionValue: number;
  tcsRate: number;
  tcsAmount: number;
  period: string;
  collectionDate: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface TdsSection {
  section: string;
  rate_individual: number;
  rate_other: number;
  description: string;
}

export interface Form26ASSummary {
  clientId: string;
  financialYear: string;
  sections: Array<{
    section: string;
    description: string;
    entries: any[];
    totalAmount: number;
    totalTds: number;
  }>;
  grandTotalAmount: number;
  grandTotalTds: number;
  totalEntries: number;
  generatedAt: string;
}
