import { z } from 'zod';

export const CreateNotificationSchema = z.object({
  userId: z.string().uuid('Invalid User ID'),
  type: z.enum(['invoice_due', 'document_uploaded', 'task_assigned', 'alert', 'system']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  metadata: z.any().optional()
});
