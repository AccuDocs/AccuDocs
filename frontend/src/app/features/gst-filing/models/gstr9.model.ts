export interface Gstr9Summary {
  summary: {
    clientId: string;
    clientName: string;
    clientGstin: string;
    financialYear: string;
    generatedAt: string;
    totalOutwardSupplies: number;
    totalInwardSupplies: number;
    totalTaxLiability: number;
    totalItcAvailed: number;
    netTaxPayable: number;
    returnsFiled: number;
    returnsDraft: number;
  };
  table4: TableSection;
  table5: TableSection;
  table6: TableSection;
  table7: TableSection;
  table9: TableSection;
}

export interface TableSection {
  title: string;
  [key: string]: any;
}
