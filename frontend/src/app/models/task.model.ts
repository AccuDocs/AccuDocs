export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in-progress' | 'review' | 'completed';
export type TaskModuleType = 'invoice' | 'client' | 'expense' | 'gst' | 'payroll' | 'vendor' | 'document' | 'audit' | 'other';
export type TaskType =
  | 'gst-filing'
  | 'invoice-follow-up'
  | 'bank-reconciliation'
  | 'tds-submission'
  | 'payroll-processing'
  | 'expense-verification'
  | 'audit-preparation'
  | 'client-call'
  | 'document-collection'
  | 'vendor-payment'
  | 'employee-approval'
  | 'general';

export interface TaskChecklistItem {
  id?: string;
  title: string;
  completed?: boolean;
}

export interface TaskAttachment {
  id?: string;
  name: string;
  url?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  clientId?: string | null;
  assignedTo?: string | null;
  createdBy?: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string | Date | null;
  dueDate?: string | Date;
  taskType?: TaskType | string | null;
  moduleType?: TaskModuleType | string | null;
  moduleId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tags?: string[];
  checklist?: TaskChecklistItem[];
  attachments?: TaskAttachment[];
  completedAt?: string | Date | null;
  client?: {
    id: string;
    code: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
  assignee?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  clientId?: string | null;
  assignedTo?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string | Date | null;
  dueDate?: string | Date;
  taskType?: TaskType | string | null;
  moduleType?: TaskModuleType | string | null;
  moduleId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tags?: string[];
  checklist?: TaskChecklistItem[];
  attachments?: TaskAttachment[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  clientId?: string | null;
  assignedTo?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string | Date | null;
  dueDate?: string | Date;
  taskType?: TaskType | string | null;
  moduleType?: TaskModuleType | string | null;
  moduleId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tags?: string[];
  checklist?: TaskChecklistItem[];
  attachments?: TaskAttachment[];
}

export interface UpdateTaskStatusDto {
  status: TaskStatus;
}

export interface TaskStats {
  totalTasks: number;
  dueTodayCount: number;
  overdueCount: number;
  byStatus: {
    pending: number;
    'in-progress': number;
    review: number;
    completed: number;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
