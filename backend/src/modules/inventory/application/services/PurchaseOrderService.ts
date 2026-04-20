import { injectable, inject } from 'tsyringe';
import { IPurchaseOrderRepository } from '../../domain/repositories/IPurchaseOrderRepository';
import { IStockLedgerRepository } from '../../domain/repositories/IStockLedgerRepository';
import { PurchaseOrder } from '../../domain/entities/PurchaseOrder.entity';
import { StockService } from './StockService';
import { AppError } from '../../../../utils/errors';
import {
  PurchaseOrder as PurchaseOrderModel,
  PurchaseOrderItem as PurchaseOrderItemModel,
  Client as ClientModel,
  Warehouse as WarehouseModel,
} from '../../../../models';

@injectable()
export class PurchaseOrderService {
  constructor(
    @inject('IPurchaseOrderRepository') private poRepo: IPurchaseOrderRepository,
    @inject('IStockLedgerRepository') private stockLedgerRepo: IStockLedgerRepository,
  ) {}

  private stockService = new (class {
    // Lazy-resolved to avoid circular DI; injected at call site when needed
  })();

  // ─── Create PO ────────────────────────────────────────────────────────────────

  async createPO(orgId: string, userId: string, data: any): Promise<any> {
    // Validate supplier is a client of this org
    const supplier = await ClientModel.findOne({ where: { id: data.supplierClientId, organizationId: orgId } });
    if (!supplier) throw new AppError('Supplier client not found', 404);

    const warehouse = await WarehouseModel.findOne({ where: { id: data.warehouseId, orgId } });
    if (!warehouse) throw new AppError('Warehouse not found', 404);

    const poNumber = await this.poRepo.generatePoNumber(orgId);

    // Compute totals from line items
    let subtotal = 0;
    let gstAmount = 0;
    const lineItems = (data.lineItems ?? []).map((li: any) => {
      const lineTotal = Number(li.qtyOrdered) * Number(li.unitPrice);
      const lineGst = lineTotal * (Number(li.gstRate ?? 18) / 100);
      subtotal += lineTotal;
      gstAmount += lineGst;
      return {
        itemId: li.itemId,
        variantId: li.variantId ?? null,
        hsnSacCode: li.hsnSacCode ?? null,
        qtyOrdered: Number(li.qtyOrdered),
        qtyReceived: 0,
        unitPrice: Number(li.unitPrice),
        gstRate: Number(li.gstRate ?? 18),
        gstAmount: lineGst,
        total: lineTotal + lineGst,
        batchNo: li.batchNo ?? null,
        expectedDate: li.expectedDate ?? null,
      };
    });

    const poResult = PurchaseOrder.create({
      orgId,
      branchId: data.branchId ?? null,
      supplierClientId: data.supplierClientId,
      poNumber,
      poDate: data.poDate ? new Date(data.poDate) : new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      warehouseId: data.warehouseId,
      status: 'draft',
      subtotal,
      gstAmount,
      total: subtotal + gstAmount,
      notes: data.notes ?? null,
      createdBy: userId,
    });
    if (poResult.isFailure) throw new AppError(poResult.getError() as string, 400);

    return this.poRepo.save(poResult.getValue(), lineItems);
  }

  // ─── Get POs ──────────────────────────────────────────────────────────────────

  async getPOs(orgId: string, filters: any, pagination: any) {
    return this.poRepo.findAll(orgId, filters, pagination);
  }

  async getPOById(orgId: string, id: string) {
    const po = await this.poRepo.findById(id, orgId);
    if (!po) throw new AppError('Purchase Order not found', 404);
    return po;
  }

  // ─── Get POs for a client (workspace integration) ─────────────────────────────

  async getByClient(orgId: string, clientId: string) {
    const client = await ClientModel.findOne({ where: { id: clientId, organizationId: orgId } });
    if (!client) throw new AppError('Client not found', 404);
    return this.poRepo.findByClient(clientId, orgId);
  }

  // ─── Status changes ───────────────────────────────────────────────────────────

  async sendPO(orgId: string, id: string) {
    const po = await this.poRepo.findById(id, orgId);
    if (!po) throw new AppError('Purchase Order not found', 404);
    if (po.status !== 'draft') throw new AppError('Only draft POs can be sent', 422);
    (po as any).props.status = 'sent';
    return this.poRepo.save(po);
  }

  async cancelPO(orgId: string, id: string) {
    const po = await this.poRepo.findById(id, orgId);
    if (!po) throw new AppError('Purchase Order not found', 404);
    if (po.status === 'received') throw new AppError('Cannot cancel a fully received PO', 422);
    (po as any).props.status = 'cancelled';
    return this.poRepo.save(po);
  }

  // ─── Receive Items (triggers stock movement) ──────────────────────────────────

  async receiveItems(orgId: string, poId: string, userId: string, receivedItems: Array<{
    poItemId: string;
    qtyReceived: number;
    batchNo?: string;
  }>, stockService: StockService) {
    const po = await PurchaseOrderModel.findOne({
      where: { id: poId, orgId },
      include: [{ model: PurchaseOrderItemModel, as: 'items' }],
    });
    if (!po) throw new AppError('Purchase Order not found', 404);
    if (po.status === 'cancelled') throw new AppError('PO is cancelled', 422);
    if (po.status === 'received') throw new AppError('PO is already fully received', 422);

    const poRaw = po as any;

    for (const recv of receivedItems) {
      const poItem = (poRaw.items ?? []).find((i: any) => i.id === recv.poItemId);
      if (!poItem) throw new AppError(`PO item ${recv.poItemId} not found`, 404);

      const newQtyReceived = Number(poItem.qtyReceived) + Number(recv.qtyReceived);
      if (newQtyReceived > Number(poItem.qtyOrdered)) {
        throw new AppError(`Received qty exceeds ordered qty for item ${poItem.itemId}`, 422);
      }

      // Update PO item received qty
      await PurchaseOrderItemModel.update(
        { qtyReceived: newQtyReceived },
        { where: { id: recv.poItemId } },
      );

      // Record stock movement — client_id = supplier
      await stockService.recordMovement({
        orgId,
        warehouseId: po.warehouseId,
        itemId: poItem.itemId,
        variantId: poItem.variantId ?? null,
        transactionType: 'purchase',
        referenceType: 'purchase_order',
        referenceId: poId,
        clientId: po.supplierClientId,   // ← supplier is a client record
        batchNo: recv.batchNo ?? poItem.batchNo ?? null,
        qtyIn: Number(recv.qtyReceived),
        qtyOut: 0,
        rate: Number(poItem.unitPrice),
        createdBy: userId,
        transactionDate: new Date(),
      });
    }

    // Recompute PO status
    const updatedPO = await PurchaseOrderModel.findOne({
      where: { id: poId },
      include: [{ model: PurchaseOrderItemModel, as: 'items' }],
    });
    const updatedRaw = updatedPO as any;
    const allReceived = (updatedRaw.items ?? []).every(
      (i: any) => Number(i.qtyReceived) >= Number(i.qtyOrdered),
    );
    const anyReceived = (updatedRaw.items ?? []).some((i: any) => Number(i.qtyReceived) > 0);

    await PurchaseOrderModel.update(
      { status: allReceived ? 'received' : anyReceived ? 'partial' : po.status },
      { where: { id: poId } },
    );

    return this.poRepo.findById(poId, orgId);
  }

  // ─── Generate PO from reorder alerts ─────────────────────────────────────────

  async generateFromReorder(orgId: string, userId: string, warehouseId: string, supplierClientId: string, stockAlerts: any[]) {
    const lineItems = stockAlerts.map((a: any) => ({
      itemId: a.itemId,
      qtyOrdered: a.reorderQty ?? 10,
      unitPrice: 0,   // to be confirmed with supplier
      gstRate: 18,
      hsnSacCode: null,
    }));

    return this.createPO(orgId, userId, {
      supplierClientId,
      warehouseId,
      lineItems,
      notes: 'Auto-generated from reorder alerts',
    });
  }
}
