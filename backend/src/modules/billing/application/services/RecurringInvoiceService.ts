import { injectable, inject } from 'tsyringe';
import { Op } from 'sequelize';
import { RecurringInvoice } from '../../../../models/recurring-invoice.model';
import { Invoice } from '../../../../models/invoice.model';
import { InvoiceLineItem } from '../../../../models/InvoiceLineItem.model';
import { BillingService } from './BillingService';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../utils/errors';

@injectable()
export class RecurringInvoiceService {
  constructor(
    @inject(BillingService) private billingService: BillingService
  ) {}

  /**
   * Create a new recurring invoice configuration from a base invoice.
   */
  async create(organizationId: string, userId: string, data: {
    baseInvoiceId: string;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    nextRunDate: string;
    endDate?: string;
    autoSend: boolean;
  }) {
    const baseInvoice = await Invoice.findOne({
      where: { id: data.baseInvoiceId, organizationId },
    });
    if (!baseInvoice) throw new AppError('Base invoice not found', 404);

    const recurring = await RecurringInvoice.create({
      organizationId,
      baseInvoiceId: data.baseInvoiceId,
      frequency: data.frequency,
      nextRunDate: new Date(data.nextRunDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      autoSend: data.autoSend,
      status: 'active',
      createdBy: userId,
    } as any);

    return recurring;
  }

  /**
   * Pause a recurring invoice.
   */
  async pause(organizationId: string, id: string) {
    const recurring = await RecurringInvoice.findOne({
      where: { id, organizationId },
    });
    if (!recurring) throw new AppError('Recurring invoice not found', 404);
    if (recurring.status !== 'active') throw new AppError('Only active recurring invoices can be paused', 400);

    await recurring.update({ status: 'paused' });
    return recurring;
  }

  /**
   * Resume a paused recurring invoice.
   */
  async resume(organizationId: string, id: string) {
    const recurring = await RecurringInvoice.findOne({
      where: { id, organizationId },
    });
    if (!recurring) throw new AppError('Recurring invoice not found', 404);
    if (recurring.status !== 'paused') throw new AppError('Only paused recurring invoices can be resumed', 400);

    await recurring.update({ status: 'active' });
    return recurring;
  }

  /**
   * List all recurring invoices for an organization.
   */
  async list(organizationId: string, filters: { status?: string } = {}) {
    const where: any = { organizationId };
    if (filters.status) where.status = filters.status;

    const records = await RecurringInvoice.findAll({
      where,
      include: [
        { model: Invoice, as: 'baseInvoice', attributes: ['id', 'invoiceNumber', 'totalAmount', 'clientId'] },
      ],
      order: [['next_run_date', 'ASC']],
    });

    return records;
  }

  /**
   * Get a single recurring invoice by ID.
   */
  async getById(organizationId: string, id: string) {
    const recurring = await RecurringInvoice.findOne({
      where: { id, organizationId },
      include: [
        { model: Invoice, as: 'baseInvoice' },
        { model: Invoice, as: 'lastGeneratedInvoice', required: false },
      ],
    });
    if (!recurring) throw new AppError('Recurring invoice not found', 404);
    return recurring;
  }

  /**
   * Calculate next run date based on frequency.
   */
  private calculateNextDate(currentDate: Date, frequency: string): Date {
    const date = new Date(currentDate);
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }

  /**
   * Process all due recurring invoices — called by scheduler at 6 AM IST daily.
   */
  async processDueRecurringInvoices(): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    try {
      const dueRecurrings = await RecurringInvoice.findAll({
        where: {
          status: 'active',
          nextRunDate: { [Op.lte]: today },
        },
        include: [
          {
            model: Invoice,
            as: 'baseInvoice',
            include: [{ model: InvoiceLineItem, as: 'lineItems' }],
          },
        ],
      });

      logger.info(`⏰ Found ${dueRecurrings.length} recurring invoices to process.`);

      for (const recurring of dueRecurrings) {
        try {
          // Check if end_date has passed
          if (recurring.endDate && new Date(recurring.endDate) < today) {
            await recurring.update({ status: 'completed' });
            logger.info(`⏰ Recurring invoice ${recurring.id} completed (end date passed).`);
            continue;
          }

          const baseInvoice = (recurring as any).baseInvoice;
          if (!baseInvoice) {
            logger.error(`⏰ Base invoice not found for recurring ${recurring.id}`);
            continue;
          }

          const lineItems = (baseInvoice.lineItems || []).map((li: any) => ({
            description: li.description,
            sacCode: li.sacCode,
            quantity: Number(li.quantity),
            unitRate: Number(li.unitRate),
          }));

          const invoiceDate = new Date();
          const dueDate = new Date();
          dueDate.setDate(invoiceDate.getDate() + 15);

          const payload = {
            clientId: baseInvoice.clientId,
            invoiceDate: invoiceDate.toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            notes: baseInvoice.notes,
            lineItems,
          };

          const systemCreatorId = recurring.createdBy || '00000000-0000-0000-0000-000000000000';

          const newInvoice = await this.billingService.createInvoice(
            recurring.organizationId,
            systemCreatorId,
            payload
          );

          // Auto-issue if autoSend is true
          if (recurring.autoSend) {
            await this.billingService.updateStatus(
              recurring.organizationId,
              newInvoice.id,
              systemCreatorId,
              { status: 'issued' }
            );
          }

          // Update recurring record
          const nextDate = this.calculateNextDate(today, recurring.frequency);
          await recurring.update({
            nextRunDate: nextDate,
            lastGeneratedInvoiceId: newInvoice.id,
            totalGenerated: recurring.totalGenerated + 1,
          });

          logger.info(`⏰ Generated recurring invoice ${newInvoice.id} for recurring config ${recurring.id}`);
        } catch (err: any) {
          logger.error(`⏰ Failed to process recurring invoice ${recurring.id}: ${err.message}`);
        }
      }
    } catch (error: any) {
      logger.error(`⏰ Error in processDueRecurringInvoices: ${error.message}`);
    }
  }
}
