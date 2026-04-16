import { sequelize } from '../../../../config/database.config';
import { Gstr2aReconciliation } from '../../../../models/gstr2a-reconciliation.model';
import { AppError } from '../../../../utils/errors';

interface Gstr2aEntry {
  supplierGstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxablePurchase: number;
  igst: number;
  cgst: number;
  sgst: number;
  period?: string; // YYYY-MM if available in JSON
}

interface PurchaseRecord {
  id: string;
  vendorGstin: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date;
  taxableAmount: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
}

type MatchResult = 'matched' | 'mismatched' | 'missing_in_books' | 'missing_in_2a';

const AMOUNT_TOLERANCE = 1; // ₹1 rounding tolerance

function amountsDiffer(a: number, b: number): boolean {
  return Math.abs(a - b) > AMOUNT_TOLERANCE;
}

export class GSTR2AReconciliationService {

  /**
   * Run reconciliation for a client+period and persist result.
   */
  async reconcile(
    orgId: string,
    clientId: string,
    period: string,
    gstr2aEntries: Gstr2aEntry[],
    userId: string
  ) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new AppError('Period must be in YYYY-MM format', 400);
    }

    // Fetch books purchases
    const [bookRows] = await sequelize.query<any>(
      `SELECT
         id,
         vendor_gstin as "vendorGstin",
         invoice_number as "invoiceNumber",
         invoice_date as "invoiceDate",
         coalesce(taxable_amount, total_amount) as "taxableAmount",
         coalesce(igst_amount, 0) as "igstAmount",
         coalesce(cgst_amount, 0) as "cgstAmount",
         coalesce(sgst_amount, 0) as "sgstAmount"
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

    const purchases: PurchaseRecord[] = bookRows;

    // Build lookup maps
    const booksMap = new Map<string, PurchaseRecord>();
    for (const p of purchases) {
      if (p.vendorGstin && p.invoiceNumber) {
        const key = `${p.vendorGstin.toUpperCase()}::${p.invoiceNumber.toUpperCase()}`;
        booksMap.set(key, p);
      }
    }

    const gstr2aMap = new Map<string, Gstr2aEntry>();
    for (const e of gstr2aEntries) {
      const key = `${e.supplierGstin.toUpperCase()}::${e.invoiceNumber.toUpperCase()}`;
      gstr2aMap.set(key, e);
    }

    const matched: any[] = [];
    const mismatched: any[] = [];
    const missingInBooks: any[] = [];
    const missingIn2a: any[] = [];

    // Check each GSTR-2A entry against books
    for (const [key, g2a] of gstr2aMap.entries()) {
      const book = booksMap.get(key);
      if (!book) {
        missingInBooks.push({
          supplierGstin: g2a.supplierGstin,
          invoiceNumber: g2a.invoiceNumber,
          invoiceDate: g2a.invoiceDate,
          taxablePurchase: g2a.taxablePurchase,
          igst: g2a.igst,
          cgst: g2a.cgst,
          sgst: g2a.sgst,
        });
      } else {
        const hasMismatch =
          amountsDiffer(g2a.taxablePurchase, book.taxableAmount) ||
          amountsDiffer(g2a.igst, book.igstAmount) ||
          amountsDiffer(g2a.cgst, book.cgstAmount) ||
          amountsDiffer(g2a.sgst, book.sgstAmount);

        const entry = {
          supplierGstin: g2a.supplierGstin,
          invoiceNumber: g2a.invoiceNumber,
          invoiceDate: g2a.invoiceDate,
          books: {
            taxableAmount: book.taxableAmount,
            igst: book.igstAmount,
            cgst: book.cgstAmount,
            sgst: book.sgstAmount,
          },
          gstr2a: {
            taxablePurchase: g2a.taxablePurchase,
            igst: g2a.igst,
            cgst: g2a.cgst,
            sgst: g2a.sgst,
          },
          booksPurchaseId: book.id,
        };

        if (hasMismatch) {
          mismatched.push({ ...entry, mismatchFields: this.getMismatchFields(g2a, book) });
        } else {
          matched.push(entry);
        }
      }
    }

    // Check books entries not in GSTR-2A
    for (const [key, book] of booksMap.entries()) {
      if (!gstr2aMap.has(key)) {
        missingIn2a.push({
          purchaseId: book.id,
          vendorGstin: book.vendorGstin,
          invoiceNumber: book.invoiceNumber,
          invoiceDate: book.invoiceDate,
          taxableAmount: book.taxableAmount,
          igst: book.igstAmount,
          cgst: book.cgstAmount,
          sgst: book.sgstAmount,
        });
      }
    }

    const snapshot = {
      organizationId: orgId,
      clientId,
      period,
      matched,
      mismatched,
      missingInBooks,
      missingIn2a,
      totalMatched: matched.length,
      totalMismatched: mismatched.length,
      totalMissingBooks: missingInBooks.length,
      totalMissing2a: missingIn2a.length,
      reconciledAt: new Date(),
      createdBy: userId,
    };

    // Upsert by org + client + period
    const existing = await Gstr2aReconciliation.findOne({ where: { organizationId: orgId, clientId, period } });
    if (existing) {
      await existing.update(snapshot as any);
      return existing;
    }

    return Gstr2aReconciliation.create(snapshot as any);
  }

  /**
   * Fetch most recent reconciliation snapshot (optionally filtered by period)
   */
  async getReconciliation(orgId: string, clientId: string, period?: string) {
    const where: any = { organizationId: orgId, clientId };
    if (period) where.period = period;

    const records = await Gstr2aReconciliation.findAll({
      where,
      order: [['period', 'DESC']],
      limit: period ? 1 : 12,
    });

    return records;
  }

  private getMismatchFields(g2a: Gstr2aEntry, book: PurchaseRecord): string[] {
    const fields: string[] = [];
    if (amountsDiffer(g2a.taxablePurchase, book.taxableAmount)) fields.push('taxableAmount');
    if (amountsDiffer(g2a.igst, book.igstAmount)) fields.push('igst');
    if (amountsDiffer(g2a.cgst, book.cgstAmount)) fields.push('cgst');
    if (amountsDiffer(g2a.sgst, book.sgstAmount)) fields.push('sgst');
    return fields;
  }
}
