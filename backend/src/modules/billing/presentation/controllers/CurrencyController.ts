import { Response } from 'express';
import { container } from 'tsyringe';
import { CurrencyService } from '../../application/services/CurrencyService';
import { sendSuccess } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class CurrencyController {
  static getRates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(CurrencyService);
    const result = await service.getSupportedCurrencies();
    sendSuccess(res, result);
  });
}
