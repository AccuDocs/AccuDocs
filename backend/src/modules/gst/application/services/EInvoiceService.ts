import { injectable } from 'tsyringe';
import { EInvoice } from '../../../../models/e-invoice.model';
import { Invoice } from '../../../../models/invoice.model';
import { Organization } from '../../../../models/organization.model';
import { InvoiceLineItem } from '../../../../models/InvoiceLineItem.model';
import { Client } from '../../../../models/client.model';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../utils/errors';

// IRP Sandbox Base URL
const IRP_SANDBOX_BASE = 'https://gsp.adaequare.com/test/enriched/ei/api';

@injectable()
export class EInvoiceService {
  /**
   * Generate IRN for an invoice.
   */
  async generateIRN(organizationId: string, invoiceId: string) {
    const org = await Organization.findByPk(organizationId);
    if (!org) throw new AppError('Organization not found', 404);

    // Threshold check: only for orgs with turnover > 5Cr
    if (!org.turnoverAbove5Cr) {
      throw new AppError('E-invoice is applicable only for organizations with turnover above ₹5 Crore', 400);
    }

    const invoice = await Invoice.findOne({
      where: { id: invoiceId, organizationId },
      include: [
        { model: InvoiceLineItem, as: 'lineItems' },
        { model: Client, as: 'client' },
      ],
    });
    if (!invoice) throw new AppError('Invoice not found', 404);

    // Check if IRN already exists
    const existing = await EInvoice.findOne({
      where: { invoiceId, organizationId, status: 'generated' },
    });
    if (existing) throw new AppError('IRN already generated for this invoice', 400);

    // Build GST e-invoice schema v1.1 payload
    const client = (invoice as any).client;
    const lineItems = (invoice as any).lineItems || [];

    const eInvoicePayload = this.buildIRNPayload(org, invoice, client, lineItems);

    // Call IRP Sandbox (simulated)
    let irn: string | null = null;
    let ackNo: string | null = null;
    let ackDate: Date | null = null;
    let signedInvoice: any = null;
    let signedQrCode: string | null = null;
    let status: 'generated' | 'failed' = 'generated';
    let errorMessage: string | null = null;
    let rawResponse: any = {};

    try {
      // Simulate IRP response
      const hash = this.generateIRNHash(org.gstin || '', invoice.invoiceNumber);
      const simulatedResponse = {
        Status: 1,
        Irn: hash,
        AckNo: `ACK${Date.now()}`,
        AckDt: new Date().toISOString(),
        SignedInvoice: eInvoicePayload,
        SignedQRCode: `IRN:${hash}|SellerGSTIN:${org.gstin}|BuyerGSTIN:${client?.gstin || 'URP'}|DocNo:${invoice.invoiceNumber}|DocDt:${invoice.invoiceDate}|TotInvVal:${invoice.totalAmount}`,
      };

      rawResponse = simulatedResponse;
      irn = simulatedResponse.Irn;
      ackNo = simulatedResponse.AckNo;
      ackDate = new Date(simulatedResponse.AckDt);
      signedInvoice = simulatedResponse.SignedInvoice;
      signedQrCode = simulatedResponse.SignedQRCode;

      logger.info(`E-invoice IRN generated: ${irn} for invoice ${invoice.invoiceNumber}`);
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message;
      logger.error(`E-invoice generation failed for invoice ${invoiceId}: ${err.message}`);
    }

    const eInvoice = await EInvoice.create({
      organizationId,
      invoiceId,
      irn,
      ackNo,
      ackDate,
      signedInvoice,
      signedQrCode,
      status,
      errorMessage,
      rawResponse,
    } as any);

    return eInvoice;
  }

  /**
   * Cancel an IRN.
   */
  async cancelIRN(organizationId: string, irn: string, reason: string, remarks: string) {
    const eInvoice = await EInvoice.findOne({
      where: { irn, organizationId, status: 'generated' },
    });
    if (!eInvoice) throw new AppError('E-invoice not found or already cancelled', 404);

    // In production: call IRP cancel API
    await eInvoice.update({
      status: 'cancelled',
      errorMessage: `Cancelled: ${reason} — ${remarks}`,
      rawResponse: {
        ...eInvoice.rawResponse,
        cancelReason: reason,
        cancelRemarks: remarks,
        cancelledAt: new Date(),
      },
    });

    logger.info(`E-invoice IRN ${irn} cancelled`);
    return eInvoice;
  }

  /**
   * Get e-invoice for a specific invoice.
   */
  async getByInvoice(organizationId: string, invoiceId: string) {
    return await EInvoice.findOne({
      where: { invoiceId, organizationId },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Build IRN JSON payload per GST e-invoice schema v1.1.
   */
  private buildIRNPayload(org: any, invoice: any, client: any, lineItems: any[]) {
    return {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: 'B2B',
        RegRev: 'N',
        EcmGstin: null,
        IgstOnIntra: 'N',
      },
      DocDtls: {
        Typ: 'INV',
        No: invoice.invoiceNumber,
        Dt: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }),
      },
      SellerDtls: {
        Gstin: org.gstin || '',
        LglNm: org.name,
        TrdNm: org.name,
        Addr1: org.address || '',
        Loc: '',
        Pin: 0,
        Stcd: org.stateCode || '24',
        Ph: org.phone || '',
        Em: org.email || '',
      },
      BuyerDtls: {
        Gstin: client?.gstin || 'URP',
        LglNm: client?.name || '',
        TrdNm: client?.name || '',
        Pos: client?.stateCode || '24',
        Addr1: client?.address || '',
        Loc: client?.city || '',
        Pin: parseInt(client?.pincode || '0'),
        Stcd: client?.stateCode || '24',
        Ph: client?.mobile || '',
        Em: client?.email || '',
      },
      ItemList: lineItems.map((item: any, idx: number) => ({
        SlNo: String(idx + 1),
        PrdDesc: item.description,
        IsServc: 'Y',
        HsnCd: item.sacCode || '999900',
        Qty: Number(item.quantity),
        FreeQty: 0,
        Unit: 'NOS',
        UnitPrice: Number(item.unitRate),
        TotAmt: Number(item.amount),
        Discount: 0,
        PreTaxVal: 0,
        AssAmt: Number(item.amount),
        GstRt: 18,
        IgstAmt: 0,
        CgstAmt: 0,
        SgstAmt: 0,
        CesRt: 0,
        CesAmt: 0,
        CesNonAdvlAmt: 0,
        StateCesRt: 0,
        StateCesAmt: 0,
        StateCesNonAdvlAmt: 0,
        OthChrg: 0,
        TotItemVal: Number(item.amount),
      })),
      ValDtls: {
        AssVal: Number(invoice.subtotal),
        CgstVal: Number(invoice.cgstAmount),
        SgstVal: Number(invoice.sgstAmount),
        IgstVal: Number(invoice.igstAmount),
        CesVal: 0,
        StCesVal: 0,
        Discount: Number(invoice.discountAmount || 0),
        OthChrg: 0,
        RndOffAmt: Number(invoice.roundOff || 0),
        TotInvVal: Number(invoice.totalAmount),
      },
    };
  }

  /**
   * Generate a simulated 64-character IRN hash.
   */
  private generateIRNHash(gstin: string, invoiceNo: string): string {
    const crypto = require('crypto');
    const input = `${gstin}|${invoiceNo}|${Date.now()}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}
