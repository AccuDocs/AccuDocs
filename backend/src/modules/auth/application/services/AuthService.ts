import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IOtpRepository } from '../../domain/repositories/IOtpRepository';
import { Otp } from "../../domain/entities/Otp";
import { config } from '../../../../config/env.config';
import { AppError } from '../../../../utils/errors';
import { redisHelpers } from '../../../../config/redis.config';
import { WhatsAppServiceAdapter } from '../../../notifications/infrastructure/WhatsAppServiceAdapter';

@injectable()
export class AuthService {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('IOtpRepository') private otpRepository: IOtpRepository
  ) {}

  async sendOtp(mobile: string, purpose: 'login' | 'verify' | 'reset', ipAddress: string) {
    // 1. Check rate limit in Redis (3 OTPs per 10 mins)
    const attempts = await redisHelpers.incrementOTPAttempts(mobile);
    if (attempts > 3) {
      throw new AppError('Too many OTP requests. Please try again after 10 minutes.', 429, 'RATE_LIMIT');
    }

    // 2. Generate 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Hash with bcrypt
    const otpHash = await bcrypt.hash(rawOtp, 10);

    // 4. Delete existing unused OTPs
    await this.otpRepository.deleteUnusedForMobile(mobile);

    // 5. Insert new OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const props = {
      mobile,
      otpHash,
      purpose,
      expiresAt,
      attempts: 0,
      isUsed: false,
      ipAddress
    };
    const otpResult = Otp.create(props, uuidv4());
    if (otpResult.isFailure) throw new AppError(otpResult.getError() as string, 500);
    const otp = otpResult.getValue();

    await this.otpRepository.save(otp);

    // 6. Send via WhatsApp
    try {
      if (config.whatsapp.enabled) {
        const waAdapter = new WhatsAppServiceAdapter();
        await waAdapter.sendOTP(mobile, rawOtp);
      } else {
        console.log(`[DEV MODE] OTP for ${mobile}: ${rawOtp}`);
      }
    } catch (err) {
      console.error('Failed to send WhatsApp message', err);
    }

    // 7. Return safe message
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(mobile: string, otpInput: string, ipAddress: string) {
    // 1. Find latest unused, unexpired OTP
    const otp = await this.otpRepository.findLatestUnused(mobile);
    if (!otp) {
      throw new AppError('OTP expired or invalid', 401, 'UNAUTHORIZED');
    }

    // 3. Increment attempts
    const attempts = await this.otpRepository.incrementAttempts(otp.id);
    if (attempts > 3) {
      await this.otpRepository.markAsUsed(otp.id);
      throw new AppError('Too many failed attempts. OTP invalidated.', 401, 'UNAUTHORIZED');
    }

    // 4. Verify bcrypt hash
    const isValid = await bcrypt.compare(otpInput, otp.otpHash);
    if (!isValid) {
      throw new AppError('Invalid OTP', 401, 'UNAUTHORIZED');
    }

    // 6. Mark as used
    await this.otpRepository.markAsUsed(otp.id);

    // 7. Find user by mobile
    // Using simply the first attached user (extend if multi-org login is added later)
    const user = await this.userRepository.findByMobileAndOrg(mobile);
    if (!user) {
      throw new AppError('User not registered in the system', 404, 'NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 403, 'FORBIDDEN');
    }

    // 8. Update last login
    await this.userRepository.updateLastLogin(user.id, new Date());

    // 9. Generate access & refresh tokens
    const payload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      mobile: user.mobile
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn as any });

    // 10. Store refresh token in Redis
    const refreshExpirySeconds = 30 * 24 * 60 * 60; // 30 days
    await redisHelpers.setRefreshToken(user.id, refreshToken, refreshExpirySeconds);

    // 11. Write to audit_logs (Handled by presentation layer or middleware if mutating, but here we can just log manually since GET/login isn't always mutated in the typical way)
    // For now we'll rely on the result being returned.

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        organizationId: user.organizationId
      }
    };
  }

  async adminLogin(mobile: string, passwordInput: string, ipAddress: string) {
    const users = await this.userRepository.findByMobile(mobile);
    if (!users || users.length === 0) {
      throw new AppError('Invalid mobile or password', 401, 'UNAUTHORIZED');
    }

    const user = users[0];
    
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new AppError('Access denied: Admins only', 403, 'FORBIDDEN');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 403, 'FORBIDDEN');
    }

    if (!user.password) {
      throw new AppError('Password not set for this account', 401, 'UNAUTHORIZED');
    }

    const isValid = await bcrypt.compare(passwordInput, user.password);
    if (!isValid) {
      throw new AppError('Invalid mobile or password', 401, 'UNAUTHORIZED');
    }

    await this.userRepository.updateLastLogin(user.id, new Date());

    const payload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      mobile: user.mobile
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn as any });

    const refreshExpirySeconds = 30 * 24 * 60 * 60; // 30 days
    await redisHelpers.setRefreshToken(user.id, refreshToken, refreshExpirySeconds);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        organizationId: user.organizationId
      }
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };
      
      const storedToken = await redisHelpers.getRefreshToken(decoded.userId);
      if (storedToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
      }

      const user = await this.userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401, 'UNAUTHORIZED');
      }

      const payload = {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        mobile: user.mobile
      };

      const newAccessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
      return { accessToken: newAccessToken };
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
    }
  }

  async logout(userId: string) {
    await redisHelpers.deleteRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      organizationId: user.organizationId,
      email: user.email,
      avatarS3Key: user.avatarS3Key,
      preferences: user.preferences
    };
  }

  async cleanupExpiredOtps() {
    return await this.otpRepository.deleteExpired();
  }
}
