import { injectable } from "tsyringe";
import { IInvoiceRepository } from "../../domain/repositories/IInvoiceRepository";
import { Invoice } from "../../domain/entities/Invoice";
import { Invoice as InvoiceModel, InvoiceLineItem as InvoiceLineItemModel, InvoiceNumberSequence, Client as ClientModel } from "../../../../models";
import { InvoiceMapper } from "../mappers/InvoiceMapper";
import { Op } from "sequelize";

@injectable()
export class SequelizeInvoiceRepository implements IInvoiceRepository {
  async save(invoice: Invoice, options?: any): Promise<Invoice> {
    const rawInvoice = InvoiceMapper.toPersistence(invoice);
    const rawLineItems = invoice.lineItems.map(InvoiceMapper.toPersistenceLineItem);

    const exists = await InvoiceModel.findByPk(invoice.id, { transaction: options?.transaction });

    if (exists) {
      await exists.update(rawInvoice, options);
      
      if (rawLineItems.length > 0) {
        // Basic sync approach: delete missing, upsert rest
        const currentLineItemIds = rawLineItems.map(li => li.id).filter(Boolean);
        await InvoiceLineItemModel.destroy({
          where: { invoiceId: invoice.id, id: { [Op.notIn]: currentLineItemIds } },
          transaction: options?.transaction
        });

        for (const item of rawLineItems) {
          const itemExists = await InvoiceLineItemModel.findByPk(item.id, { transaction: options?.transaction });
          if (itemExists) {
            await itemExists.update(item, options);
          } else {
            await InvoiceLineItemModel.create(item, options);
          }
        }
      }
    } else {
      await InvoiceModel.create(rawInvoice, options);
      if (rawLineItems.length > 0) {
        await InvoiceLineItemModel.bulkCreate(rawLineItems, options);
      }
    }

    // Refresh from DB to get calculated fields
    const refreshed = await InvoiceModel.findByPk(invoice.id, {
      include: [{ model: InvoiceLineItemModel, as: 'lineItems' }],
      transaction: options?.transaction
    });

    return InvoiceMapper.toDomain(refreshed!);
  }

  async findById(id: string, organizationId: string): Promise<Invoice | null> {
    const invoice = await InvoiceModel.findOne({
      where: { id, organizationId },
      include: [{ model: InvoiceLineItemModel, as: 'lineItems' }]
    });
    if (!invoice) return null;
    return InvoiceMapper.toDomain(invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string, organizationId: string): Promise<Invoice | null> {
    const invoice = await InvoiceModel.findOne({
      where: { invoiceNumber, organizationId },
      include: [{ model: InvoiceLineItemModel, as: 'lineItems' }]
    });
    if (!invoice) return null;
    return InvoiceMapper.toDomain(invoice);
  }

  async findAll(organizationId: string, filters: any, pagination: any): Promise<{ invoices: Invoice[]; total: number; }> {
    const where: any = { organizationId };

    if (filters.status) where.status = filters.status;
    if (filters.clientId) where.clientId = filters.clientId;

    if (filters.search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${filters.search}%` } },
      ];
      // You could add a subquery or join for Client name search if needed
    }

    const offset = (pagination.page - 1) * pagination.limit;
    const order: any = pagination.sortBy
      ? [[pagination.sortBy, pagination.sortOrder || 'desc']]
      : [['createdAt', 'desc']];

    const { rows, count: total } = await InvoiceModel.findAndCountAll({
      where,
      include: [
        { model: InvoiceLineItemModel, as: 'lineItems' },
        { model: ClientModel, as: 'client', attributes: ['name', 'code'] }
      ],
      offset,
      limit: pagination.limit,
      order,
      distinct: true
    });

    return { invoices: rows.map(r => InvoiceMapper.toDomain(r)), total };
  }

  async generateNextInvoiceNumber(organizationId: string, financialYear: string): Promise<string> {
    // Requires a transaction lock in reality - this is simplified for structural demo 
    // Usually we update/create sequence in a transaction to prevent duplicates
    const [sequence] = await InvoiceNumberSequence.findOrCreate({
      where: { organizationId, financialYear },
      defaults: { lastSequence: 0 }
    });
    
    await sequence.increment('lastSequence');
    const updated = await sequence.reload();
    
    const seqPadded = String(updated.lastSequence).padStart(4, '0');
    // E.g. INV/23-24/0001
    return `INV/${financialYear}/${seqPadded}`;
  }
}
