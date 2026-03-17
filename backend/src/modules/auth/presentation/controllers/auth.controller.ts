import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { AuthService } from '../../application/services/AuthService';
import { successResponse } from '../../../../shared/utils/response.util';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { User } from "../../../../models";
import { AuditLog } from '../../../../models/AuditLog.model';

export class AuthController {
  
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const authService = container.resolve(AuthService);
      const { mobile } = req.body;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      
      const result = await authService.sendOtp(mobile, 'login', ip);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const authService = container.resolve(AuthService);
      const { mobile, otp } = req.body;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      
      const result = await authService.verifyOtp(mobile, otp, ip);

      // 11. Write to audit_logs: action = 'auth.login'
      await AuditLog.create({
        organizationId: result.user.organizationId,
        entityType: 'AUTH',
        action: 'auth.login',
        description: `User ${mobile} logged in via OTP`,
        userId: result.user.id,
        ipAddress: ip
      });

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const authService = container.resolve(AuthService);
      const { mobile, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      
      const result = await authService.adminLogin(mobile, password, ip);

      // Audit log out of scope for pure app service
      await AuditLog.create({
        organizationId: result.user.organizationId,
        entityType: 'AUTH',
        action: 'auth.admin_login',
        description: `Admin ${mobile} logged in with password`,
        userId: result.user.id,
        ipAddress: ip
      });

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const authService = container.resolve(AuthService);
      const { refreshToken } = req.body;
      
      const result = await authService.refresh(refreshToken);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const authService = container.resolve(AuthService);
      const userId = req.user!.userId;
      
      const result = await authService.logout(userId);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const authService = container.resolve(AuthService);
      const userId = req.user!.userId;
      
      const result = await authService.me(userId);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
}
