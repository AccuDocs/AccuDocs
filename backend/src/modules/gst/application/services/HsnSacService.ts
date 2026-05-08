import { Op } from 'sequelize';
import { sequelize } from '../../../../config/database.config';
import { HsnSac } from '../../../../models/hsn-sac.model';
import { AppError } from '../../../../utils/errors';
import * as XLSX from 'xlsx';
import { PublicHsnSacDirectoryService, PublicHsnSacEntry } from './PublicHsnSacDirectoryService';

const publicDirectoryService = new PublicHsnSacDirectoryService();

type ImportEntry = {
  code: string;
  description: string;
  gstRate: number;
  type: 'HSN' | 'SAC';
  chapter?: string | null;
  isActive?: boolean;
};

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
  async bulkUpsert(entries: ImportEntry[]) {
    const results = await Promise.allSettled(
      entries.map((entry) =>
        sequelize.query(
          `INSERT INTO hsn_sac_codes (id, code, description, gst_rate, type, chapter, is_active)
           VALUES (gen_random_uuid(), :code, :description, :gstRate, :type, :chapter, :isActive)
           ON CONFLICT (code, type) DO UPDATE
             SET description = EXCLUDED.description,
                 gst_rate    = EXCLUDED.gst_rate,
                 chapter     = EXCLUDED.chapter,
                 is_active   = EXCLUDED.is_active`,
          {
            replacements: {
              code: entry.code,
              description: entry.description,
              gstRate: entry.gstRate,
              type: entry.type,
              chapter: entry.chapter ?? null,
              isActive: entry.isActive ?? true,
            },
          }
        )
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    return { succeeded, failed: results.length - succeeded };
  }

  async importExcelFromBuffer(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Array<string | number>>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    const headerRowIndex = rows.findIndex((row) => {
      const normalized = row.map((value) => this.normalizeHeader(value));
      return normalized.some((key) => key.includes('code') || key.includes('hsn') || key.includes('sac'))
        && normalized.some((key) => key.includes('description'));
    });

    if (headerRowIndex === -1) {
      throw new AppError('Invalid import format: could not find header row with Code and Description columns', 400);
    }

    const headerRow = rows[headerRowIndex];
    const headers = new Map<string, number>();
    headerRow.forEach((value, index) => {
      const key = this.normalizeHeader(value);
      if (key) headers.set(key, index);
    });

    const findColumn = (...keywords: string[]) => {
      for (const [key, index] of headers.entries()) {
        if (keywords.some((keyword) => key.includes(keyword))) {
          return index;
        }
      }
      return -1;
    };

    const codeCol = findColumn('code', 'hsn', 'sac');
    const descCol = findColumn('description', 'item', 'nature');
    const typeCol = findColumn('type');
    const rateCol = findColumn('gstrate', 'rate', 'tax');
    const chapterCol = findColumn('chapter', 'group');
    const statusCol = findColumn('status', 'active');
    const directoryCol = findColumn('directory');

    if (codeCol === -1 || descCol === -1) {
      throw new AppError('Invalid import format: could not find "Code" or "Description" columns', 400);
    }

    const entries: ImportEntry[] = [];

    rows.slice(headerRowIndex + 1).forEach((row) => {
      const codeRaw = this.readCell(row, codeCol);
      const description = this.readCell(row, descCol);
      const code = codeRaw.replace(/[^0-9]/g, '');

      if (!code || !description) return;

      const typeValue = this.readCell(row, typeCol);
      const directoryValue = this.readCell(row, directoryCol);
      const statusValue = this.readCell(row, statusCol);
      const chapterValue = this.readCell(row, chapterCol);
      const parsedRate = this.parseRate(this.readCell(row, rateCol));

      entries.push({
        code,
        description,
        gstRate: parsedRate,
        type: this.resolveType(code, typeValue, directoryValue),
        chapter: chapterValue || code.slice(0, 2) || null,
        isActive: this.parseStatus(statusValue),
      });
    });

    if (entries.length === 0) throw new AppError('No valid rows found in the uploaded file', 400);
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

  private normalizeHeader(value: unknown) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  private readCell(row: Array<string | number>, index: number) {
    if (index < 0 || index >= row.length) return '';
    return String(row[index] ?? '').trim();
  }

  private parseRate(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return 0;

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private resolveType(code: string, typeValue: string, directoryValue: string): 'HSN' | 'SAC' {
    const source = `${typeValue} ${directoryValue}`.toLowerCase();

    if (source.includes('sac') || source.includes('service')) return 'SAC';
    if (source.includes('hsn') || source.includes('good')) return 'HSN';

    return code.startsWith('99') ? 'SAC' : 'HSN';
  }

  private parseStatus(statusValue: string) {
    if (!statusValue) return true;

    const normalized = statusValue.trim().toLowerCase();
    if (['inactive', 'disabled', 'false', '0'].includes(normalized)) return false;
    return true;
  }
}
