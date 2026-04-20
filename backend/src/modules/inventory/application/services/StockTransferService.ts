import { injectable, inject } from 'tsyringe';
import { IStockTransferRepository } from '../../domain/repositories/IStockTransferRepository';
import { StockService } from './StockService';
import { AppError } from '../../../../utils/errors';
import {
  StockTransfer as StockTransferModel,
  StockTransferItem as StockTransferItemModel,
} from '../../../../models';

@injectable()
export class StockTransferService {
  constructor(
    @inject('IStockTransferRepository') private transferRepo: IStockTransferRepository,
  ) {}

  async createTransfer(orgId: string, userId: string, data: any) {
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new AppError('Source and destination warehouses must be different', 422);
    }

    const transferNo = await this.transferRepo.generateTransferNumber(orgId);
    const lineItems = (data.items ?? []).map((i: any) => ({
      itemId: i.itemId,
      variantId: i.variantId ?? null,
      batchNo: i.batchNo ?? null,
      serialNo: i.serialNo ?? null,
      qtyTransferred: Number(i.qty),
      qtyReceived: 0,
      unitCost: Number(i.unitCost ?? 0),
    }));

    return this.transferRepo.save({
      orgId,
      transferNo,
      transferDate: data.transferDate ? new Date(data.transferDate) : new Date(),
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      status: 'draft',
      notes: data.notes ?? null,
      createdBy: userId,
    }, lineItems);
  }

  async getTransfers(orgId: string, filters: any) {
    return this.transferRepo.findAll(orgId, filters);
  }

  async getTransferById(orgId: string, id: string) {
    const transfer = await this.transferRepo.findById(id, orgId);
    if (!transfer) throw new AppError('Transfer not found', 404);
    return transfer;
  }

  async dispatchTransfer(orgId: string, id: string, userId: string, stockService: StockService) {
    const transfer = await StockTransferModel.findOne({
      where: { id, orgId },
      include: [{ model: StockTransferItemModel, as: 'transferItems' }],
    });
    if (!transfer) throw new AppError('Transfer not found', 404);
    if ((transfer as any).status !== 'draft') throw new AppError('Only draft transfers can be dispatched', 422);

    await StockTransferModel.update({ status: 'in_transit' }, { where: { id } });

    // Deduct from source warehouse
    for (const item of (transfer as any).transferItems ?? []) {
      await stockService.recordMovement({
        orgId,
        warehouseId: (transfer as any).fromWarehouseId,
        itemId: item.itemId,
        variantId: item.variantId ?? null,
        transactionType: 'transfer_out',
        referenceType: 'transfer',
        referenceId: id,
        batchNo: item.batchNo ?? null,
        qtyIn: 0,
        qtyOut: Number(item.qtyTransferred),
        rate: Number(item.unitCost),
        createdBy: userId,
      });
    }

    return this.transferRepo.findById(id, orgId);
  }

  async receiveTransfer(orgId: string, id: string, userId: string, stockService: StockService, receivedQtys?: Record<string, number>) {
    const transfer = await StockTransferModel.findOne({
      where: { id, orgId },
      include: [{ model: StockTransferItemModel, as: 'transferItems' }],
    });
    if (!transfer) throw new AppError('Transfer not found', 404);
    if ((transfer as any).status !== 'in_transit') throw new AppError('Transfer must be in transit to receive', 422);

    await StockTransferModel.update({ status: 'received' }, { where: { id } });

    // Add to destination warehouse
    for (const item of (transfer as any).transferItems ?? []) {
      const qtyReceived = receivedQtys?.[item.id] ?? Number(item.qtyTransferred);
      await StockTransferItemModel.update({ qtyReceived }, { where: { id: item.id } });

      await stockService.recordMovement({
        orgId,
        warehouseId: (transfer as any).toWarehouseId,
        itemId: item.itemId,
        variantId: item.variantId ?? null,
        transactionType: 'transfer_in',
        referenceType: 'transfer',
        referenceId: id,
        batchNo: item.batchNo ?? null,
        qtyIn: qtyReceived,
        qtyOut: 0,
        rate: Number(item.unitCost),
        createdBy: userId,
      });
    }

    return this.transferRepo.findById(id, orgId);
  }
}
