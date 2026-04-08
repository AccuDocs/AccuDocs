export { authenticate } from './auth.middleware';
export { requireRole, adminOnly, clientOnly, authenticated } from './role.middleware';
export { validate } from './validate.middleware';
export { errorHandler, asyncHandler } from './error.middleware';
export { apiLimiter } from './rateLimit.middleware';
export { auditLogger } from './audit.middleware';
export { uploadClientDocs } from './upload.middleware';
