import { injectable } from 'tsyringe';
import { EWayBill } from '../../../../models/eway-bill.model';
import { Invoice } from '../../../../models/invoice.model';
import { Organization } from '../../../../models/organization.model';
import { InvoiceLineItem } from '../../../../models/InvoiceLineItem.model';
import { Client } from '../../../../models/client.model';
import { logger } from '../../../../utils/logger';
import { AppError } from '../../../../utils/errors';

// NIC E-Way Bill Sandbox Base URL
const NIC_SANDBOX_BASE = 'https://gsp.adaequare.com/test';

@injectable()
export class EWayBillService {
  /**
   * Generate an e-way bill for an invoice.
   */
  async generateEWayBill(
    organizationId: string,
    invoiceId: string,
    transportDetails: {
      transporterId?: string;
      vehicleNo?: string;
      distanceKm: number;
      transportMode: 'road' | 'rail' | 'air' | 'ship';
    }
  ) {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, organizationId },
      include: [
        { model: InvoiceLineItem, as: 'lineItems' },
        { model: Client, as: 'client' },
      ],
    });
    if (!invoice) throw new AppError('Invoice not found', 404);

    const org = await Organization.findByPk(organizationId);
    if (!org) throw new AppError('Organization not found', 404);

    // Check if e-way bill already exists
    const existing = await EWayBill.findOne({
      where: { invoiceId, organizationId, status: 'generated' },
    });
    if (existing) throw new AppError('E-way bill already generated for this invoice', 400);

    // Build NIC e-way bill payload
    const client = (invoice as any).client;
    const payload = {
      supplyType: 'O', // Outward
      subSupplyType: '1', // Supply
      docType: 'INV',
      docNo: invoice.invoiceNumber,
      docDate: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      fromGstin: org.gstin || '',
      fromTrdName: org.name,
      fromAddr1: org.address || '',
      fromPlace: '',
      fromPincode: 0,
      fromStateCode: parseInt(org.stateCode) || 24,
      toGstin: client?.gstin || 'URP',
      toTrdName: client?.name || '',
      toAddr1: client?.address || '',
      toPlace: client?.city || '',
      toPincode: parseInt(client?.pincode || '0'),
      toStateCode: parseInt(client?.stateCode || '24'),
      totalValue: Number(invoice.subtotal),
      cgstValue: Number(invoice.cgstAmount),
      sgstValue: Number(invoice.sgstAmount),
      igstValue: Number(invoice.igstAmount),
      cessValue: 0,
      totInvValue: Number(invoice.totalAmount),
      transporterId: transportDetails.transporterId || '',
      transporterName: '',
      transDocNo: '',
      transMode: this.mapTransportMode(transportDetails.transportMode),
      transDistance: transportDetails.distanceKm.toString(),
      vehicleNo: transportDetails.vehicleNo || '',
      vehicleType: 'R', // Regular
      itemList: ((invoice as any).lineItems || []).map((item: any, idx: number) => ({
        productName: item.description,
        hsnCode: item.sacCode || '999900',
        quantity: Number(item.quantity),
        qtyUnit: 'NOS',
        taxableAmount: Number(item.amount),
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 0,
        cessRate: 0,
      })),
    };

    // Call NIC Sandbox API (simulated)
    let rawResponse: any = {};
    let ewayBillNo: string | null = null;
    let validUpto: Date | null = null;
    let status: 'generated' | 'cancelled' = 'generated';
    let errorMessage: string | null = null;

    try {
      // In production, this would be an actual API call to NIC
      // For sandbox, we simulate a successful response
      const simulatedResponse = {
        ewayBillNo: `EWB${Date.now()}${Math.floor(Math.random() * 1000)}`,
        ewayBillDate: new Date().toISOString(),
        validUpto: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        status: 1,
      };

      rawResponse = simulatedResponse;
      ewayBillNo = simulatedResponse.ewayBillNo;
      validUpto = new Date(simulatedResponse.validUpto);

      logger.info(`E-way bill generated: ${ewayBillNo} for invoice ${invoice.invoiceNumber}`);
    } catch (err: any) {
      errorMessage = err.message;
      logger.error(`E-way bill generation failed for invoice ${invoiceId}: ${err.message}`);
    }

    const ewayBill = await EWayBill.create({
      organizationId,
      invoiceId,
      ewayBillNo,
      generatedAt: ewayBillNo ? new Date() : null,
      validUpto,
      transporterId: transportDetails.transporterId || null,
      vehicleNo: transportDetails.vehicleNo || null,
      distanceKm: transportDetails.distanceKm,
      transportMode: transportDetails.transportMode,
      status: ewayBillNo ? 'generated' : 'cancelled',
      rawResponse,
      errorMessage,
    } as any);

    return ewayBill;
  }

  /**
   * Cancel an e-way bill.
   */
  async cancelEWayBill(organizationId: string, ewayBillNo: string, reason: string) {
    const ewayBill = await EWayBill.findOne({
      where: { ewayBillNo, organizationId, status: 'generated' },
    });
    if (!ewayBill) throw new AppError('E-way bill not found or already cancelled', 404);

    // In production: call NIC cancel API
    await ewayBill.update({
      status: 'cancelled',
      rawResponse: { ...ewayBill.rawResponse, cancelReason: reason, cancelledAt: new Date() },
    });

    logger.info(`E-way bill ${ewayBillNo} cancelled`);
    return ewayBill;
  }

  /**
   * Update vehicle number on an e-way bill.
   */
  async updateVehicle(organizationId: string, ewayBillNo: string, vehicleNo: string) {
    const ewayBill = await EWayBill.findOne({
      where: { ewayBillNo, organizationId, status: 'generated' },
    });
    if (!ewayBill) throw new AppError('E-way bill not found', 404);

    await ewayBill.update({ vehicleNo });
    logger.info(`E-way bill ${ewayBillNo} vehicle updated to ${vehicleNo}`);
    return ewayBill;
  }

  /**
   * Get e-way bill(s) for a specific invoice.
   */
  async getByInvoice(organizationId: string, invoiceId: string) {
    return await EWayBill.findAll({
      where: { invoiceId, organizationId },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Check if an invoice requires an e-way bill (value > ₹50,000 and HSN codes present).
   */
  async shouldPromptEWayBill(invoiceId: string, organizationId: string): Promise<boolean> {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, organizationId },
      include: [{ model: InvoiceLineItem, as: 'lineItems' }],
    });
    if (!invoice) return false;

    const totalAmount = Number(invoice.totalAmount);
    const hasHsnCodes = ((invoice as any).lineItems || []).some(
      (li: any) => li.sacCode && li.sacCode.length <= 8 // HSN codes are 4-8 digits
    );

    return totalAmount > 50000 && hasHsnCodes;
  }

  private mapTransportMode(mode: string): string {
    const map: Record<string, string> = { road: '1', rail: '2', air: '3', ship: '4' };
    return map[mode] || '1';
  }
}
