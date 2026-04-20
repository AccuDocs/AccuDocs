/**
 * StockValuationService — pure domain service, no DB dependencies.
 * Implements FIFO and Weighted Average cost calculation.
 */

export interface FifoBatch {
  qty: number;
  cost: number; // unit cost
}

export interface ValuationResult {
  totalQty: number;
  totalValue: number;
  avgCost: number;
}

export class StockValuationService {
  /**
   * Consume stock using FIFO. Returns remaining batches after consumption.
   * Throws if there is insufficient stock and allowNegative is false.
   */
  static calculateFIFO(batches: FifoBatch[], qtyConsumed: number, allowNegative = false): {
    remainingBatches: FifoBatch[];
    consumedCost: number;
  } {
    let remaining = qtyConsumed;
    let consumedCost = 0;
    const remainingBatches: FifoBatch[] = [];

    const totalAvailable = batches.reduce((sum, b) => sum + b.qty, 0);
    if (!allowNegative && totalAvailable < qtyConsumed) {
      throw new Error(
        `Insufficient stock: available ${totalAvailable}, requested ${qtyConsumed}`,
      );
    }

    for (const batch of batches) {
      if (remaining <= 0) {
        remainingBatches.push({ ...batch });
        continue;
      }
      if (batch.qty <= remaining) {
        consumedCost += batch.qty * batch.cost;
        remaining -= batch.qty;
      } else {
        consumedCost += remaining * batch.cost;
        remainingBatches.push({ qty: batch.qty - remaining, cost: batch.cost });
        remaining = 0;
      }
    }

    return { remainingBatches, consumedCost };
  }

  /**
   * Recalculate weighted average cost after adding new stock.
   */
  static calculateWeightedAvg(
    existingQty: number,
    existingAvgCost: number,
    incomingQty: number,
    incomingCost: number,
  ): number {
    const totalQty = existingQty + incomingQty;
    if (totalQty === 0) return 0;
    return (existingQty * existingAvgCost + incomingQty * incomingCost) / totalQty;
  }

  /**
   * Check whether a stock movement would cause negative stock.
   */
  static checkNegativeStock(
    currentQty: number,
    requestedQtyOut: number,
    allowNegative: boolean,
  ): { allowed: boolean; message?: string } {
    const resultingQty = currentQty - requestedQtyOut;
    if (!allowNegative && resultingQty < 0) {
      return {
        allowed: false,
        message: `Negative stock not allowed. Current: ${currentQty}, Requested: ${requestedQtyOut}`,
      };
    }
    return { allowed: true };
  }

  static summarize(batches: FifoBatch[]): ValuationResult {
    const totalQty = batches.reduce((s, b) => s + b.qty, 0);
    const totalValue = batches.reduce((s, b) => s + b.qty * b.cost, 0);
    return { totalQty, totalValue, avgCost: totalQty > 0 ? totalValue / totalQty : 0 };
  }
}
