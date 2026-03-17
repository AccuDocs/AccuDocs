import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/auth.types';
import { errorResponse } from '../shared/utils/response.util';

export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    res.status(403).json(errorResponse('FORBIDDEN', 'Access denied: Admin role required'));
    return;
  }

  next();
};
