import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { UserRole } from '../models';

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
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userRole = req.user.role as UserRole;

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
