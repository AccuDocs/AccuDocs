import { z } from 'zod';

// Common validation patterns
export const patterns = {
  mobile: /^\+?[1-9]\d{9,14}$/,
  clientCode: /^[A-Z0-9]{2,10}$/,
  year: /^20(2[1-9]|30)$/,
  otp: /^\d{6}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

// Helper for multipart/form-data boolean coercion
// - [x] Backend: Add boolean coercion to Zod validators
// - [ ] Verification: Test multipart submission with "true"/"false" strings
const booleanCoerce = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  return val;
}, z.boolean());

// Auth schemas
export const sendOTPSchema = z.object({
  mobile: z.string().regex(patterns.mobile, 'Invalid mobile number format'),
});

export const verifyOTPSchema = z.object({
  mobile: z.string().regex(patterns.mobile, 'Invalid mobile number format'),
  otp: z.string().regex(patterns.otp, 'OTP must be 6 digits'),
});

export const adminLoginSchema = z.object({
  mobile: z.string().regex(patterns.mobile, 'Invalid mobile number format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Client schemas
export const createClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150, 'Name must not exceed 150 characters'),
  mobile: z.string().min(10, 'Invalid mobile number format'), // Loosened for flexibility
  code: z.string().min(2, 'Code must be at least 2 chars'),
  email: z.string().email('Invalid email format').optional().nullable(),
  entityType: z.string().optional().nullable(),
  businessName: z.string().optional().nullable(),
  industrySector: z.string().optional().nullable(),
  incorporationDate: z.coerce.date().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  gstStatus: z.string().optional().nullable(),
  financialYearEnd: z.string().optional().nullable(),
  accountingMethod: z.string().optional().nullable(),
  estimatedTurnover: z.string().optional().nullable(),
  employeeCount: z.string().optional().nullable(),
  termsAccepted: booleanCoerce.optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: booleanCoerce.optional(),
});

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
  mobile: z.string().regex(patterns.mobile, 'Invalid mobile number format'),
  role: z.enum(['admin', 'client']),
  email: z.string().email('Invalid email format').optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  isActive: booleanCoerce.optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').optional(),
  mobile: z.string().regex(patterns.mobile, 'Invalid mobile number format').optional(),
  role: z.enum(['admin', 'client']).optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  isActive: booleanCoerce.optional(),
});

export const userFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.string().optional()
});


// Year schemas
export const createYearSchema = z.object({
  year: z.string().regex(patterns.year, 'Year must be between 2021 and 2030'),
  clientId: z.string().uuid('Invalid client ID format'),
});

// Document schemas
export const uploadDocumentSchema = z.object({
  yearId: z.string().uuid('Invalid year ID format'),
  fileName: z.string().min(1, 'File name is required').max(255, 'File name must not exceed 255 characters'),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

// Log filter schema
export const logFilterSchema = z.object({
  ...paginationSchema.shape,
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// WhatsApp webhook schema
export const whatsappWebhookSchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  MessageSid: z.string().optional(),
});

// Type exports
export type SendOTPInput = z.infer<typeof sendOTPSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateYearInput = z.infer<typeof createYearSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type LogFilterInput = z.infer<typeof logFilterSchema>;
export type WhatsAppWebhookInput = z.infer<typeof whatsappWebhookSchema>;
