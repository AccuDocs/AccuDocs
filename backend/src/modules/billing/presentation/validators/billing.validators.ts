import { z } from 'zod';

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid('Invalid Client ID'),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  notes: z.string().optional(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, 'Description is required'),
      sacCode: z.string().min(1, 'SAC code is required'),
      quantity: z.number().positive('Quantity must be positive'),
      unitRate: z.number().min(0, 'Unit rate must be non-negative')
    })
  ).min(1, 'At least one line item is required')
});

export const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(['issued', 'paid', 'cancelled']),
  cancelReason: z.string().optional()
});
