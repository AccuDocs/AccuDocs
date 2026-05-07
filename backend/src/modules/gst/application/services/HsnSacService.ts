import { Op } from 'sequelize';
import { sequelize } from '../../../../config/database.config';
import { HsnSac } from '../../../../models/hsn-sac.model';
import { AppError } from '../../../../utils/errors';
import ExcelJS from 'exceljs';
import { SandboxService } from './SandboxService';

const sandboxService = new SandboxService();

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
  async bulkUpsert(entries: Array<{ code: string; description: string; gstRate: number; type: 'HSN' | 'SAC'; chapter?: string }>) {
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
   * Performs an online lookup via Sandbox API for a specific HSN/SAC code.
   * If found, the result is automatically cached (saved) to the local database.
   */
  async lookupOnline(code: string) {
    // 1. External Fetch
    const details = await sandboxService.getHsnDetails(code);
    if (!details) return null;

    // 2. Map Sandbox response to our schema
    // Sandbox typical data: { hsn_code, description, related_info, ... }
    const entry = {
      code: details.hsn_code || code,
      description: details.description || '',
      gstRate: 18.0, // Default if not provided by this endpoint
      type: (details.hsn_code || code).startsWith('99') ? 'SAC' as const : 'HSN' as const,
      chapter: details.hsn_code ? details.hsn_code.substring(0, 2) : null
    };

    // 3. Auto-Save to Local DB (so we have it for all clients forever)
    await this.bulkUpsert([entry]);

    return entry;
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

    const results = await Promise.all(
      uniqueCodes.map(async (code) => {
        try {
          const refreshed = await this.lookupOnline(code);
          return refreshed
            ? { code, status: 'updated' as const, description: refreshed.description }
            : { code, status: 'not_found' as const, message: 'Code not found in live records' };
        } catch (error: any) {
          return {
            code,
            status: 'failed' as const,
            message: error?.message || 'Live lookup failed',
          };
        }
      })
    );

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
      // Search must remain usable even when live-provider credentials are missing or down.
    }
  }
}
