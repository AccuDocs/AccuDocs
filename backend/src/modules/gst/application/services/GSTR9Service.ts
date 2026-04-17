import { injectable } from 'tsyringe';
import { Op } from 'sequelize';
import { GstReturn } from '../../../../models/gst-return.model';
import { ClientSale } from '../../../../models/client-sale.model';
import { ClientPurchase } from '../../../../models/client-purchase.model';
import { ItcLedger } from '../../../../models/itc-ledger.model';
import { Client } from '../../../../models/client.model';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../utils/errors';

/**
 * GSTR-9 Annual Return Service.
 * Aggregates data from GSTR-1 and GSTR-3B filings for the financial year.
 */
@injectable()
export class GSTR9Service {
  /**
   * Generate GSTR-9 annual return summary.
   */
  async generate(organizationId: string, clientId: string, financialYear: string) {
    const client = await Client.findOne({
      where: { id: clientId, organizationId },
    });
    if (!client) throw new AppError('Client not found', 404);

    // Parse financial year (e.g., "2024-25" → April 2024 to March 2025)
    const startYear = parseInt(financialYear.split('-')[0]);
    const months = this.getFinancialYearMonths(startYear);

    // Fetch all GSTR-1 and GSTR-3B filings for the year
    const gstReturns = await GstReturn.findAll({
      where: {
        clientId,
        organizationId,
        financialYear,
        status: { [Op.in]: ['draft', 'filed'] },
      },
    });

    // Fetch sales and purchases for the year
    const sales = await ClientSale.findAll({
      where: {
        clientId,
        organizationId,
        financialYear,
        status: { [Op.ne]: 'cancelled' },
      },
    });

    const purchases = await ClientPurchase.findAll({
      where: {
        clientId,
        organizationId,
        financialYear,
        status: { [Op.ne]: 'cancelled' },
      },
    });

    // Fetch ITC ledger entries
    const itcEntries = await ItcLedger.findAll({
      where: {
        clientId,
        period: { [Op.like]: `${startYear}%` },
      },
    });

    // ─── Table 4: B2B Outward Supplies ────────────────────────────────────────
    const b2bSales = sales.filter((s: any) => s.gstin && s.gstin.length === 15);
    const table4 = {
      title: 'Table 4 — Details of Advances, Inward & Outward Supplies on which tax is payable',
      b2b: {
        label: '4A — Supplies made to registered persons (B2B)',
        count: b2bSales.length,
        taxableValue: this.sumField(b2bSales, 'baseAmount'),
        igst: this.sumField(b2bSales, 'igstAmount'),
        cgst: this.sumField(b2bSales, 'cgstAmount'),
        sgst: this.sumField(b2bSales, 'sgstAmount'),
        cess: 0,
      },
    };

    // ─── Table 5: B2C Outward Supplies ────────────────────────────────────────
    const b2cSales = sales.filter((s: any) => !s.gstin || s.gstin.length !== 15);
    const table5 = {
      title: 'Table 5 — Details of Outward Supplies on which tax is not payable',
      b2c: {
        label: '5A — Supplies made to unregistered persons (B2C)',
        count: b2cSales.length,
        taxableValue: this.sumField(b2cSales, 'baseAmount'),
        igst: this.sumField(b2cSales, 'igstAmount'),
        cgst: this.sumField(b2cSales, 'cgstAmount'),
        sgst: this.sumField(b2cSales, 'sgstAmount'),
        cess: 0,
      },
    };

    // ─── Table 6: ITC Availed ────────────────────────────────────────────────
    const totalEligibleItc = itcEntries.reduce((sum: number, e: any) => sum + Number(e.eligibleItc || 0), 0);
    const table6 = {
      title: 'Table 6 — Details of ITC availed during the financial year',
      totalItcAvailed: {
        label: '6A — Total ITC availed',
        igst: itcEntries.reduce((sum: number, e: any) => sum + Number(e.igstClaimed || 0), 0),
        cgst: itcEntries.reduce((sum: number, e: any) => sum + Number(e.cgstClaimed || 0), 0),
        sgst: itcEntries.reduce((sum: number, e: any) => sum + Number(e.sgstClaimed || 0), 0),
        total: totalEligibleItc,
      },
      itcFromPurchases: {
        label: '6B — ITC from purchases',
        count: purchases.length,
        taxableValue: this.sumField(purchases, 'baseAmount'),
        igst: this.sumField(purchases, 'igstAmount'),
        cgst: this.sumField(purchases, 'cgstAmount'),
        sgst: this.sumField(purchases, 'sgstAmount'),
      },
    };

    // ─── Table 7: ITC Reversed ───────────────────────────────────────────────
    const totalReversedItc = itcEntries.reduce((sum: number, e: any) => sum + Number(e.reversedItc || 0), 0);
    const totalIneligibleItc = itcEntries.reduce((sum: number, e: any) => sum + Number(e.ineligibleItc || 0), 0);
    const table7 = {
      title: 'Table 7 — Details of ITC reversed and ineligible ITC',
      reversed: {
        label: '7A — ITC reversed as per rules',
        amount: totalReversedItc,
      },
      ineligible: {
        label: '7B — ITC ineligible under Section 17(5)',
        amount: totalIneligibleItc,
      },
      totalReversed: totalReversedItc + totalIneligibleItc,
    };

    // ─── Table 9: Tax Paid Declaration ───────────────────────────────────────
    const totalCgst = this.sumField(sales, 'cgstAmount');
    const totalSgst = this.sumField(sales, 'sgstAmount');
    const totalIgst = this.sumField(sales, 'igstAmount');
    const totalTax = totalCgst + totalSgst + totalIgst;

    const table9 = {
      title: 'Table 9 — Details of tax paid as declared in returns filed during the financial year',
      taxPayable: {
        igst: totalIgst,
        cgst: totalCgst,
        sgst: totalSgst,
        cess: 0,
        total: totalTax,
      },
      taxPaidThroughCash: {
        igst: Math.max(0, totalIgst - totalEligibleItc),
        cgst: totalCgst,
        sgst: totalSgst,
        cess: 0,
      },
      taxPaidThroughItc: {
        igst: Math.min(totalIgst, totalEligibleItc),
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
    };

    // ─── Summary ─────────────────────────────────────────────────────────────
    const summary = {
      clientId,
      clientName: client.name,
      clientGstin: client.gstin,
      financialYear,
      generatedAt: new Date(),
      totalOutwardSupplies: this.sumField(sales, 'baseAmount'),
      totalInwardSupplies: this.sumField(purchases, 'baseAmount'),
      totalTaxLiability: totalTax,
      totalItcAvailed: totalEligibleItc,
      netTaxPayable: Math.max(0, totalTax - totalEligibleItc),
      returnsFiled: gstReturns.filter((r) => r.status === 'filed').length,
      returnsDraft: gstReturns.filter((r) => r.status === 'draft').length,
    };

    const result = {
      summary,
      table4,
      table5,
      table6,
      table7,
      table9,
      // GSTN compatible JSON output
      gstnSchema: {
        gstin: client.gstin,
        fp: financialYear,
        table4: table4,
        table5: table5,
        table6: table6,
        table7: table7,
        table9: table9,
      },
    };

    logger.info(`GSTR-9 generated for client ${clientId}, FY ${financialYear}`);
    return result;
  }

  /**
   * Get financial year months (April to March).
   */
  private getFinancialYearMonths(startYear: number): { month: number; year: number }[] {
    const months = [];
    for (let m = 4; m <= 12; m++) months.push({ month: m, year: startYear });
    for (let m = 1; m <= 3; m++) months.push({ month: m, year: startYear + 1 });
    return months;
  }

  /**
   * Sum a numeric field across records.
   */
  private sumField(records: any[], field: string): number {
    return Math.round(
      records.reduce((sum, r) => {
        const raw = r.toJSON ? r.toJSON() : r;
        return sum + Number(raw[field] || raw[this.toSnakeCase(field)] || 0);
      }, 0) * 100
    ) / 100;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}
