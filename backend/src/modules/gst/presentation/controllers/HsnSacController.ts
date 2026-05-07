import { Response } from 'express';
import { HsnSacService } from '../../application/services/HsnSacService';
import { sendSuccess, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { AppError } from '../../../../utils/errors';

const hsnSacService = new HsnSacService();

export class HsnSacController {
  /** GET /gst/hsn-sac/search?q=&type=&rate=&page=&limit= */
  static search = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      q,
      type,
      rate,
      live,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const result = await hsnSacService.search({
      q: q?.trim(),
      type: type as 'HSN' | 'SAC' | undefined,
      rate: rate ? Number(rate) : undefined,
      live: live === 'true' || live === '1',
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });

    sendPaginated(res, result.codes, result.page, result.limit, result.total);
  });

  /** GET /gst/hsn-sac/:id */
  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = await hsnSacService.getById(req.params.id);
    sendSuccess(res, code);
  });

  /** POST /gst/hsn-sac/import */
  static importExcel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) throw new Error('No file uploaded');
    const result = await hsnSacService.importExcelFromBuffer(req.file.buffer);
    sendSuccess(res, result, `Imported ${result.succeeded} codes successfully`);
  });

  /** POST /gst/hsn-sac/lookup-online */
  static onlineLookup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.body;
    if (!code) throw new AppError('HSN/SAC code is required', 400);

    const result = await hsnSacService.lookupOnline(code);
    if (!result) throw new AppError('Code not found in public HSN/SAC directory', 404);

    sendSuccess(res, result, 'Public directory details fetched successfully');
  });

  /** POST /gst/hsn-sac/sync-live */
  static syncLive = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { codes } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
      throw new AppError('At least one HSN/SAC code is required for live sync', 400);
    }

    const result = await hsnSacService.syncLiveCodes(codes);
    sendSuccess(res, result, `Public directory sync completed: ${result.succeeded} updated`);
  });
}
