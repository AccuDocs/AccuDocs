import { Invoice } from "../../domain/entities/Invoice";
import { InvoiceLineItem } from "../../domain/entities/InvoiceLineItem";

export class InvoiceMapper {
  public static toDomain(raw: any): Invoice {
    const lineItems = (raw.lineItems || []).map((li: any) => {
      const liProps = {
        invoiceId: li.invoiceId,
        serviceTemplateId: li.serviceTemplateId,
        itemId: li.itemId,
        variantId: li.variantId,
        warehouseId: li.warehouseId,
        batchNo: li.batchNo,
        trackInventory: li.trackInventory,
        description: li.description,
        sacCode: li.sacCode,
        quantity: typeof li.quantity === 'string' ? parseFloat(li.quantity) : li.quantity,
        unitRate: typeof li.unitRate === 'string' ? parseFloat(li.unitRate) : li.unitRate,
        amount: typeof li.amount === 'string' ? parseFloat(li.amount) : li.amount,
        sortOrder: li.sortOrder
      };
      return InvoiceLineItem.create(liProps, li.id).getValue();
    });

    const props = {
      organizationId: raw.organizationId,
      clientId: raw.clientId,
      recurringTemplateId: raw.recurringTemplateId,
      invoiceNumber: raw.invoiceNumber,
      status: raw.status as any,
      invoiceDate: raw.invoiceDate,
      dueDate: raw.dueDate,
      issuedAt: raw.issuedAt,
      paidAt: raw.paidAt,
      cancelledAt: raw.cancelledAt,
      gstType: raw.gstType as any,
      placeOfSupply: raw.placeOfSupply,
      clientGstin: raw.clientGstin,
      firmGstin: raw.firmGstin,
      subtotal: typeof raw.subtotal === 'string' ? parseFloat(raw.subtotal) : raw.subtotal,
      cgstAmount: typeof raw.cgstAmount === 'string' ? parseFloat(raw.cgstAmount) : raw.cgstAmount,
      sgstAmount: typeof raw.sgstAmount === 'string' ? parseFloat(raw.sgstAmount) : raw.sgstAmount,
      igstAmount: typeof raw.igstAmount === 'string' ? parseFloat(raw.igstAmount) : raw.igstAmount,
      roundOff: typeof raw.roundOff === 'string' ? parseFloat(raw.roundOff) : raw.roundOff,
      totalAmount: typeof raw.totalAmount === 'string' ? parseFloat(raw.totalAmount) : raw.totalAmount,
      amountPaid: typeof raw.amountPaid === 'string' ? parseFloat(raw.amountPaid) : raw.amountPaid,
      balanceDue: typeof raw.balanceDue === 'string' ? parseFloat(raw.balanceDue) : raw.balanceDue,
      notes: raw.notes,
      cancelReason: raw.cancelReason,
      internalNotes: raw.internalNotes,
      pdfS3Key: raw.pdfS3Key,
      pdfGeneratedAt: raw.pdfGeneratedAt,
      whatsappSentAt: raw.whatsappSentAt,
      whatsappSentBy: raw.whatsappSentBy,
      emailSentAt: raw.emailSentAt,
      createdBy: raw.createdBy,
      issuedBy: raw.issuedBy,
      cancelledBy: raw.cancelledBy,
      lineItems,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
    
    return Invoice.create(props, raw.id).getValue();
  }

  public static toPersistence(invoice: Invoice): any {
    return {
      id: invoice.id,
      organizationId: invoice.organizationId,
      clientId: invoice.clientId,
      recurringTemplateId: invoice.recurringTemplateId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
      cancelledAt: invoice.cancelledAt,
      gstType: invoice.gstType,
      placeOfSupply: invoice.placeOfSupply,
      clientGstin: invoice.clientGstin,
      firmGstin: invoice.firmGstin,
      subtotal: invoice.subtotal,
      cgstAmount: invoice.cgstAmount,
      sgstAmount: invoice.sgstAmount,
      igstAmount: invoice.igstAmount,
      roundOff: invoice.roundOff,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      // Postgres generates balanceDue and amount automatically for line items
      notes: invoice.notes,
      cancelReason: invoice.cancelReason,
      internalNotes: invoice.internalNotes,
      pdfS3Key: invoice.pdfS3Key,
      pdfGeneratedAt: invoice.pdfGeneratedAt,
      whatsappSentAt: invoice.whatsappSentAt,
      whatsappSentBy: invoice.whatsappSentBy,
      emailSentAt: invoice.emailSentAt,
      createdBy: invoice.createdBy,
      issuedBy: invoice.issuedBy,
      cancelledBy: invoice.cancelledBy
    };
  }

  public static toPersistenceLineItem(item: InvoiceLineItem): any {
    return {
      id: item.id,
      invoiceId: item.invoiceId,
      serviceTemplateId: item.serviceTemplateId,
      itemId: item.itemId,
      variantId: item.variantId,
      warehouseId: item.warehouseId,
      batchNo: item.batchNo,
      trackInventory: item.trackInventory === true,
      description: item.description,
      sacCode: item.sacCode,
      quantity: item.quantity,
      unitRate: item.unitRate,
      sortOrder: item.sortOrder
    };
  }
}
