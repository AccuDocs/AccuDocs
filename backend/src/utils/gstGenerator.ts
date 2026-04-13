/**
 * AccuDocs GST System Architect - Production-Ready GSTR-1 & GSTR-3B Generator (V4.1)
 * Rules: Strict Schema Mapping, Robust Model Integration, Precise Aggregation
 */

const round = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper to extract values from model or raw JSON (handles snake_case and camelCase)
const getVal = (obj: any, variants: string[], defaultVal: any = 0) => {
  for (const key of variants) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "null") return obj[key];
  }
  return defaultVal;
};

export interface GSTRDataInput {
  client_gstin: string;
  return_period: string; // MMYYYY
  gross_turnover?: number;
  current_gross_turnover?: number;
  invoices: any[];
  purchases: any[];
  expenses: any[];
}

/**
 * Generates GSTR-1 JSON compliant with the GST portal schema
 */
export function generateGSTR1(data: GSTRDataInput) {
  const { invoices = [] } = data;
  const gstr1: any = {
    v: "4.1", // DIAGNOSTIC VERSION TAG
    gstin: data.client_gstin || "DUMMY_GSTIN",
    fp: data.return_period || "042026",
    gt: round(data.gross_turnover || 0),
    cur_gt: round(data.current_gross_turnover || 0),
    b2b: [],
    b2cs: [],
    hsn: { data: [] }
  };

  const b2bMap = new Map<string, any>(); // Map by CTIN
  const b2csMap = new Map<string, any>(); // Map by POS_RATE
  const hsnMap = new Map<string, any>();

  invoices.forEach(inv => {
    // Robust Extraction
    const taxable = Number(getVal(inv, ['baseAmount', 'base_amount', 'taxable_value', 'taxableValue']));
    const rate = Number(getVal(inv, ['gstRate', 'gst_rate', 'rt']));
    const igst = Number(getVal(inv, ['igstAmount', 'igst_amount', 'igst', 'iamt']));
    const cgst = Number(getVal(inv, ['cgstAmount', 'cgst_amount', 'cgst', 'camt']));
    const sgst = Number(getVal(inv, ['sgstAmount', 'sgst_amount', 'sgst', 'samt']));
    const cess = Number(getVal(inv, ['cessAmount', 'cess_amount', 'cess', 'csamt']));
    const gstField = getVal(inv, ['gstin'], null);
    const date = getVal(inv, ['invoiceDate', 'invoice_date', 'idt', 'date'], "");
    const inum = getVal(inv, ['invoiceNo', 'invoice_no', 'inum'], "");
    const hsn = getVal(inv, ['hsnSacCode', 'hsn_sac_code', 'hsn_sc', 'hsn'], "9999");
    const pos = getVal(inv, ['placeOfSupply', 'place_of_supply', 'pos'], (data.client_gstin ? data.client_gstin.substring(0, 2) : "27"));
    const qty = Number(getVal(inv, ['quantity', 'qty'], 1));

    // 1. HSN Summary
    const hsnKey = `${hsn}_${rate}`;
    if (!hsnMap.has(hsnKey)) {
      hsnMap.set(hsnKey, { hsn_sc: hsn, desc: "Goods/Services", uqc: "OTH", qty: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 });
    }
    const h = hsnMap.get(hsnKey);
    h.qty += qty;
    h.txval += taxable;
    h.iamt += igst;
    h.camt += cgst;
    h.samt += sgst;
    h.csamt += cess;

    const isB2B = gstField && String(gstField).trim().length === 15;

    if (isB2B) {
      const gstin = String(gstField).trim();
      // 2. B2B Logic
      if (!b2bMap.has(gstin)) {
        b2bMap.set(gstin, { ctin: gstin, inv: [] });
      }
      const ctinNode = b2bMap.get(gstin);
      let invNode = ctinNode.inv.find((i: any) => i.inum === inum);
      
      if (!invNode) {
        invNode = {
          inum: inum,
          idt: date,
          val: 0,
          pos: gstin.substring(0, 2),
          rchrg: (inv.invoiceType === 'RCM' || inv.type === 'RCM') ? 'Y' : 'N',
          inv_typ: "R",
          itms: []
        };
        ctinNode.inv.push(invNode);
      }
      
      invNode.val += (taxable + igst + cgst + sgst + cess);
      invNode.itms.push({
        num: invNode.itms.length + 1,
        itm_det: {
          rt: rate,
          txval: round(taxable),
          iamt: round(igst),
          camt: round(cgst),
          samt: round(sgst),
          csamt: round(cess)
        }
      });
    } else {
      // 3. B2CS Logic
      const key = `${pos}_${rate}`;
      if (!b2csMap.has(key)) {
        b2csMap.set(key, { 
          rt: rate, 
          sply_ty: Number(pos) !== Number(data.client_gstin?.substring(0, 2)) ? "INTER" : "INTRA", 
          pos: pos, 
          txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 
        });
      }
      const b = b2csMap.get(key);
      b.txval += taxable;
      b.iamt += igst;
      b.camt += cgst;
      b.samt += sgst;
      b.csamt += cess;
    }
  });

  // Finalize Rounding
  gstr1.b2b = Array.from(b2bMap.values()).map(ctin => ({
    ...ctin,
    inv: ctin.inv.map((i: any) => ({ ...i, val: round(i.val) }))
  }));
  
  gstr1.b2cs = Array.from(b2csMap.values())
    .filter(v => round(v.txval) > 0)
    .map(v => ({
      rt: v.rt,
      sply_ty: v.sply_ty,
      pos: v.pos,
      txval: round(v.txval),
      iamt: round(v.iamt),
      camt: round(v.camt),
      samt: round(v.samt),
      csamt: round(v.csamt)
    }));
  
  gstr1.hsn.data = Array.from(hsnMap.values()).map((v, i) => ({
    num: i + 1,
    hsn_sc: v.hsn_sc,
    desc: v.desc,
    uqc: v.uqc,
    qty: round(v.qty),
    txval: round(v.txval),
    iamt: round(v.iamt),
    camt: round(v.camt),
    samt: round(v.samt),
    csamt: round(v.csamt)
  }));

  return gstr1;
}

/**
 * Generates GSTR-3B JSON compliant with the GST portal schema
 */
export function generateGSTR3B(data: GSTRDataInput) {
  const { invoices = [], purchases = [], expenses = [] } = data;
  
  const outward = { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
  
  invoices.forEach(inv => {
    outward.txval += Number(getVal(inv, ['baseAmount', 'base_amount', 'taxable_value', 'taxableValue']));
    outward.iamt += Number(getVal(inv, ['igstAmount', 'igst_amount', 'igst', 'iamt']));
    outward.camt += Number(getVal(inv, ['cgstAmount', 'cgst_amount', 'cgst', 'camt']));
    outward.samt += Number(getVal(inv, ['sgstAmount', 'sgst_amount', 'sgst', 'samt']));
    outward.csamt += Number(getVal(inv, ['cessAmount', 'cess_amount', 'cess', 'csamt']));
  });

  const itc = { iamt: 0, camt: 0, samt: 0, csamt: 0 };
  [...purchases].forEach(item => {
    const isEligible = getVal(item, ['itcEligible', 'itc_eligible'], true) !== false;
    if (isEligible) {
      itc.iamt += Number(getVal(item, ['igstAmount', 'igst_amount', 'igst', 'iamt']));
      itc.camt += Number(getVal(item, ['cgstAmount', 'cgst_amount', 'cgst', 'camt']));
      itc.samt += Number(getVal(item, ['sgstAmount', 'sgst_amount', 'sgst', 'samt']));
      itc.csamt += Number(getVal(item, ['cessAmount', 'cess_amount', 'cess', 'csamt']));
    }
  });

  return {
    v: "4.1", // DIAGNOSTIC VERSION TAG
    gstin: data.client_gstin || "DUMMY_GSTIN",
    fp: data.return_period || "042026",
    sup_details: {
      osup_det: {
        txval: round(outward.txval),
        iamt: round(outward.iamt),
        camt: round(outward.camt),
        samt: round(outward.samt)
      }
    },
    itc_elg: {
      itc_avl: [
        { 
          ty: "All other ITC", 
          iamt: round(itc.iamt), 
          camt: round(itc.camt), 
          samt: round(itc.samt) 
        }
      ]
    }
  };
}
