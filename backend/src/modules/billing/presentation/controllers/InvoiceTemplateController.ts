import { Response } from 'express';
import { container } from 'tsyringe';
import { InvoiceTemplateService } from '../../application/services/InvoiceTemplateService';
import { BillingService } from '../../application/services/BillingService';
import { sendSuccess, sendCreated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import {
  Invoice as InvoiceModel,
  InvoiceLineItem as InvoiceLineItemModel,
  Client as ClientModel,
  Organization as OrganizationModel,
} from '../../../../models';

const templateService = new InvoiceTemplateService();

/**
 * Builds the template hydration data dictionary for an invoice
 */
async function buildInvoiceTemplateData(invoiceId: string, orgId: string): Promise<Record<string, unknown>> {
  const invoice = await InvoiceModel.findOne({
    where: { id: invoiceId, organizationId: orgId },
    include: [
      { model: ClientModel, as: 'client', required: false },
      { model: InvoiceLineItemModel, as: 'lineItems', required: false },
    ],
  });

  if (!invoice) return {};

  const org = await OrganizationModel.findByPk(orgId);
  const raw = invoice as any;
  const client = raw.client;
  const lineItems: any[] = (raw.lineItems || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  // Build line items HTML rows
  const lineItemsRows = lineItems
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.description}</td>
        <td>${item.sacCode || ''}</td>
        <td>${item.quantity}</td>
        <td>₹${Number(item.unitRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>`
    )
    .join('');

  // Build tax rows
  const cgst = Number(invoice.cgstAmount) || 0;
  const sgst = Number(invoice.sgstAmount) || 0;
  const igst = Number(invoice.igstAmount) || 0;
  let taxRows = '';
  if (igst > 0) {
    taxRows += `<tr><td colspan="5" style="text-align:right">IGST</td><td>₹${igst.toFixed(2)}</td></tr>`;
  } else {
    if (cgst > 0) taxRows += `<tr><td colspan="5" style="text-align:right">CGST</td><td>₹${cgst.toFixed(2)}</td></tr>`;
    if (sgst > 0) taxRows += `<tr><td colspan="5" style="text-align:right">SGST</td><td>₹${sgst.toFixed(2)}</td></tr>`;
  }

  const notesSection = invoice.notes
    ? `<div style="margin-top:20px;font-size:12px;color:#64748b"><strong>Notes:</strong> ${invoice.notes}</div>`
    : '';

  const formatDate = (d: any) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  // Invoice type label
  const typeLabel: Record<string, string> = {
    tax_invoice: 'Tax Invoice',
    proforma: 'Proforma Invoice',
    quotation: 'Quotation',
    credit_note: 'Credit Note',
    debit_note: 'Debit Note',
  };

  return {
    firmName: org?.name || '',
    firmAddress: org?.address || '',
    firmGstin: org?.gstin || '',
    firmPan: org?.pan || '',
    firmEmail: org?.email || '',
    invoiceType: typeLabel[(invoice as any).invoiceType] || 'Tax Invoice',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDate(invoice.invoiceDate),
    dueDate: formatDate(invoice.dueDate),
    clientName: client?.name || '',
    clientAddress: [client?.address, client?.city, client?.pincode].filter(Boolean).join(', '),
    clientGstin: client?.gstin || '',
    gstType: invoice.gstType,
    placeOfSupply: invoice.placeOfSupply,
    subtotal: Number(invoice.subtotal).toFixed(2),
    cgstAmount: cgst.toFixed(2),
    sgstAmount: sgst.toFixed(2),
    igstAmount: igst.toFixed(2),
    roundOff: Number(invoice.roundOff).toFixed(2),
    totalAmount: Number(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    lineItemsRows,
    taxRows,
    notesSection,
    amountInWords: numberToWords(Number(invoice.totalAmount)),
    lineItemsDetailedRows: lineItemsRows, // same for detailed template variant
  };
}

function numberToWords(amount: number): string {
  if (!amount) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  let result = convert(intPart) + ' Rupees';
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
  return result + ' Only';
}

export class InvoiceTemplateController {
  static getTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templates = await templateService.getTemplates(req.user!.organizationId);
    sendSuccess(res, templates);
  });

  static getTemplateById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const template = await templateService.getTemplateById(req.params.id, req.user!.organizationId);
    sendSuccess(res, template);
  });

  static createTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, htmlContent, thumbnailUrl } = req.body;
    const template = await templateService.createTemplate(req.user!.organizationId, {
      name,
      htmlContent,
      thumbnailUrl,
    });
    sendCreated(res, template, 'Invoice template created');
  });

  static setDefault = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const template = await templateService.setDefault(req.user!.organizationId, req.params.id);
    sendSuccess(res, template, 'Default template updated');
  });

  static generatePdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const templateId = req.query.template_id as string | undefined;
    const orgId = req.user!.organizationId;

    const invoiceData = await buildInvoiceTemplateData(id, orgId);
    const pdfBuffer = await templateService.generatePdfBuffer(orgId, templateId, invoiceData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  });

  static convertToTax = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const invoice = await service.convertToTaxInvoice(
      req.user!.organizationId,
      req.params.id,
      req.user!.userId
    );
    sendSuccess(res, { id: (invoice as any).id, invoiceNumber: (invoice as any).invoiceNumber }, 'Converted to tax invoice');
  });
}
