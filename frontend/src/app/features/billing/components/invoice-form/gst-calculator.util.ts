export interface GstCalculation {
  subtotal: number;
  gstType: 'CGST_SGST' | 'IGST';
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalBeforeRounding: number;
  roundOff: number;
  totalAmount: number;
}

export interface LineItemInput {
  quantity: number;
  unitRate: number;
}

export function calculateGST(
  lineItems: LineItemInput[],
  clientStateCode: string,
  orgStateCode: string
): GstCalculation {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitRate, 0);
  const subtotalRounded = Math.round(subtotal * 100) / 100;

  const isIntraState = clientStateCode === orgStateCode;

  const cgstAmount = isIntraState ? Math.round(subtotalRounded * 9) / 100 : 0;
  const sgstAmount = isIntraState ? Math.round(subtotalRounded * 9) / 100 : 0;
  const igstAmount = isIntraState ? 0 : Math.round(subtotalRounded * 18) / 100;

  const totalBeforeRounding = subtotalRounded + cgstAmount + sgstAmount + igstAmount;
  const totalAmount = Math.round(totalBeforeRounding);
  const roundOff = Math.round((totalAmount - totalBeforeRounding) * 100) / 100;

  return {
    subtotal: subtotalRounded,
    gstType: isIntraState ? 'CGST_SGST' : 'IGST',
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalBeforeRounding: Math.round(totalBeforeRounding * 100) / 100,
    roundOff,
    totalAmount,
  };
}

export function lineItemAmount(quantity: number, unitRate: number): number {
  return Math.round(quantity * unitRate * 100) / 100;
}
