import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.config';
import { AuthenticatedRequest, JwtPayload } from '../shared/types/auth.types';
import { errorResponse } from '../shared/utils/response.util';

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'No valid authorization header provided'));
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // Attach user to request
    req.user = decoded;
    
    // Validate organization payload
    if (!req.user.organizationId) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid token payload: missing organization context'));
      return;
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'Token expired'));
      return;
    }
    res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid token'));
  }
};
