import { injectable, inject } from "tsyringe";
import { Op } from "sequelize";
import { RecurringInvoiceTemplate as TemplateModel } from "../../../../models/RecurringInvoiceTemplate.model";
import { BillingService } from "./BillingService";
import { logger } from "../../../../utils/logger";

@injectable()
export class RecurringBillingService {
  constructor(
    @inject(BillingService) private billingService: BillingService
  ) {}

  public calculateNextDate(currentDate: Date, frequency: string): Date {
    const date = new Date(currentDate);
    switch (frequency) {
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'HALF_YEARLY':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }

  public async generateRecurringInvoices(): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    try {
      const templates = await TemplateModel.findAll({
        where: {
          isActive: true,
          nextRunDate: {
            [Op.lte]: today
          }
        }
      });

      logger.info(`Found ${templates.length} recurring templates to process.`);

      for (const template of templates) {
        try {
          const invoiceDate = new Date();
          const dueDate = new Date();
          dueDate.setDate(invoiceDate.getDate() + template.defaultDueDays);

          const payload = {
            clientId: template.clientId,
            invoiceDate: invoiceDate.toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            notes: template.defaultNotes,
            lineItems: template.lineItemsSnapshot || []
          };

          // System admin ID could be a generic UUID or we rely on the DB's UUID
          const systemCreatorId = '00000000-0000-0000-0000-000000000000'; 
          
          const invoice = await this.billingService.createInvoice(
            template.organizationId,
            systemCreatorId,
            payload
          );

          if (template.autoIssue) {
            await this.billingService.updateStatus(
              template.organizationId,
              invoice.id,
              systemCreatorId,
              { status: 'issued' }
            );
          }

          // Update template
          const nextDate = this.calculateNextDate(today, template.frequency);
          await template.update({
            nextRunDate: nextDate,
            totalGenerated: template.totalGenerated + 1,
            lastGeneratedAt: new Date()
          });

          logger.info(`Generated recurring invoice ${invoice.id} for template ${template.id}`);
        } catch (err: any) {
          logger.error(`Failed to process recurring template ${template.id}: ${err.message}`);
        }
      }
    } catch (error: any) {
      logger.error(`Error in generateRecurringInvoices: ${error.message}`);
    }
  }
}
