import { injectable } from 'tsyringe';
import { Op } from 'sequelize';
import { TdsEntry } from '../../../../models/tds-entry.model';
import { TcsEntry } from '../../../../models/tcs-entry.model';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../utils/errors';

// TDS Sections Master Data
const TDS_SECTIONS: Record<string, { rate_individual: number; rate_other: number; description: string }> = {
  '194C': { rate_individual: 1, rate_other: 2, description: 'Payment to Contractor' },
  '194J': { rate_individual: 10, rate_other: 10, description: 'Professional / Technical Fees' },
  '194H': { rate_individual: 5, rate_other: 5, description: 'Commission / Brokerage' },
  '194I': { rate_individual: 10, rate_other: 10, description: 'Rent' },
  '194A': { rate_individual: 10, rate_other: 10, description: 'Interest (other than on securities)' },
  '194B': { rate_individual: 30, rate_other: 30, description: 'Lottery / Crossword Puzzle' },
  '194D': { rate_individual: 5, rate_other: 10, description: 'Insurance Commission' },
  '194E': { rate_individual: 20, rate_other: 20, description: 'Payments to Non-Resident Sportsmen' },
  '194G': { rate_individual: 5, rate_other: 5, description: 'Commission on Sale of Lottery Tickets' },
  '194IA': { rate_individual: 1, rate_other: 1, description: 'Transfer of Immovable Property' },
  '194IB': { rate_individual: 5, rate_other: 5, description: 'Rent by Individual/HUF' },
  '194IC': { rate_individual: 10, rate_other: 10, description: 'Joint Development Agreement' },
  '194N': { rate_individual: 2, rate_other: 2, description: 'Cash Withdrawal' },
  '194O': { rate_individual: 1, rate_other: 1, description: 'E-commerce Operator' },
  '194Q': { rate_individual: 0.1, rate_other: 0.1, description: 'Purchase of Goods' },
};

@injectable()
export class TDSTCSService {
  // ─── TDS Sections Master ────────────────────────────────────────────────────

  /**
   * Get all TDS sections with rates.
   */
  getSections() {
    return Object.entries(TDS_SECTIONS).map(([section, data]) => ({
      section,
      ...data,
    }));
  }

  /**
   * Calculate TDS for a given amount and section.
   */
  calculateTDS(amount: number, section: string, isIndividual: boolean = true) {
    const sectionData = TDS_SECTIONS[section];
    if (!sectionData) throw new AppError(`Unknown TDS section: ${section}`, 400);

    const rate = isIndividual ? sectionData.rate_individual : sectionData.rate_other;
    const tdsAmount = Math.round(amount * rate) / 100;

    return {
      section,
      description: sectionData.description,
      rate,
      amount,
      tdsAmount,
    };
  }

  // ─── TDS CRUD ───────────────────────────────────────────────────────────────

  async createTDS(organizationId: string, userId: string, data: any) {
    const calculated = this.calculateTDS(data.amount, data.section, data.isIndividual !== false);

    const entry = await TdsEntry.create({
      organizationId,
      clientId: data.clientId,
      deductor: data.deductor,
      pan: data.pan,
      section: data.section,
      paymentNature: calculated.description,
      amount: data.amount,
      tdsRate: calculated.rate,
      tdsAmount: data.tdsAmount ?? calculated.tdsAmount,
      period: data.period,
      challanNo: data.challanNo || null,
      status: data.status || 'pending',
      deductionDate: data.deductionDate || null,
      depositDate: data.depositDate || null,
      remarks: data.remarks || null,
      createdBy: userId,
    } as any);

    return entry;
  }

  async listTDS(organizationId: string, filters: {
    clientId?: string;
    period?: string;
    section?: string;
    status?: string;
  } = {}) {
    const where: any = { organizationId };
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.period) where.period = filters.period;
    if (filters.section) where.section = filters.section;
    if (filters.status) where.status = filters.status;

    return await TdsEntry.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
  }

  async updateTDS(organizationId: string, id: string, data: any) {
    const entry = await TdsEntry.findOne({ where: { id, organizationId } });
    if (!entry) throw new AppError('TDS entry not found', 404);

    // Recalculate if amount or section changed
    if (data.amount !== undefined || data.section !== undefined) {
      const amount = data.amount ?? Number(entry.amount);
      const section = data.section ?? entry.section;
      const calculated = this.calculateTDS(amount, section);
      data.tdsRate = calculated.rate;
      data.tdsAmount = data.tdsAmount ?? calculated.tdsAmount;
      data.paymentNature = calculated.description;
    }

    await entry.update(data);
    return entry;
  }

  async deleteTDS(organizationId: string, id: string) {
    const entry = await TdsEntry.findOne({ where: { id, organizationId } });
    if (!entry) throw new AppError('TDS entry not found', 404);
    await entry.destroy();
  }

  // ─── TCS CRUD ──────────────────────────────────────────────────────────────

  async createTCS(organizationId: string, userId: string, data: any) {
    const tcsAmount = Math.round(data.transactionValue * data.tcsRate) / 100;

    const entry = await TcsEntry.create({
      organizationId,
      sellerGstin: data.sellerGstin,
      buyerGstin: data.buyerGstin,
      transactionValue: data.transactionValue,
      tcsRate: data.tcsRate,
      tcsAmount: data.tcsAmount ?? tcsAmount,
      period: data.period,
      collectionDate: data.collectionDate || null,
      remarks: data.remarks || null,
      createdBy: userId,
    } as any);

    return entry;
  }

  async listTCS(organizationId: string, filters: {
    period?: string;
    sellerGstin?: string;
  } = {}) {
    const where: any = { organizationId };
    if (filters.period) where.period = filters.period;
    if (filters.sellerGstin) where.sellerGstin = filters.sellerGstin;

    return await TcsEntry.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
  }

  async updateTCS(organizationId: string, id: string, data: any) {
    const entry = await TcsEntry.findOne({ where: { id, organizationId } });
    if (!entry) throw new AppError('TCS entry not found', 404);

    if (data.transactionValue !== undefined || data.tcsRate !== undefined) {
      const value = data.transactionValue ?? Number(entry.transactionValue);
      const rate = data.tcsRate ?? Number(entry.tcsRate);
      data.tcsAmount = data.tcsAmount ?? Math.round(value * rate) / 100;
    }

    await entry.update(data);
    return entry;
  }

  async deleteTCS(organizationId: string, id: string) {
    const entry = await TcsEntry.findOne({ where: { id, organizationId } });
    if (!entry) throw new AppError('TCS entry not found', 404);
    await entry.destroy();
  }

  // ─── Form 26AS-Style Summary ────────────────────────────────────────────────

  /**
   * Generate Form 26AS-style summary for a client per financial year.
   */
  async getForm26ASSummary(organizationId: string, clientId: string, financialYear: string) {
    const tdsEntries = await TdsEntry.findAll({
      where: {
        organizationId,
        clientId,
        period: { [Op.like]: `${financialYear}%` },
      },
      order: [['deduction_date', 'ASC'], ['created_at', 'ASC']],
    });

    // Group by section
    const sectionWise: Record<string, {
      section: string;
      description: string;
      entries: any[];
      totalAmount: number;
      totalTds: number;
    }> = {};

    for (const entry of tdsEntries) {
      if (!sectionWise[entry.section]) {
        const sectionData = TDS_SECTIONS[entry.section];
        sectionWise[entry.section] = {
          section: entry.section,
          description: sectionData?.description || entry.paymentNature,
          entries: [],
          totalAmount: 0,
          totalTds: 0,
        };
      }

      sectionWise[entry.section].entries.push({
        id: entry.id,
        deductor: entry.deductor,
        pan: entry.pan,
        amount: Number(entry.amount),
        tdsRate: Number(entry.tdsRate),
        tdsAmount: Number(entry.tdsAmount),
        deductionDate: entry.deductionDate,
        challanNo: entry.challanNo,
        status: entry.status,
      });

      sectionWise[entry.section].totalAmount += Number(entry.amount);
      sectionWise[entry.section].totalTds += Number(entry.tdsAmount);
    }

    const sections = Object.values(sectionWise);
    const grandTotalAmount = sections.reduce((sum, s) => sum + s.totalAmount, 0);
    const grandTotalTds = sections.reduce((sum, s) => sum + s.totalTds, 0);

    return {
      clientId,
      financialYear,
      sections,
      grandTotalAmount: Math.round(grandTotalAmount * 100) / 100,
      grandTotalTds: Math.round(grandTotalTds * 100) / 100,
      totalEntries: tdsEntries.length,
      generatedAt: new Date(),
    };
  }
}
