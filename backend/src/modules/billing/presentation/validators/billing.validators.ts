import { z } from 'zod';

export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid('Invalid Client ID'),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  invoiceType: z.enum(['tax_invoice', 'proforma', 'quotation', 'credit_note', 'debit_note']).optional().default('tax_invoice'),
  notes: z.string().optional(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, 'Description is required'),
      sacCode: z.string().optional().default(''),
      hsnCode: z.string().optional(),
      itemId: z.string().uuid().optional().nullable(),
      variantId: z.string().uuid().optional().nullable(),
      warehouseId: z.string().uuid().optional().nullable(),
      batchNo: z.string().optional().nullable(),
      trackInventory: z.boolean().optional().default(false),
      quantity: z.number().positive('Quantity must be positive'),
      unitRate: z.number().min(0, 'Unit rate must be non-negative'),
      gstRate: z.number().min(0).max(100).optional(),
    })
  ).min(1, 'At least one line item is required'),
});

export const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(['issued', 'paid', 'cancelled']),
  cancelReason: z.string().optional(),
});

export const PaymentLinkConfirmSchema = z.object({
  paymentMode: z.enum(['online', 'upi', 'bank_transfer', 'neft', 'rtgs', 'cash']).default('online'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const ReconcileSchema = z.object({
  clientId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM'),
  gstr2aData: z.array(
    z.object({
      supplierGstin: z.string().min(15).max(15),
      invoiceNumber: z.string().min(1),
      invoiceDate: z.string(),
      taxablePurchase: z.number().min(0),
      igst: z.number().min(0).default(0),
      cgst: z.number().min(0).default(0),
      sgst: z.number().min(0).default(0),
    })
  ).min(1, 'At least one GSTR-2A entry required'),
});

