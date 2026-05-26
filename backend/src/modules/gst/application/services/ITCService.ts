import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../config/database.config';
import { ItcLedger } from '../../../../models/itc-ledger.model';
import { AppError } from '../../../../utils/errors';

interface PurchaseItcRow {
  id: string;
  hsn_sac_code: string | null;
  description: string | null;
  purchase_type: string | null;
  igst_amount: string | number | null;
  cgst_amount: string | number | null;
  sgst_amount: string | number | null;
  gst_amount: string | number | null;
  total_amount: string | number | null;
  itc_eligible: boolean | null;
  rcm_applicable: boolean | null;
}

/**
 * HSN codes blocked under GST Section 17(5) — ineligible for ITC
 */
const BLOCKED_HSN_CODES_17_5 = new Set([
  '8703', // Motor vehicles for transport of persons
  '8702', // Motor vehicles (buses)
  '8704', // Motor vehicles for transport of goods
  '8705', // Special purpose motor vehicles
  '8711', // Motorcycles, mopeds
  '8712', // Bicycles
  '950611', // Golf carts
  '2101', // Food, beverages for personal consumption
  '4901', // Printed books (blocked if for personal use — flagged by description)
]);

/**
 * Keywords in purchase_description that indicate personal expenses (blocked)
 */
const BLOCKED_DESCRIPTION_KEYWORDS = ['personal', 'gift', 'picnic', 'club', 'health club', 'beauty'];

function isBlocked(hsnCode: string | null, description: string | null): boolean {
  if (hsnCode) {
    const prefix4 = (hsnCode || '').substring(0, 4).toUpperCase();
    if (BLOCKED_HSN_CODES_17_5.has(prefix4)) return true;
  }
  if (description) {
    const lower = description.toLowerCase();
    if (BLOCKED_DESCRIPTION_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  }
  return false;
}

export class ITCService {
  /**
   * Fetch ITC ledger records for a client (optionally filtered to a period)
   */
  async getITCLedger(orgId: string, clientId: string, period?: string) {
    const where: any = { organizationId: orgId, clientId };
    if (period) where.period = period;

    const records = await ItcLedger.findAll({
      where,
      order: [['period', 'DESC']],
    });

    return records;
  }

  /**
   * Calculate eligible ITC for a client for a given GST period (YYYY-MM).
   * Reads from client_purchases table, applies Sec 17(5) blocking rules.
   */
  async calculateEligibleITC(orgId: string, clientId: string, period: string) {
    // Validate period format
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new AppError('Period must be in YYYY-MM format', 400);
    }

    // Fetch purchases for this client and period
    const purchases = await sequelize.query<PurchaseItcRow>(
      `SELECT
         id,
         hsn_sac_code,
         description,
         purchase_type,
         COALESCE(igst_amount, 0) as igst_amount,
         COALESCE(cgst_amount, 0) as cgst_amount,
         COALESCE(sgst_amount, 0) as sgst_amount,
         COALESCE(gst_amount, 0) as gst_amount,
         total_amount,
         itc_eligible,
         rcm_applicable
       FROM client_purchases
       WHERE client_id = :clientId
         AND organization_id = :orgId
         AND to_char(bill_date, 'YYYY-MM') = :period`,
      {
        replacements: { clientId, orgId, period },
        type: QueryTypes.SELECT,
      }
    );

    let igstClaimed = 0;
    let cgstClaimed = 0;
    let sgstClaimed = 0;
    let eligibleItc = 0;
    let ineligibleItc = 0;

    for (const p of purchases) {
      const { igst, cgst, sgst } = this.taxBreakup(p);
      const totalTax = igst + cgst + sgst;

      igstClaimed += igst;
      cgstClaimed += cgst;
      sgstClaimed += sgst;

      if (p.itc_eligible === false || isBlocked(p.hsn_sac_code, p.description)) {
        ineligibleItc += totalTax;
      } else {
        eligibleItc += totalTax;
      }
    }

    // Round to 2 decimal places
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const payload = {
      organizationId: orgId,
      clientId,
      period,
      igstClaimed: round2(igstClaimed),
      cgstClaimed: round2(cgstClaimed),
      sgstClaimed: round2(sgstClaimed),
      eligibleItc: round2(eligibleItc),
      ineligibleItc: round2(ineligibleItc),
      reversedItc: 0,
      source: 'manual' as const,
      status: 'calculated',
    };

    // Upsert into itc_ledger
    await ItcLedger.upsert(payload as any, {
      conflictFields: ['client_id', 'period'],
    } as any);

    return {
      ...payload,
      purchasesCount: purchases.length,
    };
  }

  private taxBreakup(purchase: PurchaseItcRow): { igst: number; cgst: number; sgst: number } {
    const explicitIgst = Number(purchase.igst_amount) || 0;
    const explicitCgst = Number(purchase.cgst_amount) || 0;
    const explicitSgst = Number(purchase.sgst_amount) || 0;

    if (explicitIgst || explicitCgst || explicitSgst) {
      return { igst: explicitIgst, cgst: explicitCgst, sgst: explicitSgst };
    }

    const gstAmount = Number(purchase.gst_amount) || 0;
    if (!gstAmount) return { igst: 0, cgst: 0, sgst: 0 };

    if ((purchase.purchase_type ?? '').toLowerCase() === 'interstate') {
      return { igst: gstAmount, cgst: 0, sgst: 0 };
    }

    const half = Math.round((gstAmount / 2) * 100) / 100;
    return { igst: 0, cgst: half, sgst: Math.round((gstAmount - half) * 100) / 100 };
  }
}
