import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { SendOtpSchema, VerifyOtpSchema, RefreshTokenSchema, AdminLoginSchema } from '../validators/auth.validators';
import { sendOtpLimiter, verifyOtpLimiter } from '../../../../middlewares/rateLimit.middleware';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.post(
  '/send-otp',
  sendOtpLimiter,
  validate(SendOtpSchema),
  AuthController.sendOtp
);

router.post(
  '/verify-otp',
  verifyOtpLimiter,
  validate(VerifyOtpSchema),
  AuthController.verifyOtp
);

router.post(
  '/refresh',
  validate(RefreshTokenSchema),
  AuthController.refresh
);

router.post(
  '/admin-login',
  validate(AdminLoginSchema),
  AuthController.adminLogin
);

router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

router.get(
  '/me',
  authenticate,
  AuthController.me
);

export default router;
