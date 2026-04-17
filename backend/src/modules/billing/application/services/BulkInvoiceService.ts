import { injectable, inject } from 'tsyringe';
import { BulkInvoiceJob } from '../../../../models/bulk-invoice-job.model';
import { Client } from '../../../../models/client.model';
import { BillingService } from './BillingService';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../utils/errors';

const MAX_BULK_CLIENTS = 500;

@injectable()
export class BulkInvoiceService {
  constructor(
    @inject(BillingService) private billingService: BillingService
  ) {}

  /**
   * Create a bulk invoice generation job.
   */
  async createJob(organizationId: string, userId: string, data: {
    templateId?: string;
    clientIds: string[];
    lineItemsTemplate: any[];
    dueDate: string;
    period: string;
  }) {
    if (!data.clientIds || data.clientIds.length === 0) {
      throw new AppError('At least one client must be selected', 400);
    }
    if (data.clientIds.length > MAX_BULK_CLIENTS) {
      throw new AppError(`Maximum ${MAX_BULK_CLIENTS} clients per bulk job`, 400);
    }

    // Validate that all clients belong to this organization
    const clientCount = await Client.count({
      where: { id: data.clientIds, organizationId },
    });
    if (clientCount !== data.clientIds.length) {
      throw new AppError('Some clients do not belong to this organization', 400);
    }

    const job = await BulkInvoiceJob.create({
      organizationId,
      templateId: data.templateId || null,
      clientIds: data.clientIds,
      lineItemsTemplate: data.lineItemsTemplate,
      dueDate: new Date(data.dueDate),
      period: data.period,
      status: 'queued',
      totalCount: data.clientIds.length,
      completedCount: 0,
      failedCount: 0,
      errorLog: [],
      createdBy: userId,
    } as any);

    // Kick off async processing (non-blocking)
    this.processJob(job.id, organizationId, userId).catch((err) => {
      logger.error(`Bulk job ${job.id} failed: ${err.message}`);
    });

    return { jobId: job.id, totalCount: data.clientIds.length, status: 'queued' };
  }

  /**
   * Process a bulk invoice job asynchronously.
   */
  private async processJob(jobId: string, organizationId: string, userId: string): Promise<void> {
    const job = await BulkInvoiceJob.findByPk(jobId);
    if (!job) return;

    await job.update({ status: 'processing' });

    const clientIds = job.clientIds as string[];
    const lineItems = job.lineItemsTemplate as any[];
    const errors: any[] = [];
    let completed = 0;
    let failed = 0;

    for (const clientId of clientIds) {
      try {
        const invoiceDate = new Date().toISOString().split('T')[0];
        const payload = {
          clientId,
          invoiceDate,
          dueDate: job.dueDate.toString().split('T')[0],
          notes: `Bulk generated for period ${job.period}`,
          lineItems: lineItems.map((item: any) => ({
            description: item.description,
            sacCode: item.sacCode || '',
            quantity: item.quantity || 1,
            unitRate: item.unitRate || 0,
          })),
        };

        await this.billingService.createInvoice(organizationId, userId, payload);
        completed++;

        // Update progress periodically (every 10 invoices or at completion)
        if (completed % 10 === 0 || (completed + failed) === clientIds.length) {
          await job.update({ completedCount: completed, failedCount: failed });
        }
      } catch (err: any) {
        failed++;
        errors.push({ clientId, error: err.message });
        logger.error(`Bulk job ${jobId}: failed for client ${clientId}: ${err.message}`);
      }
    }

    // Finalize job
    const finalStatus = failed === clientIds.length ? 'failed' : 'completed';
    await job.update({
      status: finalStatus,
      completedCount: completed,
      failedCount: failed,
      errorLog: errors,
      // In production, generate ZIP and upload to S3, set resultS3Key
      resultS3Key: finalStatus === 'completed' ? `bulk-jobs/${jobId}/invoices.zip` : null,
    });

    logger.info(`✅ Bulk job ${jobId} finished: ${completed} completed, ${failed} failed`);
  }

  /**
   * Get job status for polling.
   */
  async getJobStatus(organizationId: string, jobId: string) {
    const job = await BulkInvoiceJob.findOne({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new AppError('Bulk job not found', 404);

    return {
      jobId: job.id,
      status: job.status,
      totalCount: job.totalCount,
      completedCount: job.completedCount,
      failedCount: job.failedCount,
      resultS3Key: job.resultS3Key,
      errorLog: job.errorLog,
      createdAt: job.createdAt,
    };
  }
}
