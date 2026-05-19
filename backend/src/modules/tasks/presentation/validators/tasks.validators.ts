import { z } from 'zod';

export const CreateTaskSchema = z.object({
  clientId: z.string().uuid('Invalid Client ID').optional().nullable(),
  assignedTo: z.string().uuid('Invalid User ID').optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'pending', 'in-progress', 'in_progress', 'review', 'done', 'completed', 'cancelled']).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, 'Invalid ISO date').optional()
});

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(['todo', 'pending', 'in-progress', 'in_progress', 'review', 'done', 'completed', 'cancelled'])
});
