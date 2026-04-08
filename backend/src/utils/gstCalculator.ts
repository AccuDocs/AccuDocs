/**
 * GST Calculator V2 — Full GST-compliant calculation engine
 * Handles: Tax splitting (CGST/SGST/IGST), ITC computation, RCM, GSTR mapping
 */

export interface GSTBreakdown {
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
  isInterstate: boolean;
}

export interface ITCSummary {
  totalInputGST: number;
  eligibleITC: number;
  blockedITC: number;
  rcmLiability: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface GSTR1Data {
  b2b: any[];
  b2c_small: any[];
  b2c_large: any[];
  exports: any[];
  nil_rated: any[];
  advances: any[];
  credit_notes: any[];
}

export interface GSTR3BSummary {
  section_3_1: { taxable: number; cgst: number; sgst: number; igst: number; cess: number };
  section_3_2: { ue_supplies: number; e_supplies: number };
  section_4: { eligible_itc: { cgst: number; sgst: number; igst: number }; blocked_itc: number };
  section_5: { rcm_liability: { cgst: number; sgst: number; igst: number } };
  net_payable: { cgst: number; sgst: number; igst: number; total: number };
}

export const GST_RATES = [0, 5, 12, 18, 28];

export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '29': 'Karnataka',
  '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
  '96': 'Foreign Country', '97': 'Other Territory'
};

// GSTR-1 Due Dates (day of next month)
const GSTR1_DUE_DAY = 11;
// GSTR-3B Due Dates (day of next month)
const GSTR3B_DUE_DAY = 20;

/**
 * Split GST into CGST/SGST or IGST based on place of supply
 */
export function splitGST(
  baseAmount: number,
  gstRate: number,
  placeOfSupply: string | null,
  orgStateCode: string,
  cessRate: number = 0
): GSTBreakdown {
  const gstAmount = round(baseAmount * gstRate / 100);
  const cessAmount = round(baseAmount * cessRate / 100);
  const isInterstate = placeOfSupply ? placeOfSupply !== orgStateCode : false;

  let cgst = 0, sgst = 0, igst = 0;
  if (isInterstate || placeOfSupply === '96') {
    igst = gstAmount;
  } else {
    cgst = round(gstAmount / 2);
    sgst = round(gstAmount / 2);
  }

  return {
    baseAmount,
    gstRate,
    gstAmount,
    cgstAmount: cgst,
    sgstAmount: sgst,
    igstAmount: igst,
    cessAmount,
    totalAmount: round(baseAmount + gstAmount + cessAmount),
    isInterstate
  };
}

/**
 * Calculate eligible ITC from purchases and expenses
 */
export function calculateITC(
  purchases: any[],
  expenses: any[]
): ITCSummary {
  let eligibleITC = 0, blockedITC = 0, rcmLiability = 0;
  let cgst = 0, sgst = 0, igst = 0;

  for (const p of purchases) {
    const gstAmt = parseFloat(p.gst_amount || p.gstAmount || 0);
    const cgstAmt = parseFloat(p.cgst_amount || p.cgstAmount || 0);
    const sgstAmt = parseFloat(p.sgst_amount || p.sgstAmount || 0);
    const igstAmt = parseFloat(p.igst_amount || p.igstAmount || 0);

    if (p.rcm_applicable || p.rcmApplicable) {
      rcmLiability += gstAmt;
    }

    if (p.itc_eligible !== false && p.itcEligible !== false) {
      eligibleITC += gstAmt;
      cgst += cgstAmt;
      sgst += sgstAmt;
      igst += igstAmt;
    } else {
      blockedITC += gstAmt;
    }
  }

  for (const e of expenses) {
    const gstAmt = parseFloat(e.gst_amount || e.gstAmount || 0);
    if ((e.gst_applicable || e.gstApplicable) &&
        (e.itc_allowed || e.itcAllowed)) {
      eligibleITC += gstAmt;
    } else if (e.gst_applicable || e.gstApplicable) {
      blockedITC += gstAmt;
    }
  }

  return {
    totalInputGST: round(eligibleITC + blockedITC),
    eligibleITC: round(eligibleITC),
    blockedITC: round(blockedITC),
    rcmLiability: round(rcmLiability),
    cgst: round(cgst),
    sgst: round(sgst),
    igst: round(igst)
  };
}

/**
 * Generate GSTR-1 section data from sales
 */
export function generateGSTR1Data(sales: any[]): GSTR1Data {
  const result: GSTR1Data = {
    b2b: [], b2c_small: [], b2c_large: [], exports: [],
    nil_rated: [], advances: [], credit_notes: []
  };

  for (const s of sales) {
    const type = (s.invoice_type || s.invoiceType || 'B2B').toUpperCase();
    const baseAmt = parseFloat(s.base_amount || s.baseAmount || 0);

    if (s.is_nil_rated || s.isNilRated) {
      result.nil_rated.push(s);
    } else if (s.is_advance || s.isAdvance) {
      result.advances.push(s);
    } else if (type === 'CREDIT_NOTE') {
      result.credit_notes.push(s);
    } else if (type === 'EXPORT' || type === 'SEZ') {
      result.exports.push(s);
    } else if (type === 'B2C') {
      if (baseAmt > 250000) {
        result.b2c_large.push(s);
      } else {
        result.b2c_small.push(s);
      }
    } else {
      result.b2b.push(s);
    }
  }

  return result;
}

/**
 * Generate GSTR-3B summary from all transaction data
 */
export function generateGSTR3BSummary(
  sales: any[],
  purchases: any[],
  expenses: any[]
): GSTR3BSummary {
  // Section 3.1 — Output supplies
  let taxable = 0, outCgst = 0, outSgst = 0, outIgst = 0, outCess = 0;
  for (const s of sales) {
    taxable += parseFloat(s.base_amount || s.baseAmount || 0);
    outCgst += parseFloat(s.cgst_amount || s.cgstAmount || 0);
    outSgst += parseFloat(s.sgst_amount || s.sgstAmount || 0);
    outIgst += parseFloat(s.igst_amount || s.igstAmount || 0);
    outCess += parseFloat(s.cess_amount || s.cessAmount || 0);
  }

  // Section 4 — ITC
  const itc = calculateITC(purchases, expenses);

  // Section 5 — RCM
  let rcmCgst = 0, rcmSgst = 0, rcmIgst = 0;
  for (const p of purchases) {
    if (p.rcm_applicable || p.rcmApplicable) {
      rcmCgst += parseFloat(p.cgst_amount || p.cgstAmount || 0);
      rcmSgst += parseFloat(p.sgst_amount || p.sgstAmount || 0);
      rcmIgst += parseFloat(p.igst_amount || p.igstAmount || 0);
    }
  }

  const netCgst = round(outCgst - itc.cgst + rcmCgst);
  const netSgst = round(outSgst - itc.sgst + rcmSgst);
  const netIgst = round(outIgst - itc.igst + rcmIgst);

  return {
    section_3_1: { taxable: round(taxable), cgst: round(outCgst), sgst: round(outSgst), igst: round(outIgst), cess: round(outCess) },
    section_3_2: { ue_supplies: 0, e_supplies: 0 },
    section_4: {
      eligible_itc: { cgst: itc.cgst, sgst: itc.sgst, igst: itc.igst },
      blocked_itc: itc.blockedITC
    },
    section_5: {
      rcm_liability: { cgst: round(rcmCgst), sgst: round(rcmSgst), igst: round(rcmIgst) }
    },
    net_payable: {
      cgst: Math.max(0, netCgst),
      sgst: Math.max(0, netSgst),
      igst: Math.max(0, netIgst),
      total: Math.max(0, netCgst) + Math.max(0, netSgst) + Math.max(0, netIgst)
    }
  };
}

/**
 * Calculate due dates for GSTR filings
 */
export function getGSTRDueDate(returnType: 'GSTR-1' | 'GSTR-3B', month: number, year: number): Date {
  const dueDay = returnType === 'GSTR-1' ? GSTR1_DUE_DAY : GSTR3B_DUE_DAY;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(nextYear, nextMonth - 1, dueDay);
}

export function getFinancialYear(date: Date): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 4) return `${year}-${(year + 1).toString().slice(2)}`;
  return `${year - 1}-${year.toString().slice(2)}`;
}

export function getMonthFromDate(date: Date): number {
  return date.getMonth() + 1;
}

export function calculatePayableGST(outputGST: number, inputGST: number): number {
  return round(outputGST - inputGST);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
