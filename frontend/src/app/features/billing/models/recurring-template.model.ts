import { CreateLineItemDto } from './invoice.model';

export type RecurringFrequency = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export interface RecurringTemplate {
  id: string;
  organizationId: string;
  clientId: string;
  client?: { id: string; name: string };
  name: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  advanceNoticeDays: number;
  isActive: boolean;
  autoIssue: boolean;
  lineItemsSnapshot: CreateLineItemDto[];
  defaultNotes?: string;
  defaultDueDays: number;
  totalGenerated: number;
  lastGeneratedAt?: string;
  createdAt: string;
}

export interface CreateRecurringDto {
  clientId: string;
  name: string;
  frequency: RecurringFrequency;
  advanceNoticeDays: number;
  autoIssue: boolean;
  lineItemsSnapshot: CreateLineItemDto[];
  defaultNotes?: string;
  defaultDueDays: number;
  nextRunDate?: string;
}

export interface UpdateRecurringDto extends Partial<CreateRecurringDto> {
  isActive?: boolean;
}

export interface RecurringTemplateListParams {
  search?: string;
  isActive?: boolean | null;
}
