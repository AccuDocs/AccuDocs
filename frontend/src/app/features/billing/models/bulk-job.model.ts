export interface BulkJobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalCount: number;
  completedCount: number;
  failedCount: number;
  resultS3Key: string | null;
  errorLog: Array<{ clientId: string; error: string }>;
  createdAt: string;
}

export interface CreateBulkJobDto {
  templateId?: string;
  clientIds: string[];
  lineItemsTemplate: Array<{
    description: string;
    sacCode?: string;
    quantity: number;
    unitRate: number;
  }>;
  dueDate: string;
  period: string;
}
