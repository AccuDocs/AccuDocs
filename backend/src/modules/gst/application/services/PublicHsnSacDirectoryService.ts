import axios from 'axios';
import { logger } from '../../../../utils/logger';

type PublicDirectoryRow = {
  c: string;
  d: string;
  l?: string;
  t?: 'H' | 'S';
};

export type PublicHsnSacEntry = {
  code: string;
  description: string;
  type: 'HSN' | 'SAC';
  chapter: string | null;
  source: string;
};

export class PublicHsnSacDirectoryService {
  private readonly sourceUrl = process.env.HSN_SAC_PUBLIC_SOURCE_URL || 'https://hsn.codes/';
  private readonly cacheMs = Number(process.env.HSN_SAC_PUBLIC_CACHE_MS || 6 * 60 * 60 * 1000);
  private cache: { rows: PublicHsnSacEntry[]; expiresAt: number } | null = null;

  async lookup(query: string): Promise<PublicHsnSacEntry | null> {
    const term = String(query || '').trim();
    if (!term) return null;

    const rows = await this.getRows();
    const numericTerm = term.replace(/[^0-9]/g, '');

    if (/^\d{2,8}$/.test(numericTerm)) {
      const exact = rows.find((row) => row.code === numericTerm);
      if (exact) return exact;

      return rows
        .filter((row) => row.code.startsWith(numericTerm))
        .sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code))[0] ?? null;
    }

    const normalizedTerm = this.normalize(term);
    return rows.find((row) => this.normalize(row.description).includes(normalizedTerm)) ?? null;
  }

  async lookupMany(codes: string[]): Promise<Array<{ code: string; entry: PublicHsnSacEntry | null }>> {
    const rows = await this.getRows();
    const byCode = new Map(rows.map((row) => [row.code, row]));

    return codes.map((code) => {
      const normalized = String(code || '').replace(/[^0-9]/g, '');
      return {
        code: normalized,
        entry: byCode.get(normalized) ?? null,
      };
    });
  }

  private async getRows(): Promise<PublicHsnSacEntry[]> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.rows;
    }

    try {
      const response = await axios.get<string>(this.sourceUrl, {
        timeout: 20000,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'AccuDocs HSN/SAC directory cache/1.0',
        },
      });

      const rows = [
        ...this.parseConstArray(response.data, 'HSN').map((row) => this.mapRow(row, 'HSN')),
        ...this.parseConstArray(response.data, 'SAC').map((row) => this.mapRow(row, 'SAC')),
      ].filter((row): row is PublicHsnSacEntry => Boolean(row));

      if (rows.length === 0) {
        logger.warn('[HSN/SAC Public Directory] No rows parsed from public source');
        return this.cache?.rows ?? [];
      }

      this.cache = { rows, expiresAt: now + this.cacheMs };
      logger.info(`[HSN/SAC Public Directory] Cached ${rows.length} records from ${this.sourceUrl}`);
      return rows;
    } catch (error: any) {
      logger.warn('[HSN/SAC Public Directory] Lookup source unavailable:', error.response?.status || error.message);
      return this.cache?.rows ?? [];
    }
  }

  private parseConstArray(html: string, name: 'HSN' | 'SAC'): PublicDirectoryRow[] {
    const match = new RegExp(`const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);`).exec(html);
    if (!match) return [];

    try {
      const parsed = JSON.parse(match[1]) as PublicDirectoryRow[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error: any) {
      logger.warn(`[HSN/SAC Public Directory] Failed to parse ${name} data:`, error.message);
      return [];
    }
  }

  private mapRow(row: PublicDirectoryRow, fallbackType: 'HSN' | 'SAC'): PublicHsnSacEntry | null {
    const code = String(row.c || '').replace(/[^0-9]/g, '');
    const description = String(row.d || '').replace(/\s+/g, ' ').trim();
    if (!/^\d{2,8}$/.test(code) || !description) return null;

    return {
      code,
      description,
      type: row.t === 'S' || fallbackType === 'SAC' || code.startsWith('99') ? 'SAC' : 'HSN',
      chapter: code.substring(0, 2) || null,
      source: this.sourceUrl,
    };
  }

  private normalize(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
}
