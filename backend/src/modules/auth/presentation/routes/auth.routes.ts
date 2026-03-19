import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { SendOtpSchema, VerifyOtpSchema, RefreshTokenSchema, AdminLoginSchema } from '../validators/auth.validators';
import { sendOtpLimiter, verifyOtpLimiter } from '../../../../middlewares/rateLimit.middleware';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * /auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Send OTP to mobile number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mobile]
 *             properties:
 *               mobile:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post(
  '/send-otp',
  sendOtpLimiter,
  validate(SendOtpSchema),
  AuthController.sendOtp
);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mobile, otp]
 *             properties:
 *               mobile:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post(
  '/verify-otp',
  verifyOtpLimiter,
  validate(VerifyOtpSchema),
  AuthController.verifyOtp
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post(
  '/refresh',
  validate(RefreshTokenSchema),
  AuthController.refresh
);

/**
 * @openapi
 * /auth/admin-login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin login with password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post(
  '/admin-login',
  validate(AdminLoginSchema),
  AuthController.adminLogin
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 */
router.get(
  '/me',
  authenticate,
  AuthController.me
);

export default router;
