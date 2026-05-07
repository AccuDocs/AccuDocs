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
      invoiceType: raw.invoiceType,
      invoiceNumber: raw.invoiceNumber,
      status: raw.status as any,
      invoiceDate: raw.invoiceDate,
      dueDate: raw.dueDate,
      expiryDate: raw.expiryDate,
      issuedAt: raw.issuedAt,
      paidAt: raw.paidAt,
      cancelledAt: raw.cancelledAt,
      gstType: raw.gstType as any,
      placeOfSupply: raw.placeOfSupply,
      clientGstin: raw.clientGstin,
      firmGstin: raw.firmGstin,
      subtotal: typeof raw.subtotal === 'string' ? parseFloat(raw.subtotal) : raw.subtotal,
      discountType: raw.discountType,
      discountValue: typeof raw.discountValue === 'string' ? parseFloat(raw.discountValue) : raw.discountValue,
      discountAmount: typeof raw.discountAmount === 'string' ? parseFloat(raw.discountAmount) : raw.discountAmount,
      cgstAmount: typeof raw.cgstAmount === 'string' ? parseFloat(raw.cgstAmount) : raw.cgstAmount,
      sgstAmount: typeof raw.sgstAmount === 'string' ? parseFloat(raw.sgstAmount) : raw.sgstAmount,
      igstAmount: typeof raw.igstAmount === 'string' ? parseFloat(raw.igstAmount) : raw.igstAmount,
      roundOff: typeof raw.roundOff === 'string' ? parseFloat(raw.roundOff) : raw.roundOff,
      totalAmount: typeof raw.totalAmount === 'string' ? parseFloat(raw.totalAmount) : raw.totalAmount,
      amountPaid: typeof raw.amountPaid === 'string' ? parseFloat(raw.amountPaid) : raw.amountPaid,
      balanceDue: typeof raw.balanceDue === 'string' ? parseFloat(raw.balanceDue) : raw.balanceDue,
      notes: raw.notes,
      receiverName: raw.receiverName,
      receiverAddress: raw.receiverAddress,
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
      invoiceType: invoice.invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      expiryDate: invoice.expiryDate,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
      cancelledAt: invoice.cancelledAt,
      gstType: invoice.gstType,
      placeOfSupply: invoice.placeOfSupply,
      clientGstin: invoice.clientGstin,
      firmGstin: invoice.firmGstin,
      subtotal: invoice.subtotal,
      discountType: invoice.discountType,
      discountValue: invoice.discountValue,
      discountAmount: invoice.discountAmount,
      cgstAmount: invoice.cgstAmount,
      sgstAmount: invoice.sgstAmount,
      igstAmount: invoice.igstAmount,
      roundOff: invoice.roundOff,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      // Postgres generates balanceDue and amount automatically for line items
      notes: invoice.notes,
      receiverName: invoice.receiverName,
      receiverAddress: invoice.receiverAddress,
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
