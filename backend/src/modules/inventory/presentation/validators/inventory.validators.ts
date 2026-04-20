import { z } from 'zod';

export const CreateItemSchema = z.object({
  name:               z.string().min(1).max(200),
  sku:                z.string().max(100).optional(),
  barcode:            z.string().max(100).optional(),
  hsnSacCode:         z.string().max(20).optional(),
  itemType:           z.enum(['goods', 'service']).default('goods'),
  unitOfMeasure:      z.string().max(30).default('PCS'),
  purchasePrice:      z.number().min(0).default(0),
  sellingPrice:       z.number().min(0).default(0),
  mrp:                z.number().min(0).optional().nullable(),
  gstRate:            z.number().min(0).max(100).default(18),
  cessRate:           z.number().min(0).max(100).default(0),
  trackInventory:     z.boolean().default(true),
  allowNegativeStock: z.boolean().default(false),
  reorderPoint:       z.number().int().min(0).optional().nullable(),
  reorderQty:         z.number().int().min(0).optional().nullable(),
  categoryId:         z.string().uuid().optional().nullable(),
  isActive:           z.boolean().default(true),
  description:        z.string().optional().nullable(),
});

export const UpdateItemSchema = CreateItemSchema.partial();

export const CreateVariantSchema = z.object({
  variantName:     z.string().min(1).max(100),
  skuSuffix:       z.string().max(50).optional(),
  barcode:         z.string().max(100).optional(),
  additionalPrice: z.number().min(0).default(0),
  attributes:      z.record(z.any()).default({}),
  isActive:        z.boolean().default(true),
});

export const SetClientPriceSchema = z.object({
  clientId:           z.string().uuid(),
  itemId:             z.string().uuid(),
  variantId:          z.string().uuid().optional().nullable(),
  customSellingPrice: z.number().min(0),
  discountPct:        z.number().min(0).max(100).default(0),
  validFrom:          z.string().optional().nullable(),
  validTo:            z.string().optional().nullable(),
});

export const CreateWarehouseSchema = z.object({
  name:      z.string().min(1).max(150),
  code:      z.string().min(1).max(20),
  branchId:  z.string().uuid().optional().nullable(),
  address:   z.string().optional().nullable(),
  gstin:     z.string().max(15).optional().nullable(),
  isActive:  z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial();

export const OpeningStockSchema = z.object({
  warehouseId:     z.string().uuid(),
  itemId:          z.string().uuid(),
  variantId:       z.string().uuid().optional().nullable(),
  qty:             z.number().min(0),
  rate:            z.number().min(0),
  batchNo:         z.string().optional(),
  transactionDate: z.string().optional(),
  notes:           z.string().optional().nullable(),
});

export const AdjustStockSchema = z.object({
  warehouseId:  z.string().uuid(),
  itemId:       z.string().uuid(),
  variantId:    z.string().uuid().optional().nullable(),
  adjustedQty:  z.number().min(0),
  rate:         z.number().min(0).default(0),
  reason:       z.string().optional(),
});

export const CreatePOSchema = z.object({
  supplierClientId:     z.string().uuid(),
  warehouseId:          z.string().uuid(),
  branchId:             z.string().uuid().optional().nullable(),
  poDate:               z.string().optional(),
  expectedDeliveryDate: z.string().optional().nullable(),
  notes:                z.string().optional().nullable(),
  lineItems: z.array(z.object({
    itemId:      z.string().uuid(),
    variantId:   z.string().uuid().optional().nullable(),
    hsnSacCode:  z.string().optional().nullable(),
    qtyOrdered:  z.number().min(0.001),
    unitPrice:   z.number().min(0),
    gstRate:     z.number().min(0).max(100).default(18),
    batchNo:     z.string().optional().nullable(),
    expectedDate: z.string().optional().nullable(),
  })).min(1),
});

export const ReceivePOItemsSchema = z.object({
  receivedItems: z.array(z.object({
    poItemId:    z.string().uuid(),
    qtyReceived: z.number().min(0.001),
    batchNo:     z.string().optional(),
  })).min(1),
});

export const CreateTransferSchema = z.object({
  fromWarehouseId: z.string().uuid(),
  toWarehouseId:   z.string().uuid(),
  transferDate:    z.string().optional(),
  notes:           z.string().optional().nullable(),
  items: z.array(z.object({
    itemId:    z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    qty:       z.number().min(0.001),
    unitCost:  z.number().min(0).default(0),
    batchNo:   z.string().optional().nullable(),
    serialNo:  z.string().optional().nullable(),
  })).min(1),
});
