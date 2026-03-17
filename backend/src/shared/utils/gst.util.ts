export interface GSTCalculation {
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

export const calculateGST = (
  lineItems: LineItemInput[], 
  clientStateCode: string, 
  orgStateCode: string
): GSTCalculation => {
  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitRate), 0);
  
  let gstType: 'CGST_SGST' | 'IGST';
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (clientStateCode === orgStateCode) {
    gstType = 'CGST_SGST';
    cgstAmount = Math.round((subtotal * 0.09) * 100) / 100;
    sgstAmount = Math.round((subtotal * 0.09) * 100) / 100;
  } else {
    gstType = 'IGST';
    igstAmount = Math.round((subtotal * 0.18) * 100) / 100;
  }

  const totalBeforeRounding = subtotal + cgstAmount + sgstAmount + igstAmount;
  const totalAmount = Math.round(totalBeforeRounding);
  const roundOff = Math.round((totalAmount - totalBeforeRounding) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gstType,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalBeforeRounding: Math.round(totalBeforeRounding * 100) / 100,
    roundOff,
    totalAmount
  };
};
