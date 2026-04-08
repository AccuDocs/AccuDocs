/**
 * GST Calculator Utility
 * Standard Indian GST rates: 0%, 5%, 12%, 18%, 28%
 */

export interface GSTBreakdown {
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
}

export const GST_RATES = [0, 5, 12, 18, 28];

export function calculateGST(baseAmount: number, gstRate: number): GSTBreakdown {
  const gstAmount = Math.round(baseAmount * gstRate) / 100;
  return {
    baseAmount,
    gstRate,
    gstAmount,
    totalAmount: baseAmount + gstAmount,
  };
}

export function calculatePayableGST(outputGST: number, inputGST: number): number {
  return Math.round((outputGST - inputGST) * 100) / 100;
}

export function getFinancialYear(date: Date): string {
  const month = date.getMonth() + 1; // 1-based
  const year = date.getFullYear();
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(2)}`;
  }
  return `${year - 1}-${year.toString().slice(2)}`;
}

export function getMonthFromDate(date: Date): number {
  return date.getMonth() + 1;
}
