import { Op } from 'sequelize';
import { sequelize } from '../../../../config/database.config';
import { HsnSac } from '../../../../models/hsn-sac.model';
import { AppError } from '../../../../utils/errors';
import ExcelJS from 'exceljs';
import { PublicHsnSacDirectoryService, PublicHsnSacEntry } from './PublicHsnSacDirectoryService';

const publicDirectoryService = new PublicHsnSacDirectoryService();

export class HsnSacService {
  /**
   * Search HSN/SAC codes — supports autocomplete.
   * q: search string matched against code prefix or description (iLike)
   * type: 'HSN' | 'SAC' filter
   * rate: GST rate filter (exact match)
   * page, limit: pagination
   */
  async search(params: {
    q?: string;
    type?: 'HSN' | 'SAC';
    rate?: number;
    page?: number;
    limit?: number;
    live?: boolean;
  }) {
    const { q, type, rate, page = 1, limit = 20, live = false } = params;
    const offset = (page - 1) * limit;

    const where: any = { isActive: true };

    if (type) where.type = type;
    if (rate !== undefined) where.gstRate = rate;

    if (q && q.trim()) {
      const term = q.trim();
      if (live && /^\d{4,8}$/.test(term)) {
        await this.lookupOnlineSafely(term);
      }

      where[Op.or] = [
        { code: { [Op.iLike]: `${term}%` } },
        { description: { [Op.iLike]: `%${term}%` } },
      ];
    }

    const { rows, count } = await HsnSac.findAndCountAll({
      where,
      order: [
        ['type', 'ASC'],
        ['code', 'ASC'],
      ],
      limit,
      offset,
    });

    return {
      codes: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getById(id: string) {
    const code = await HsnSac.findByPk(id);
    if (!code) throw new AppError('HSN/SAC code not found', 404);
    return code;
  }

  /**
   * Bulk upsert — used by the data import module or admin seeding.
   */
  async bulkUpsert(entries: Array<{ code: string; description: string; gstRate: number; type: 'HSN' | 'SAC'; chapter?: string | null }>) {
    const results = await Promise.allSettled(
      entries.map((entry) =>
        sequelize.query(
          `INSERT INTO hsn_sac_codes (id, code, description, gst_rate, type, chapter, is_active)
           VALUES (gen_random_uuid(), :code, :description, :gstRate, :type, :chapter, TRUE)
           ON CONFLICT (code, type) DO UPDATE
             SET description = EXCLUDED.description,
                 gst_rate    = EXCLUDED.gst_rate,
                 chapter     = EXCLUDED.chapter`,
          {
            replacements: {
              code: entry.code,
              description: entry.description,
              gstRate: entry.gstRate,
              type: entry.type,
              chapter: entry.chapter ?? null,
            },
          }
        )
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    return { succeeded, failed: results.length - succeeded };
  }

  async importExcelFromBuffer(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0]; 

    const entries: any[] = [];
    let headers: Record<string, number> = {};

    for (let r = 1; r <= 5; r++) {
      const row = worksheet.getRow(r);
      const rowValues = row.values as any[];
      if (!rowValues) continue;

      const keys = rowValues.map(v => String(v || '').toLowerCase().trim());
      if (keys.some(k => k.includes('hsn') || k.includes('code') || k.includes('description'))) {
        keys.forEach((k, i) => { if (k) headers[k] = i; });
        break;
      }
    }

    const getCol = (keywords: string[]) => {
      for (const [key, index] of Object.entries(headers)) {
        if (keywords.some(kw => key.includes(kw))) return index;
      }
      return -1;
    };

    const codeCol = getCol(['hsn', 'sac', 'code']);
    const descCol = getCol(['description', 'item', 'nature']);
    const rateCol = getCol(['rate', 'gst', 'tax']);
    const chapterCol = getCol(['chapter', 'group']);

    if (codeCol === -1 || descCol === -1) {
      throw new AppError('Invalid Excel format: Could not find "Code" or "Description" columns', 400);
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return;
      const rowValues = row.values as any[];
      if (!rowValues) return;

      const codeValue = String(rowValues[codeCol] || '').trim();
      const descValue = String(rowValues[descCol] || '').trim();
      const rateValue = parseFloat(rowValues[rateCol]) || 18.00;
      const chapterValue = chapterCol !== -1 ? String(rowValues[chapterCol] || '').trim() : codeValue.substring(0, 2);

      if (codeValue && descValue) {
        entries.push({
          code: codeValue.replace(/[^0-9]/g, ''),
          description: descValue,
          gstRate: rateValue,
          type: codeValue.startsWith('99') ? 'SAC' : 'HSN',
          chapter: chapterValue
        });
      }
    });

    if (entries.length === 0) throw new AppError('No valid data found in Excel', 400);
    return this.bulkUpsert(entries);
  }

  /**
   * Performs a public-directory lookup and caches the result locally.
   * The free source provides HSN/SAC code and description data, not authoritative
   * tax rates. Existing DB rates are preserved; new rows are marked at 0% until
   * reviewed/imported by the firm.
   */
  async lookupOnline(query: string) {
    const publicEntry = await publicDirectoryService.lookup(query);
    if (!publicEntry) return null;

    return this.savePublicEntry(publicEntry);
  }

  /**
   * Refreshes a small set of visible/search-result codes from the configured live provider.
   * Full-directory sync is intentionally not attempted here because GSTN/Sandbox exposes
   * lookup-style access, not a stable public bulk feed.
   */
  async syncLiveCodes(codes: string[]) {
    const uniqueCodes = [...new Set(
      codes
        .map((code) => String(code || '').replace(/[^0-9]/g, ''))
        .filter((code) => /^\d{4,8}$/.test(code))
    )].slice(0, 50);

    const lookups = await publicDirectoryService.lookupMany(uniqueCodes);
    const results = [];

    for (const lookup of lookups) {
      try {
        if (!lookup.entry) {
          results.push({
            code: lookup.code,
            status: 'not_found' as const,
            message: 'Code not found in public HSN/SAC directory',
          });
          continue;
        }

        const refreshed = await this.savePublicEntry(lookup.entry);
        results.push({
          code: lookup.code,
          status: 'updated' as const,
          description: refreshed.description,
        });
      } catch (error: any) {
        results.push({
          code: lookup.code,
          status: 'failed' as const,
          message: error?.message || 'Public directory sync failed',
        });
      }
    }

    return {
      requested: codes.length,
      processed: uniqueCodes.length,
      succeeded: results.filter((result) => result.status === 'updated').length,
      failed: results.filter((result) => result.status === 'failed').length,
      notFound: results.filter((result) => result.status === 'not_found').length,
      refreshedAt: new Date().toISOString(),
      results,
    };
  }

  private async lookupOnlineSafely(code: string) {
    try {
      await this.lookupOnline(code);
    } catch {
      // Search must remain usable even when the public directory is unreachable.
    }
  }

  private async savePublicEntry(publicEntry: PublicHsnSacEntry) {
    const existing = await HsnSac.findOne({
      where: {
        code: publicEntry.code,
        type: publicEntry.type,
      },
    });

    const entry = {
      code: publicEntry.code,
      description: publicEntry.description,
      gstRate: existing ? Number(existing.gstRate) : 0,
      type: publicEntry.type,
      chapter: publicEntry.chapter,
    };

    await this.bulkUpsert([entry]);
    return entry;
  }
}
