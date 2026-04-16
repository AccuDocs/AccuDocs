import { sequelize } from '../../../../config/database.config';
import { ItcLedger } from '../../../../models/itc-ledger.model';
import { AppError } from '../../../../utils/errors';

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
    const [purchases] = await sequelize.query<any>(
      `SELECT
         id,
         hsn_code,
         description,
         igst_amount,
         cgst_amount,
         sgst_amount,
         total_amount,
         is_rcm
       FROM client_purchases
       WHERE client_id = :clientId
         AND organization_id = :orgId
         AND to_char(invoice_date, 'YYYY-MM') = :period
         AND deleted_at IS NULL`,
      {
        replacements: { clientId, orgId, period },
        type: 'SELECT' as any,
      }
    );

    let igstClaimed = 0;
    let cgstClaimed = 0;
    let sgstClaimed = 0;
    let eligibleItc = 0;
    let ineligibleItc = 0;

    for (const p of purchases) {
      const igst = Number(p.igst_amount) || 0;
      const cgst = Number(p.cgst_amount) || 0;
      const sgst = Number(p.sgst_amount) || 0;
      const totalTax = igst + cgst + sgst;

      igstClaimed += igst;
      cgstClaimed += cgst;
      sgstClaimed += sgst;

      if (isBlocked(p.hsn_code, p.description)) {
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
}
