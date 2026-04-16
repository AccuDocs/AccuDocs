import { injectable, inject } from "tsyringe";
import { Op } from "sequelize";
import { IInvoiceRepository } from "../../domain/repositories/IInvoiceRepository";
import { IClientRepository } from "../../../client/domain/repositories/IClientRepository";
import { Invoice } from "../../domain/entities/Invoice";
import { InvoiceLineItem } from "../../domain/entities/InvoiceLineItem";
import { Organization as OrganizationModel, ServiceTemplate as ServiceTemplateModel } from "../../../../models";
import { calculateGST } from "../../../../shared/utils/gst.util";
// Hard-coded or stubbed financialYear string
import { AppError } from "../../../../utils/errors";
import { pdfService } from "../../../../services/pdf.service";

@injectable()
export class BillingService {
  constructor(
    @inject("IInvoiceRepository") private invoiceRepo: IInvoiceRepository,
    @inject("IClientRepository") private clientRepo: IClientRepository
  ) {}

  async createInvoice(organizationId: string, adminId: string, data: any) {
    const org = await OrganizationModel.findByPk(organizationId);
    if (!org) throw new AppError('Organization not found', 404);

    const client = await this.clientRepo.findById(data.clientId);
    if (!client || client.organizationId !== organizationId) {
      throw new AppError('Client not found', 404);
    }

    const invoiceType: string = data.invoiceType || 'tax_invoice';
    const isQuotation = invoiceType === 'quotation';
    const isIgst = org.stateCode !== client.stateCode;
    const gstType = isIgst ? ('IGST' as const) : ('CGST_SGST' as const);
    const placeOfSupply = client.stateCode;

    let subtotal = 0;
    const itemsWithAmounts = data.lineItems.map((item: any) => {
      const amount = item.quantity * item.unitRate;
      subtotal += amount;
      return { ...item, amount };
    });

    // For quotations, skip GST computation — amounts are zero until converted
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalAmount = subtotal;
    let roundOff = 0;

    if (!isQuotation) {
      const taxCalculation = calculateGST(itemsWithAmounts, client.stateCode, org.stateCode);
      cgstAmount = (taxCalculation as any).cgst || 0;
      sgstAmount = (taxCalculation as any).sgst || 0;
      igstAmount = (taxCalculation as any).igst || 0;
      roundOff = taxCalculation.roundOff;
      totalAmount = (taxCalculation as any).total || 0;
      subtotal = taxCalculation.subtotal !== undefined ? taxCalculation.subtotal : 0;
    }
    
    const financialYear = "2024-25";
    const invoiceNumber = await this.invoiceRepo.generateNextInvoiceNumber(organizationId, financialYear);

    let dueDate = data.dueDate;
    if (!dueDate) {
      const d = new Date(data.invoiceDate);
      d.setDate(d.getDate() + 15);
      dueDate = d.toISOString().split('T')[0];
    }

    const invoiceProps = {
      organizationId,
      clientId: client.id,
      invoiceNumber,
      invoiceType,
      status: 'draft' as any,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(dueDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      gstType,
      placeOfSupply,
      clientGstin: client.gstin,
      firmGstin: org.gstin,
      subtotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundOff,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      notes: data.notes,
      createdBy: adminId
    };

    const invoiceResult = Invoice.create(invoiceProps);
    if (invoiceResult.isFailure) throw new AppError(invoiceResult.getError() as string, 500);
    const invoice = invoiceResult.getValue();

    const lineItemEntities = itemsWithAmounts.map((item: any, index: number) => {
      const liProps = {
        invoiceId: invoice.id,
        description: item.description,
        sacCode: item.sacCode,
        quantity: item.quantity,
        unitRate: item.unitRate,
        amount: item.amount,
        sortOrder: index
      };
      const liResult = InvoiceLineItem.create(liProps);
      if (liResult.isFailure) throw new AppError(liResult.getError() as string, 500);
      return liResult.getValue();
    });

    (invoice as any).props.lineItems = lineItemEntities;
    return await this.invoiceRepo.save(invoice);
  }

  async getInvoices(organizationId: string, filters: any, pagination: any) {
    return this.invoiceRepo.findAll(organizationId, filters, pagination);
  }

  async getInvoiceById(organizationId: string, id: string) {
    const invoice = await this.invoiceRepo.findById(id, organizationId);
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  }

  async generatePdf(organizationId: string, id: string) {
    const invoice = await this.invoiceRepo.findById(id, organizationId);
    if (!invoice) throw new AppError('Invoice not found', 404);

    try {
      const s3Key = `invoices/${organizationId}/${invoice.invoiceNumber}.pdf`;
      (invoice as any).props.pdfS3Key = s3Key;
      (invoice as any).props.pdfGeneratedAt = new Date();
      await this.invoiceRepo.save(invoice);
      return { url: `/documents/${s3Key}` };
    } catch (err) {
      throw new AppError('Failed to generate PDF', 500);
    }
  }

  async updateStatus(organizationId: string, id: string, adminId: string, data: any) {
    const invoice = await this.invoiceRepo.findById(id, organizationId);
    if (!invoice) throw new AppError('Invoice not found', 404);

    if (data.status === 'issued') {
      (invoice as any).props.status = 'issued';
      (invoice as any).props.issuedAt = new Date();
      (invoice as any).props.issuedBy = adminId;
    } else if (data.status === 'paid') {
      (invoice as any).props.status = 'paid';
      (invoice as any).props.paidAt = new Date();
      (invoice as any).props.amountPaid = invoice.totalAmount;
      (invoice as any).props.balanceDue = 0;
    } else if (data.status === 'cancelled') {
      (invoice as any).props.status = 'cancelled';
      (invoice as any).props.cancelledAt = new Date();
      (invoice as any).props.cancelledBy = adminId;
      (invoice as any).props.cancelReason = data.cancelReason;
    }

    return await this.invoiceRepo.save(invoice);
  }

  async getMetrics(organizationId: string) {
    const invoices = await this.invoiceRepo.findAll(organizationId, {}, { page: 1, limit: 1000 });
    const totalRevenue = invoices.invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount), 0);
    const pendingAmount = invoices.invoices.reduce((sum: number, inv: any) => sum + Number(inv.balanceDue), 0);
    const paidAmount = totalRevenue - pendingAmount;
    
    return {
      totalRevenue,
      pendingAmount,
      paidAmount,
      invoiceCount: invoices.total
    };
  }

  async getServiceTemplates(organizationId: string) {
    const templates = await ServiceTemplateModel.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { organizationId },
          { organizationId: null },
          { isSystem: true }
        ]
      },
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    return templates.map((template) => ({
      id: template.id,
      organizationId: template.organizationId,
      name: template.name,
      description: template.description,
      sacCode: template.sacCode,
      defaultRate: Number(template.defaultRate),
      defaultGstRate: Number(template.defaultGstRate),
      sortOrder: template.sortOrder
    }));
  }

  /**
   * Convert a proforma invoice → tax invoice.
   * Generates a new tax invoice number and recomputes GST.
   */
  async convertToTaxInvoice(organizationId: string, invoiceId: string, adminId: string) {
    const existing = await this.invoiceRepo.findById(invoiceId, organizationId);
    if (!existing) throw new AppError('Invoice not found', 404);
    if ((existing as any).props?.invoiceType !== 'proforma' && (existing as any).invoiceType !== 'proforma') {
      throw new AppError('Only proforma invoices can be converted to tax invoices', 400);
    }

    const org = await OrganizationModel.findByPk(organizationId);
    if (!org) throw new AppError('Organization not found', 404);

    const client = await this.clientRepo.findById((existing as any).clientId);
    if (!client) throw new AppError('Client not found', 404);

    // Generate a new invoice number under tax_invoice sequence
    const financialYear = '2024-25';
    const newInvoiceNumber = await this.invoiceRepo.generateNextInvoiceNumber(organizationId, financialYear);

    // Get raw line items to recompute GST
    const lineItems = (existing as any).props?.lineItems || [];
    const itemsForGst = lineItems.map((li: any) => ({
      quantity: li.quantity,
      unitRate: li.unitRate,
      amount: li.amount,
    }));

    const taxCalc = calculateGST(itemsForGst, client.stateCode, org.stateCode);

    // Update via repository
    (existing as any).props.invoiceType = 'tax_invoice';
    (existing as any).props.invoiceNumber = newInvoiceNumber;
    (existing as any).props.cgstAmount = (taxCalc as any).cgst || 0;
    (existing as any).props.sgstAmount = (taxCalc as any).sgst || 0;
    (existing as any).props.igstAmount = (taxCalc as any).igst || 0;
    (existing as any).props.totalAmount = (taxCalc as any).total || 0;
    (existing as any).props.balanceDue = (taxCalc as any).total || 0;
    (existing as any).props.issuedBy = adminId;

    return await this.invoiceRepo.save(existing);
  }
}
