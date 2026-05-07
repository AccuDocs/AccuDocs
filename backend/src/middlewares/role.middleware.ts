import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { AuthenticatedRequest } from '../shared/types/auth.types';
export type UserRole = 'admin' | 'staff' | 'accountant' | 'client' | 'super_admin';

/**
 * Role-based access control middleware
 * Restricts access to specified roles
 */
export const requireRole = (...args: (UserRole | UserRole[])[]) => {
  const allowedRoles: UserRole[] = [];
  args.forEach(arg => {
    if (Array.isArray(arg)) {
      allowedRoles.push(...arg);
    } else {
      allowedRoles.push(arg);
    }
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authReq = req as unknown as AuthenticatedRequest;
      if (!authReq.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userRole = authReq.user.role as UserRole;

      // Admin always has access to everything
      if (userRole === 'admin' || userRole === 'super_admin') {
        return next();
      }

      if (!allowedRoles.includes(userRole)) {
        throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = requireRole('admin');

/**
 * Client only middleware
 */
export const clientOnly = requireRole('client');

/**
 * Admin or client middleware
 */
export const authenticated = requireRole('admin', 'client');
