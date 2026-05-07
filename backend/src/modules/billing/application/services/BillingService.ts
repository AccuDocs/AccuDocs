import { injectable, inject, container } from "tsyringe";
import { Op } from "sequelize";
import { IInvoiceRepository } from "../../domain/repositories/IInvoiceRepository";
import { IClientRepository } from "../../../client/domain/repositories/IClientRepository";
import { Invoice } from "../../domain/entities/Invoice";
import { InvoiceLineItem } from "../../domain/entities/InvoiceLineItem";
import { Organization as OrganizationModel, ServiceTemplate as ServiceTemplateModel, ClientSale, StockLedger as StockLedgerModel } from "../../../../models";
import { StockService } from "../../../inventory/application/services/StockService";
import { calculateGST } from "../../../../shared/utils/gst.util";
import { getFinancialYear, getMonthFromDate } from "../../../../utils/gstCalculator";
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
    if (!client || (client as any).organizationId !== organizationId) {
      throw new AppError('Client not found', 404);
    }

    const invoiceType = (data.invoiceType || 'tax_invoice') as 'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';
    const isQuotation = invoiceType === 'quotation';
    const isIgst = org.stateCode !== (client as any).stateCode;
    const gstType = data.gstType || (isIgst ? ('IGST' as const) : ('CGST_SGST' as const));
    const placeOfSupply = (client as any).stateCode;

    let subtotal = 0;
    const itemsWithAmounts = data.lineItems.map((item: any) => {
      const amount = item.quantity * item.unitRate;
      subtotal += amount;
      return { ...item, amount };
    });

    // For quotations, skip GST computation — amounts are zero until converted
    const amountSummary = calculateInvoiceAmounts(
      itemsWithAmounts,
      isQuotation,
      gstType,
      Number(data.discountAmount ?? 0),
    );
    subtotal = amountSummary.subtotal;
    const discountAmount = amountSummary.discountAmount;
    const cgstAmount = amountSummary.cgstAmount;
    const sgstAmount = amountSummary.sgstAmount;
    const igstAmount = amountSummary.igstAmount;
    const totalAmount = amountSummary.totalAmount;
    const roundOff = amountSummary.roundOff;
    const amountPaid = Math.min(Number(data.amountPaid ?? (data.status === 'paid' ? totalAmount : 0)), totalAmount);
    
    const financialYear = getFinancialYear(new Date(data.invoiceDate));
    const invoiceNumber = await this.invoiceRepo.generateNextInvoiceNumber(organizationId, financialYear);

    let dueDate = data.dueDate;
    if (!dueDate) {
      const d = new Date(data.invoiceDate);
      d.setDate(d.getDate() + 15);
      dueDate = d.toISOString().split('T')[0];
    }

    const hasExternalReceiver = Boolean(data.customerName || data.customerAddress);
    const issuerGstin = hasExternalReceiver ? ((client as any).gstin || null) : org.gstin;
    const invoiceProps = {
      organizationId,
      clientId: client.id,
      invoiceNumber,
      invoiceType,
      status: (data.status || 'draft') as any,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(dueDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      gstType,
      placeOfSupply,
      clientGstin: hasExternalReceiver ? (data.clientGstin || null) : (data.clientGstin || (client as any).gstin),
      firmGstin: issuerGstin,
      subtotal,
      discountType: discountAmount > 0 ? ('flat' as const) : null,
      discountValue: discountAmount,
      discountAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundOff,
      totalAmount,
      amountPaid,
      balanceDue: Math.max(totalAmount - amountPaid, 0),
      notes: data.notes,
      internalNotes: data.internalNotes ?? null,
      receiverName: data.customerName || null,
      receiverAddress: data.customerAddress || null,
      createdBy: adminId
    };

    const invoiceResult = Invoice.create(invoiceProps);
    if (invoiceResult.isFailure) throw new AppError(invoiceResult.getError() as string, 500);
    const invoice = invoiceResult.getValue();

    const lineItemEntities = itemsWithAmounts.map((item: any, index: number) => {
      const liProps = {
        invoiceId: invoice.id,
        itemId: item.itemId ?? null,
        variantId: item.variantId ?? null,
        warehouseId: item.warehouseId ?? null,
        batchNo: item.batchNo ?? item.serialNo ?? null,
        trackInventory: item.trackInventory === true,
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
    const saved = await this.invoiceRepo.save(invoice);

    if (saved.status === 'issued' || saved.status === 'paid') {
      await this.syncToSalesRegister(saved.id, organizationId);
      await this.syncInventoryForIssuedInvoice(saved, organizationId, adminId);
    }

    return saved;
  }

  async updateInvoice(organizationId: string, invoiceId: string, data: any) {
    const existing = await this.invoiceRepo.findById(invoiceId, organizationId);
    if (!existing) throw new AppError('Invoice not found', 404);
    if (existing.status !== 'draft') throw new AppError('Only draft invoices can be edited', 400);

    const org = await OrganizationModel.findByPk(organizationId);
    if (!org) throw new AppError('Organization not found', 404);

    const clientId = data.clientId || existing.clientId;
    const client = await this.clientRepo.findById(clientId);
    if (!client || (client as any).organizationId !== organizationId) {
      throw new AppError('Client not found', 404);
    }

    const invoiceType = (data.invoiceType || existing.invoiceType || 'tax_invoice') as 'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';
    const isQuotation = invoiceType === 'quotation';
    const isIgst = org.stateCode !== (client as any).stateCode;
    const gstType = data.gstType || existing.gstType || (isIgst ? ('IGST' as const) : ('CGST_SGST' as const));
    const sourceLineItems = data.lineItems ?? existing.lineItems.map((item) => ({
      serviceTemplateId: item.serviceTemplateId,
      itemId: item.itemId,
      variantId: item.variantId,
      warehouseId: item.warehouseId,
      batchNo: item.batchNo,
      trackInventory: item.trackInventory,
      description: item.description,
      sacCode: item.sacCode,
      quantity: item.quantity,
      unitRate: item.unitRate,
    }));

    let subtotal = 0;
    const itemsWithAmounts = sourceLineItems.map((item: any) => {
      const amount = Number(item.quantity || 0) * Number(item.unitRate || 0);
      subtotal += amount;
      return { ...item, amount };
    });

    const amountSummary = calculateInvoiceAmounts(
      itemsWithAmounts,
      isQuotation,
      gstType,
      Number(data.discountAmount ?? existing.discountAmount ?? 0),
    );
    subtotal = amountSummary.subtotal;
    const discountAmount = amountSummary.discountAmount;
    const cgstAmount = amountSummary.cgstAmount;
    const sgstAmount = amountSummary.sgstAmount;
    const igstAmount = amountSummary.igstAmount;
    const totalAmount = amountSummary.totalAmount;
    const roundOff = amountSummary.roundOff;
    const amountPaid = Math.min(
      Object.prototype.hasOwnProperty.call(data, 'amountPaid') ? Number(data.amountPaid ?? 0) : Number(existing.amountPaid || 0),
      totalAmount,
    );

    const hasClientGstin = Object.prototype.hasOwnProperty.call(data, 'clientGstin');
    const hasCustomerName = Object.prototype.hasOwnProperty.call(data, 'customerName');
    const hasCustomerAddress = Object.prototype.hasOwnProperty.call(data, 'customerAddress');
    const receiverNameForUpdate = hasCustomerName ? data.customerName : existing.receiverName;
    const receiverAddressForUpdate = hasCustomerAddress ? data.customerAddress : existing.receiverAddress;
    const hasExternalReceiverForUpdate = Boolean(receiverNameForUpdate || receiverAddressForUpdate);

    (existing as any).props.clientId = clientId;
    (existing as any).props.invoiceType = invoiceType;
    (existing as any).props.invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : existing.invoiceDate;
    (existing as any).props.dueDate = data.dueDate ? new Date(data.dueDate) : existing.dueDate;
    (existing as any).props.expiryDate = data.expiryDate ? new Date(data.expiryDate) : existing.expiryDate ?? null;
    (existing as any).props.gstType = gstType;
    (existing as any).props.placeOfSupply = (client as any).stateCode;
    (existing as any).props.clientGstin = hasClientGstin
      ? (data.clientGstin || null)
      : hasExternalReceiverForUpdate
        ? existing.clientGstin
        : existing.clientGstin || (client as any).gstin;
    (existing as any).props.firmGstin = hasExternalReceiverForUpdate ? ((client as any).gstin || null) : org.gstin;
    (existing as any).props.subtotal = subtotal;
    (existing as any).props.discountType = discountAmount > 0 ? 'flat' : null;
    (existing as any).props.discountValue = discountAmount;
    (existing as any).props.discountAmount = discountAmount;
    (existing as any).props.cgstAmount = cgstAmount;
    (existing as any).props.sgstAmount = sgstAmount;
    (existing as any).props.igstAmount = igstAmount;
    (existing as any).props.roundOff = roundOff;
    (existing as any).props.totalAmount = totalAmount;
    (existing as any).props.amountPaid = amountPaid;
    (existing as any).props.balanceDue = Math.max(totalAmount - amountPaid, 0);
    (existing as any).props.notes = Object.prototype.hasOwnProperty.call(data, 'notes') ? data.notes : existing.notes;
    (existing as any).props.internalNotes = Object.prototype.hasOwnProperty.call(data, 'internalNotes') ? data.internalNotes : existing.internalNotes;
    (existing as any).props.receiverName = receiverNameForUpdate || null;
    (existing as any).props.receiverAddress = receiverAddressForUpdate || null;
    (existing as any).props.lineItems = itemsWithAmounts.map((item: any, index: number) => {
      const liResult = InvoiceLineItem.create({
        invoiceId: existing.id,
        serviceTemplateId: item.serviceTemplateId ?? null,
        itemId: item.itemId ?? null,
        variantId: item.variantId ?? null,
        warehouseId: item.warehouseId ?? null,
        batchNo: item.batchNo ?? item.serialNo ?? null,
        trackInventory: item.trackInventory === true,
        description: item.description,
        sacCode: item.sacCode,
        quantity: item.quantity,
        unitRate: item.unitRate,
        amount: item.amount,
        sortOrder: index,
      });
      if (liResult.isFailure) throw new AppError(liResult.getError() as string, 500);
      return liResult.getValue();
    });

    return this.invoiceRepo.save(existing);
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

    const oldStatus = invoice.status;

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

    const saved = await this.invoiceRepo.save(invoice);

    if (saved.status === 'issued' || saved.status === 'paid') {
      await this.syncToSalesRegister(saved.id, organizationId);
      await this.syncInventoryForIssuedInvoice(saved, organizationId, adminId);
    } else if (saved.status === 'cancelled' && (oldStatus === 'issued' || oldStatus === 'paid')) {
      // Remove from sales register if cancelled after being issued/paid
      await ClientSale.destroy({ where: { invoiceNo: saved.invoiceNumber, organizationId } });
      await this.reverseInventoryForCancelledInvoice(saved, organizationId, adminId);
    }

    return saved;
  }

  /**
   * Synchronize an Invoice (Tax Invoice) to the Compliance Sales Register (ClientSale).
   * This ensures that billing data flows automatically into GST computations.
   */
  private async syncToSalesRegister(invoiceId: string, organizationId: string) {
    const invoice = await this.invoiceRepo.findById(invoiceId, organizationId);
    if (!invoice || invoice.status === 'draft') return;

    const client = await this.clientRepo.findById(invoice.clientId);
    if (!client) return;

    // 1. Clear existing entries for this invoice to prevent duplicates
    await ClientSale.destroy({ 
      where: { 
        invoiceNo: invoice.invoiceNumber, 
        organizationId,
        clientId: invoice.clientId
      } 
    });

    const isB2B = !!invoice.clientGstin;
    const invDate = new Date(invoice.invoiceDate);

    // 2. Map line items to ClientSale entries
    const salesProfiles = invoice.lineItems.map(item => {
      // Basic split of tax for the line item (pro-rata based on amount)
      const ratio = item.amount / (invoice.subtotal || 1);
      
      return {
        clientId: invoice.clientId,
        organizationId,
        invoiceNo: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerName: invoice.receiverName || (client as any).name || (client as any).businessName || 'Client',
        description: item.description,
        hsnSacCode: item.sacCode,
        quantity: item.quantity,
        rate: item.unitRate,
        baseAmount: item.amount,
        gstRate: invoice.subtotal > 0 ? Number(((invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount) / invoice.subtotal * 100).toFixed(2)) : 18,
        month: getMonthFromDate(invDate),
        financialYear: getFinancialYear(invDate),
        gstin: invoice.clientGstin,
        invoiceType: isB2B ? 'B2B' : 'B2C',
        placeOfSupply: invoice.placeOfSupply,
        cgstAmount: invoice.cgstAmount * ratio,
        sgstAmount: invoice.sgstAmount * ratio,
        igstAmount: invoice.igstAmount * ratio,
        cessAmount: 0,
        isNilRated: (invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount) <= 0,
        isAdvance: false,
        status: 'validated', // Automatic sync from issued invoice is considered validated
        notes: `Auto-synced from Invoice ${invoice.invoiceNumber}`
      };
    });

    if (salesProfiles.length > 0) {
      await ClientSale.bulkCreate(salesProfiles);
    }
  }

  private async syncInventoryForIssuedInvoice(invoice: Invoice, organizationId: string, adminId: string) {
    const trackedItems = invoice.lineItems.filter(
      (item) => item.trackInventory === true && item.itemId && item.warehouseId,
    );
    if (trackedItems.length === 0) return;

    const existingMovements = await StockLedgerModel.count({
      where: {
        orgId: organizationId,
        referenceType: 'invoice',
        referenceId: invoice.id,
        transactionType: 'sale',
      },
    });
    if (existingMovements > 0) return;

    const stockService = container.resolve(StockService);
    for (const item of trackedItems) {
      await stockService.recordMovement({
        orgId: organizationId,
        warehouseId: item.warehouseId!,
        itemId: item.itemId!,
        variantId: item.variantId ?? null,
        transactionType: 'sale',
        referenceType: 'invoice',
        referenceId: invoice.id,
        clientId: invoice.clientId,
        batchNo: item.batchNo ?? null,
        qtyIn: 0,
        qtyOut: Number(item.quantity),
        rate: Number(item.unitRate),
        transactionDate: invoice.invoiceDate,
        notes: `Invoice ${invoice.invoiceNumber}`,
        createdBy: adminId,
      });
    }
  }

  private async reverseInventoryForCancelledInvoice(invoice: Invoice, organizationId: string, adminId: string) {
    const existingReversals = await StockLedgerModel.count({
      where: {
        orgId: organizationId,
        referenceType: 'invoice',
        referenceId: invoice.id,
        transactionType: 'return',
      },
    });
    if (existingReversals > 0) return;

    const saleMovements = await StockLedgerModel.findAll({
      where: {
        orgId: organizationId,
        referenceType: 'invoice',
        referenceId: invoice.id,
        transactionType: 'sale',
      },
      order: [['created_at', 'ASC']],
    });
    if (saleMovements.length === 0) return;

    const stockService = container.resolve(StockService);
    for (const movement of saleMovements) {
      await stockService.recordMovement({
        orgId: organizationId,
        warehouseId: movement.warehouseId,
        itemId: movement.itemId,
        variantId: movement.variantId ?? null,
        transactionType: 'return',
        referenceType: 'invoice',
        referenceId: invoice.id,
        clientId: invoice.clientId,
        batchNo: movement.batchNo ?? null,
        qtyIn: Number(movement.qtyOut),
        qtyOut: 0,
        rate: Number(movement.rate),
        transactionDate: new Date(),
        notes: `Inventory reversal for cancelled invoice ${invoice.invoiceNumber}`,
        createdBy: adminId,
      });
    }
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

  async getServiceTemplates(organizationId: string, clientId?: string) {
    const where: any = {
      isActive: true,
      [Op.or]: [
        { organizationId },
        { organizationId: null },
        { isSystem: true }
      ]
    };

    if (clientId) {
      where[Op.or].push({ clientId });
    }

    const templates = await ServiceTemplateModel.findAll({
      where,
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

  async getRecurringTemplates(organizationId: string) {
    // Stub or implementation for recurring templates
    return [];
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
    const financialYear = getFinancialYear(new Date());
    const newInvoiceNumber = await this.invoiceRepo.generateNextInvoiceNumber(organizationId, financialYear);

    // Get raw line items to recompute GST
    const lineItems = (existing as any).lineItems || [];
    const itemsForGst = lineItems.map((li: any) => ({
      quantity: li.quantity,
      unitRate: li.unitRate,
      amount: li.amount,
    }));

    const taxCalc = calculateGST(itemsForGst, (client as any).stateCode, org.stateCode);

    // Update via repository
    (existing as any).props.invoiceType = 'tax_invoice';
    (existing as any).props.invoiceNumber = newInvoiceNumber;
    (existing as any).props.cgstAmount = (taxCalc as any).cgst || 0;
    (existing as any).props.sgstAmount = (taxCalc as any).sgst || 0;
    (existing as any).props.igstAmount = (taxCalc as any).igst || 0;
    (existing as any).props.totalAmount = (taxCalc as any).total || 0;
    (existing as any).props.balanceDue = (taxCalc as any).total || 0;
    (existing as any).props.issuedBy = adminId;
    (existing as any).props.status = 'issued';
    (existing as any).props.issuedAt = new Date();

    const saved = await this.invoiceRepo.save(existing);
    
    // Sync to sales register
    await this.syncToSalesRegister(saved.id, organizationId);
    await this.syncInventoryForIssuedInvoice(saved, organizationId, adminId);

    return saved;
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateInvoiceAmounts(
  lineItems: any[],
  isQuotation: boolean,
  gstType: 'CGST_SGST' | 'IGST',
  invoiceLevelDiscount = 0,
) {
  const subtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitRate || 0), 0),
  );
  const lineDiscount = lineItems.reduce((sum, item) => {
    const base = Number(item.quantity || 0) * Number(item.unitRate || 0);
    return sum + base * (Number(item.discountPct || 0) / 100);
  }, 0);
  const discountAmount = roundMoney(lineDiscount + Number(invoiceLevelDiscount || 0));
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = isQuotation
    ? 0
    : roundMoney(
        lineItems.reduce((sum, item) => {
          const base = Number(item.quantity || 0) * Number(item.unitRate || 0);
          const discount = base * (Number(item.discountPct || 0) / 100);
          const taxable = Math.max(base - discount, 0);
          return sum + taxable * (Number(item.gstRate ?? 18) / 100);
        }, 0),
      );

  const cgstAmount = gstType === 'CGST_SGST' ? roundMoney(taxAmount / 2) : 0;
  const sgstAmount = gstType === 'CGST_SGST' ? roundMoney(taxAmount / 2) : 0;
  const igstAmount = gstType === 'IGST' ? taxAmount : 0;
  const totalBeforeRounding = taxableAmount + taxAmount;
  const totalAmount = Math.round(totalBeforeRounding);

  return {
    subtotal,
    discountAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff: roundMoney(totalAmount - totalBeforeRounding),
    totalAmount,
  };
}
