import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Invoice } from '../../../../models/invoice.model';
import { Client } from '../../../../models/client.model';
import { Organization } from '../../../../models/organization.model';
import { InvoiceLineItem } from '../../../../models/invoice-line-item.model';
import { AppError } from '../../../../utils/errors';

const LINK_TTL_HOURS = 72;

export class PaymentLinkService {
  /**
   * Generate a shareable payment link token for an invoice.
   * Authenticated — org/admin can generate for their own invoices.
   */
  async generateLink(orgId: string, invoiceId: string): Promise<{ url: string; expiresAt: Date }> {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, organizationId: orgId, deletedAt: null },
    });

    if (!invoice) throw new AppError('Invoice not found', 404);
    if (['paid', 'cancelled'].includes(invoice.status)) {
      throw new AppError('Cannot generate payment link for a paid or cancelled invoice', 400);
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + LINK_TTL_HOURS * 60 * 60 * 1000);

    await Invoice.update(
      { paymentLinkToken: token, paymentLinkExpiresAt: expiresAt } as any,
      { where: { id: invoiceId } }
    );

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    return {
      url: `${baseUrl}/api/v1/public/pay/${token}`,
      expiresAt,
    };
  }

  /**
   * Public — fetch sanitised invoice summary for the payment page (no auth).
   */
  async getPublicSummary(token: string) {
    const invoice = await Invoice.findOne({
      where: {
        paymentLinkToken: token,
        paymentLinkExpiresAt: { [Op.gt]: new Date() },
        deletedAt: null,
      } as any,
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'name', 'gstin'],
        },
        {
          model: InvoiceLineItem,
          as: 'lineItems',
          attributes: ['description', 'sacCode', 'quantity', 'unitRate', 'amount', 'sortOrder'],
        },
      ],
    });

    if (!invoice) throw new AppError('Payment link is invalid or has expired', 410);

    const org = await Organization.findByPk(invoice.organizationId, {
      attributes: ['name', 'gstin', 'stateCode'],
    });

    const raw = invoice as any;
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      totalAmount: Number(invoice.totalAmount),
      amountPaid: Number(invoice.amountPaid),
      balanceDue: Number(invoice.balanceDue),
      gstType: invoice.gstType,
      cgstAmount: Number(invoice.cgstAmount),
      sgstAmount: Number(invoice.sgstAmount),
      igstAmount: Number(invoice.igstAmount),
      client: raw.client ? { name: raw.client.name, gstin: raw.client.gstin } : null,
      firm: org ? { name: org.name, gstin: org.gstin } : null,
      lineItems: (raw.lineItems || [])
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((item: any) => ({
          description: item.description,
          sacCode: item.sacCode,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
        })),
    };
  }

  /**
   * Mark invoice as paid via token (manual confirmation from payment page).
   */
  async markPaidByToken(
    token: string,
    paymentData: { paymentMode: string; referenceNumber?: string; notes?: string }
  ) {
    const invoice = await Invoice.findOne({
      where: {
        paymentLinkToken: token,
        paymentLinkExpiresAt: { [Op.gt]: new Date() },
        deletedAt: null,
      } as any,
    });

    if (!invoice) throw new AppError('Payment link is invalid or has expired', 410);
    if (invoice.status === 'paid') throw new AppError('Invoice is already marked as paid', 400);

    await Invoice.update(
      {
        status: 'paid',
        amountPaid: invoice.totalAmount,
        paidAt: new Date(),
        // Invalidate the link after use
        paymentLinkToken: null,
        paymentLinkExpiresAt: null,
      } as any,
      { where: { id: invoice.id } }
    );

    return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: 'paid' };
  }
}
