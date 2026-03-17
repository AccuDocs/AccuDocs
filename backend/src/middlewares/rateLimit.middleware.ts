import rateLimit from 'express-rate-limit';
import { errorResponse } from '../shared/utils/response.util';

// 3 requests per 10 minutes per IP
export const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).json(errorResponse('RATE_LIMIT_EXCEEDED', 'Too many OTP requests, please try again later'));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 requests per 5 minutes per IP
export const verifyOtpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json(errorResponse('RATE_LIMIT_EXCEEDED', 'Too many verify attempts, please try again later'));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 100 requests per minute per user (IP fallback)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: any) => {
    // Use userId if authenticated, else fallback to IP
    return req.user ? req.user.userId : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json(errorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later'));
  },
  standardHeaders: true,
  legacyHeaders: false,
});
