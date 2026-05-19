import { z } from 'zod';

const taskStatusSchema = z.enum(['todo', 'pending', 'in-progress', 'in_progress', 'review', 'done', 'completed', 'cancelled']);
const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const optionalUuid = (message: string) => z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().uuid(message).optional().nullable()
);
const optionalText = z.string().optional().nullable();
const optionalDate = z.string().optional().nullable();
const optionalNumber = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.union([z.number(), z.string(), z.null()]).optional()
);
const taskChecklistSchema = z.array(z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  completed: z.boolean().optional()
})).optional();
const taskAttachmentSchema = z.array(z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  url: z.string().optional().nullable()
})).optional();

export const CreateTaskSchema = z.object({
  clientId: optionalUuid('Invalid Client ID'),
  assignedTo: optionalUuid('Invalid User ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
  taskType: optionalText,
  moduleType: optionalText,
  moduleId: optionalText,
  estimatedHours: optionalNumber,
  actualHours: optionalNumber,
  tags: z.array(z.string()).optional(),
  checklist: taskChecklistSchema,
  attachments: taskAttachmentSchema,
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  title: z.string().min(1, 'Title is required').optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: taskStatusSchema
});
