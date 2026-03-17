import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { BillingService } from '../../application/services/BillingService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class BillingController {
  
  static createInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const invoice = await service.createInvoice(req.user!.organizationId, req.user!.userId, req.body);
    
    // We can map this to DTO or JSON
    const responseData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      status: invoice.status
    };
    sendCreated(res, responseData, 'Invoice created successfully');
  });

  static getInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const { status, clientId, search, page = 1, limit = 10, sortBy, sortOrder = 'desc' } = req.query;

    const { invoices, total } = await service.getInvoices(
      req.user!.organizationId,
      { status: status as string, clientId: clientId as string, search: search as string },
      { page: Number(page), limit: Number(limit), sortBy: sortBy as string, sortOrder: sortOrder as any }
    );
    
    const formatted = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      date: inv.invoiceDate,
      total: inv.totalAmount,
      balance: inv.balanceDue
    }));

    sendPaginated(res, formatted, Number(page), Number(limit), total);
  });

  static getInvoiceById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const invoice = await service.getInvoiceById(req.user!.organizationId, req.params.id);
    
    const plain = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      cgst: invoice.cgstAmount,
      sgst: invoice.sgstAmount,
      igst: invoice.igstAmount,
      roundOff: invoice.roundOff,
      total: invoice.totalAmount,
      balanceDue: invoice.balanceDue,
      lineItems: invoice.lineItems.map(item => ({
        description: item.description,
        sacCode: item.sacCode,
        quantity: item.quantity,
        unitRate: item.unitRate,
        amount: item.amount
      }))
    };
    sendSuccess(res, plain);
  });

  static generatePdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const result = await service.generatePdf(req.user!.organizationId, req.params.id);
    sendSuccess(res, result, 'PDF generated successfully');
  });

  static updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const invoice = await service.updateStatus(req.user!.organizationId, req.params.id, req.user!.userId, req.body);
    sendSuccess(res, { status: invoice.status });
  });

  static getMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const metrics = await service.getMetrics(req.user!.organizationId);
    sendSuccess(res, metrics);
  });

  static getServiceTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const templates = await service.getServiceTemplates(req.user!.organizationId);
    sendSuccess(res, templates);
  });
}
