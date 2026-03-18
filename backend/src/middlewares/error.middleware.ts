import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/auth.types';
import { errorResponse } from '../shared/utils/response.util';

export const errorHandler = (err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  console.error(`[Error] ${err.name}: ${err.message}`, err.stack);

  // Sequelize error handling can be expanded here if needed
  if (err.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json(errorResponse('CONFLICT', 'Resource already exists'));
    return;
  }

  const statusCode = (err as any).statusCode || 500;
  const errorCode = (err as any).errorCode || (statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR');
  const message = (err as any).isOperational || process.env.NODE_ENV === 'development'
    ? err.message 
    : 'An unexpected error occurred';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[DEV ERROR] ${err.name}: ${err.message}`, err.stack);
  }

  res.status(statusCode).json(errorResponse(errorCode, message));
};

export const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

