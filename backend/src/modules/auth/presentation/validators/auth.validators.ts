import { z } from 'zod';

export const SendOtpSchema = z.object({
  mobile: z.string().regex(/^\+91[0-9]{10}$/, 'Must be a valid Indian mobile number with +91 prefix')
});

export const VerifyOtpSchema = z.object({
  mobile: z.string(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const AdminLoginSchema = z.object({
  identifier: z.string().min(1, 'Email or Phone is required'),
  password: z.string().min(1, 'Password is required')
});

export const ClientLoginSchema = z.object({
  mobile: z.string().min(1, 'Mobile number is required'),
  password: z.string().min(1, 'Password is required')
});
