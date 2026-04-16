import { Op } from 'sequelize';
import { sequelize } from '../../../../config/database.config';
import { HsnSac } from '../../../../models/hsn-sac.model';
import { AppError } from '../../../../utils/errors';

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
  }) {
    const { q, type, rate, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const where: any = { isActive: true };

    if (type) where.type = type;
    if (rate !== undefined) where.gstRate = rate;

    if (q && q.trim()) {
      const term = q.trim();
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
}
