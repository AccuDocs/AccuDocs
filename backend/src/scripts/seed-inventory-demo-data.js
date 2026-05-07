require('ts-node/register');
require('../models/index');

const { Op } = require('sequelize');
const { sequelize } = require('../config/database.config');
const {
  User,
  Warehouse,
  ItemCategory,
  Item,
  StockLedger,
  StockSummary,
} = require('../models');

const DEMO_NOTE = 'Seeded Croma demo inventory';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCliOption(name) {
  const prefix = `--${name}=`;
  const option = process.argv.find((arg) => arg.startsWith(prefix));
  return option ? option.slice(prefix.length).trim() : null;
}

function getDemoClientId() {
  return getCliOption('clientId') || process.env.INVENTORY_DEMO_CLIENT_ID || null;
}

function buildSkuScope(demoClient) {
  if (!demoClient) return '';

  const fromCode = String(demoClient.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (fromCode) return fromCode;

  return String(demoClient.id).replace(/-/g, '').toUpperCase().slice(0, 8);
}

function scopeDemoSeeds(itemSeeds, stockSeeds, demoClient) {
  const skuScope = buildSkuScope(demoClient);
  if (!skuScope) {
    return { itemSeeds, stockSeeds, skuLike: 'CR-%' };
  }

  const skuMap = new Map(
    itemSeeds.map((seed) => [seed.sku, seed.sku.replace(/^CR-/, `CR-${skuScope}-`)]),
  );

  return {
    itemSeeds: itemSeeds.map((seed) => ({
      ...seed,
      sku: skuMap.get(seed.sku),
    })),
    stockSeeds: stockSeeds.map((seed) => ({
      ...seed,
      sku: skuMap.get(seed.sku) || seed.sku,
      display: seed.display || seed.sku,
    })),
    skuLike: `CR-${skuScope}-%`,
  };
}

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function daysAgo(days) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value;
}

async function upsertWarehouse(organizationId, seed) {
  const [warehouse] = await Warehouse.findOrCreate({
    where: { orgId: organizationId, code: seed.code },
    defaults: {
      orgId: organizationId,
      code: seed.code,
      name: seed.name,
      address: seed.address,
      gstin: seed.gstin,
      isDefault: seed.isDefault,
      isActive: true,
    },
  });

  await warehouse.update({
    name: seed.name,
    address: seed.address,
    gstin: seed.gstin,
    isDefault: seed.isDefault,
    isActive: true,
  });

  return warehouse;
}

async function upsertCategory(organizationId, seed) {
  const [category] = await ItemCategory.findOrCreate({
    where: { orgId: organizationId, code: seed.code },
    defaults: {
      orgId: organizationId,
      name: seed.name,
      code: seed.code,
      parentId: null,
      sortOrder: seed.sortOrder,
      defaultHsn: seed.defaultHsn,
      defaultGstRate: seed.defaultGstRate,
      defaultUom: 'PCS',
      allowItems: true,
      description: seed.description,
      isActive: true,
    },
  });

  await category.update({
    name: seed.name,
    level: 1,
    path: `/${category.id}`,
    sortOrder: seed.sortOrder,
    defaultHsn: seed.defaultHsn,
    defaultGstRate: seed.defaultGstRate,
    defaultUom: 'PCS',
    allowItems: true,
    description: seed.description,
    isActive: true,
  });

  return category;
}

async function ensureInventoryDemoSchema() {
  await sequelize.query(`
    alter table item_categories
      add column if not exists code varchar(20),
      add column if not exists level smallint not null default 1,
      add column if not exists path varchar(500),
      add column if not exists sort_order smallint default 0,
      add column if not exists default_hsn varchar(20),
      add column if not exists default_gst_rate numeric(5,2),
      add column if not exists default_uom varchar(30),
      add column if not exists allow_items boolean default true,
      add column if not exists created_at timestamptz default now(),
      add column if not exists updated_at timestamptz default now()
  `);

  await sequelize.query(`
    update item_categories
       set level = coalesce(level, 1),
           path = coalesce(path, '/' || id::text),
           sort_order = coalesce(sort_order, 0),
           allow_items = coalesce(allow_items, true),
           created_at = coalesce(created_at, now()),
           updated_at = coalesce(updated_at, now())
     where level is null
        or path is null
        or sort_order is null
        or allow_items is null
        or created_at is null
        or updated_at is null
  `);

  await sequelize.query(`
    create unique index if not exists idx_item_categories_org_code_unique
      on item_categories(org_id, code)
      where code is not null
  `);
}

async function getRequestedDemoClient() {
  const clientId = getDemoClientId();
  if (!clientId) return null;

  if (!UUID_PATTERN.test(clientId)) {
    throw new Error(`Invalid --clientId value: ${clientId}`);
  }

  const [clientRows] = await sequelize.query(
    `
      select id, organization_id as "organizationId", code, name
      from clients
      where id = :clientId
        and deleted_at is null
      limit 1
    `,
    { replacements: { clientId } },
  );

  const client = clientRows[0];
  if (!client) {
    throw new Error(`Client ${clientId} was not found.`);
  }

  return client;
}

async function upsertItem(organizationId, seed, categoryId) {
  const [item] = await Item.findOrCreate({
    where: { orgId: organizationId, sku: seed.sku },
    defaults: {
      orgId: organizationId,
      categoryId,
      name: seed.name,
      sku: seed.sku,
      barcode: seed.barcode,
      hsnSacCode: seed.hsnSacCode,
      itemType: 'goods',
      unitOfMeasure: 'PCS',
      purchasePrice: seed.purchasePrice,
      sellingPrice: seed.sellingPrice,
      mrp: seed.mrp,
      gstRate: seed.gstRate,
      cessRate: 0,
      trackInventory: true,
      allowNegativeStock: false,
      reorderPoint: seed.reorderPoint,
      reorderQty: seed.reorderQty,
      isActive: true,
      description: seed.description,
    },
  });

  await item.update({
    categoryId,
    name: seed.name,
    barcode: seed.barcode,
    hsnSacCode: seed.hsnSacCode,
    itemType: 'goods',
    unitOfMeasure: 'PCS',
    purchasePrice: seed.purchasePrice,
    sellingPrice: seed.sellingPrice,
    mrp: seed.mrp,
    gstRate: seed.gstRate,
    cessRate: 0,
    trackInventory: true,
    allowNegativeStock: false,
    reorderPoint: seed.reorderPoint,
    reorderQty: seed.reorderQty,
    isActive: true,
    description: seed.description,
  });

  return item;
}

async function resetDemoStock(organizationId, itemIds) {
  if (itemIds.length === 0) return;

  await StockLedger.destroy({
    where: {
      orgId: organizationId,
      itemId: { [Op.in]: itemIds },
    },
  });

  await StockSummary.destroy({
    where: {
      itemId: { [Op.in]: itemIds },
    },
  });
}

async function seedOpeningStock({ organizationId, adminUserId, demoClientId, warehousesByCode, itemsBySku, stockSeeds }) {
  const ledgerRows = [];
  const summaryRows = [];

  for (const stock of stockSeeds) {
    const warehouse = warehousesByCode[stock.warehouseCode];
    const item = itemsBySku[stock.sku];

    if (!warehouse || !item || stock.qty <= 0) continue;

    ledgerRows.push({
      orgId: organizationId,
      warehouseId: warehouse.id,
      itemId: item.id,
      variantId: null,
      transactionType: 'opening_stock',
      referenceType: 'manual',
      referenceId: null,
      clientId: demoClientId,
      batchNo: stock.batchNo || null,
      serialNo: null,
      qtyIn: stock.qty,
      qtyOut: 0,
      rate: stock.rate,
      valuationMethod: 'weighted_avg',
      runningBalance: stock.qty,
      transactionDate: dateOnly(daysAgo(stock.daysAgo || 7)),
      notes: `${DEMO_NOTE}: opening stock for ${stock.display || stock.sku}`,
      createdBy: adminUserId,
    });

    summaryRows.push({
      warehouseId: warehouse.id,
      itemId: item.id,
      variantId: null,
      batchNo: stock.batchNo || null,
      qtyOnHand: stock.qty,
      qtyReserved: stock.reserved || 0,
      avgCost: stock.rate,
      lastPurchaseRate: stock.rate,
      lastUpdated: new Date(),
    });
  }

  if (ledgerRows.length > 0) {
    await StockLedger.bulkCreate(ledgerRows);
  }

  if (summaryRows.length > 0) {
    await StockSummary.bulkCreate(summaryRows);
  }

  return {
    ledgerRows: ledgerRows.length,
    summaryRows: summaryRows.length,
  };
}

async function main() {
  await sequelize.authenticate();

  const requestedDemoClient = await getRequestedDemoClient();
  const adminWhere = { role: { [Op.in]: ['admin', 'super_admin'] } };
  if (requestedDemoClient?.organizationId) {
    adminWhere.organizationId = requestedDemoClient.organizationId;
  }

  const adminUser = await User.findOne({
    where: adminWhere,
    order: [['createdAt', 'ASC']],
  });

  if (!adminUser) {
    const suffix = requestedDemoClient ? ` for organization ${requestedDemoClient.organizationId}` : '';
    throw new Error(`No admin user found${suffix}. Create an admin user before seeding inventory demo data.`);
  }

  const organizationId = requestedDemoClient?.organizationId ?? adminUser.organizationId;
  const [organizationRows] = await sequelize.query(
    `
      select id, name, gstin
      from organizations
      where id = :organizationId
        and deleted_at is null
      limit 1
    `,
    { replacements: { organizationId } },
  );
  const organization = organizationRows[0];
  if (!organization) {
    throw new Error('Admin organization not found.');
  }

  await ensureInventoryDemoSchema();
  const demoClient = requestedDemoClient;

  const warehouseSeeds = [
    {
      code: 'CRM-AHM',
      name: 'Croma Demo Store - Ahmedabad',
      address: 'Ground Floor, Demo Mall, SG Highway, Ahmedabad - 380015',
      gstin: organization.gstin || null,
      isDefault: true,
    },
    {
      code: 'CRM-WH',
      name: 'Croma Demo Central Warehouse',
      address: 'Survey 42, Demo Logistics Park, Sanand, Ahmedabad',
      gstin: organization.gstin || null,
      isDefault: false,
    },
    {
      code: 'CRM-SVC',
      name: 'Croma Demo Service Counter',
      address: 'Demo Mall Service Desk, Ahmedabad',
      gstin: organization.gstin || null,
      isDefault: false,
    },
  ];

  const categorySeeds = [
    { code: 'CRM-MOB', name: 'Mobiles & Tablets', sortOrder: 10, defaultHsn: '8517', defaultGstRate: 18, description: 'Smartphones, tablets, and mobile accessories.' },
    { code: 'CRM-LAP', name: 'Laptops & Computers', sortOrder: 20, defaultHsn: '8471', defaultGstRate: 18, description: 'Laptops, desktops, keyboards, and computing devices.' },
    { code: 'CRM-TV', name: 'Televisions', sortOrder: 30, defaultHsn: '8528', defaultGstRate: 18, description: 'LED, QLED, OLED, and smart televisions.' },
    { code: 'CRM-AUD', name: 'Audio & Wearables', sortOrder: 40, defaultHsn: '8518', defaultGstRate: 18, description: 'Headphones, speakers, earbuds, and wearables.' },
    { code: 'CRM-HAP', name: 'Home Appliances', sortOrder: 50, defaultHsn: '8415', defaultGstRate: 28, description: 'Air conditioners, washing machines, and appliances.' },
    { code: 'CRM-ACC', name: 'Accessories', sortOrder: 60, defaultHsn: '8507', defaultGstRate: 18, description: 'Power banks, chargers, cables, and peripherals.' },
  ];

  const itemSeeds = [
    { categoryCode: 'CRM-MOB', sku: 'CR-IP15-128-BLK', barcode: '8900015001281', name: 'Apple iPhone 15 128GB Black', hsnSacCode: '85171300', purchasePrice: 67500, sellingPrice: 72900, mrp: 79900, gstRate: 18, reorderPoint: 8, reorderQty: 20, description: 'Demo flagship smartphone item.' },
    { categoryCode: 'CRM-MOB', sku: 'CR-S24-256-VLT', barcode: '8900024025624', name: 'Samsung Galaxy S24 256GB Violet', hsnSacCode: '85171300', purchasePrice: 61500, sellingPrice: 68999, mrp: 74999, gstRate: 18, reorderPoint: 6, reorderQty: 18, description: 'Demo Android flagship smartphone.' },
    { categoryCode: 'CRM-MOB', sku: 'CR-ONE12R-256', barcode: '8900024120256', name: 'OnePlus 12R 256GB Cool Blue', hsnSacCode: '85171300', purchasePrice: 35500, sellingPrice: 42999, mrp: 45999, gstRate: 18, reorderPoint: 10, reorderQty: 25, description: 'Demo premium mid-range smartphone.' },
    { categoryCode: 'CRM-LAP', sku: 'CR-MBA-M3-13', barcode: '8900084731303', name: 'Apple MacBook Air 13 M3 8GB 256GB', hsnSacCode: '84713010', purchasePrice: 95500, sellingPrice: 107900, mrp: 114900, gstRate: 18, reorderPoint: 4, reorderQty: 10, description: 'Demo ultrabook inventory.' },
    { categoryCode: 'CRM-LAP', sku: 'CR-DELL-I5-16', barcode: '8900084715160', name: 'Dell Inspiron 15 i5 16GB 512GB SSD', hsnSacCode: '84713010', purchasePrice: 50500, sellingPrice: 58990, mrp: 64990, gstRate: 18, reorderPoint: 6, reorderQty: 12, description: 'Demo mainstream laptop.' },
    { categoryCode: 'CRM-TV', sku: 'CR-LG-OLED55', barcode: '8900085285500', name: 'LG 55 inch OLED 4K Smart TV', hsnSacCode: '85287219', purchasePrice: 108000, sellingPrice: 129990, mrp: 159990, gstRate: 18, reorderPoint: 3, reorderQty: 8, description: 'Demo OLED television stock.' },
    { categoryCode: 'CRM-TV', sku: 'CR-SONY-55X80', barcode: '8900085285580', name: 'Sony Bravia 55 inch 4K Google TV', hsnSacCode: '85287219', purchasePrice: 63500, sellingPrice: 78990, mrp: 89990, gstRate: 18, reorderPoint: 4, reorderQty: 10, description: 'Demo premium smart TV.' },
    { categoryCode: 'CRM-AUD', sku: 'CR-AIRPODS-PRO2', barcode: '8900085182202', name: 'Apple AirPods Pro 2nd Gen', hsnSacCode: '85183000', purchasePrice: 18200, sellingPrice: 22900, mrp: 24900, gstRate: 18, reorderPoint: 8, reorderQty: 25, description: 'Demo TWS earbuds, intentionally near reorder level.' },
    { categoryCode: 'CRM-AUD', sku: 'CR-BOAT-ANC751', barcode: '8900085180751', name: 'boAt Nirvana ANC 751 Headphones', hsnSacCode: '85183000', purchasePrice: 2600, sellingPrice: 3999, mrp: 7990, gstRate: 18, reorderPoint: 15, reorderQty: 40, description: 'Demo budget headphones.' },
    { categoryCode: 'CRM-HAP', sku: 'CR-VOLTAS-15AC', barcode: '8900084151500', name: 'Voltas 1.5 Ton 5 Star Inverter AC', hsnSacCode: '84151010', purchasePrice: 33500, sellingPrice: 41990, mrp: 54990, gstRate: 28, reorderPoint: 4, reorderQty: 10, description: 'Demo appliance with 28 percent GST.' },
    { categoryCode: 'CRM-HAP', sku: 'CR-SAM-WM7KG', barcode: '8900084500700', name: 'Samsung 7kg Front Load Washing Machine', hsnSacCode: '84501100', purchasePrice: 26500, sellingPrice: 33990, mrp: 42990, gstRate: 18, reorderPoint: 3, reorderQty: 8, description: 'Demo washing machine stock.' },
    { categoryCode: 'CRM-ACC', sku: 'CR-MI-PB20K', barcode: '8900085072000', name: 'Mi 20000mAh Power Bank', hsnSacCode: '85076000', purchasePrice: 1350, sellingPrice: 2199, mrp: 2999, gstRate: 18, reorderPoint: 30, reorderQty: 100, description: 'Demo fast-moving accessory.' },
    { categoryCode: 'CRM-ACC', sku: 'CR-LOGI-MK270', barcode: '8900084710270', name: 'Logitech MK270 Wireless Keyboard Mouse', hsnSacCode: '84716040', purchasePrice: 1250, sellingPrice: 1899, mrp: 2495, gstRate: 18, reorderPoint: 20, reorderQty: 60, description: 'Demo computer accessory.' },
  ];

  const stockSeeds = [
    { warehouseCode: 'CRM-AHM', sku: 'CR-IP15-128-BLK', qty: 12, reserved: 2, rate: 67500, daysAgo: 12 },
    { warehouseCode: 'CRM-WH', sku: 'CR-IP15-128-BLK', qty: 35, rate: 66800, daysAgo: 18 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-S24-256-VLT', qty: 9, reserved: 1, rate: 61500, daysAgo: 10 },
    { warehouseCode: 'CRM-WH', sku: 'CR-S24-256-VLT', qty: 24, rate: 60750, daysAgo: 18 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-ONE12R-256', qty: 18, rate: 35500, daysAgo: 9 },
    { warehouseCode: 'CRM-WH', sku: 'CR-ONE12R-256', qty: 42, rate: 34900, daysAgo: 16 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-MBA-M3-13', qty: 5, rate: 95500, daysAgo: 14 },
    { warehouseCode: 'CRM-WH', sku: 'CR-MBA-M3-13', qty: 11, rate: 94800, daysAgo: 20 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-DELL-I5-16', qty: 8, rate: 50500, daysAgo: 11 },
    { warehouseCode: 'CRM-WH', sku: 'CR-DELL-I5-16', qty: 17, rate: 49900, daysAgo: 19 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-LG-OLED55', qty: 3, rate: 108000, daysAgo: 8 },
    { warehouseCode: 'CRM-WH', sku: 'CR-LG-OLED55', qty: 6, rate: 106500, daysAgo: 17 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-SONY-55X80', qty: 4, reserved: 1, rate: 63500, daysAgo: 8 },
    { warehouseCode: 'CRM-WH', sku: 'CR-SONY-55X80', qty: 10, rate: 62900, daysAgo: 17 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-AIRPODS-PRO2', qty: 4, rate: 18200, daysAgo: 6 },
    { warehouseCode: 'CRM-WH', sku: 'CR-AIRPODS-PRO2', qty: 14, rate: 17800, daysAgo: 13 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-BOAT-ANC751', qty: 28, rate: 2600, daysAgo: 6 },
    { warehouseCode: 'CRM-WH', sku: 'CR-BOAT-ANC751', qty: 90, rate: 2450, daysAgo: 13 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-VOLTAS-15AC', qty: 5, reserved: 1, rate: 33500, daysAgo: 7 },
    { warehouseCode: 'CRM-WH', sku: 'CR-VOLTAS-15AC', qty: 8, rate: 32900, daysAgo: 15 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-SAM-WM7KG', qty: 4, rate: 26500, daysAgo: 7 },
    { warehouseCode: 'CRM-WH', sku: 'CR-SAM-WM7KG', qty: 9, rate: 25900, daysAgo: 15 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-MI-PB20K', qty: 45, reserved: 5, rate: 1350, daysAgo: 5 },
    { warehouseCode: 'CRM-WH', sku: 'CR-MI-PB20K', qty: 180, rate: 1290, daysAgo: 12 },
    { warehouseCode: 'CRM-AHM', sku: 'CR-LOGI-MK270', qty: 32, rate: 1250, daysAgo: 5 },
    { warehouseCode: 'CRM-WH', sku: 'CR-LOGI-MK270', qty: 95, rate: 1190, daysAgo: 12 },
    { warehouseCode: 'CRM-SVC', sku: 'CR-BOAT-ANC751', qty: 3, rate: 2600, daysAgo: 4 },
    { warehouseCode: 'CRM-SVC', sku: 'CR-MI-PB20K', qty: 10, rate: 1350, daysAgo: 4 },
  ];

  const scopedSeeds = scopeDemoSeeds(itemSeeds, stockSeeds, demoClient);

  const warehousesByCode = {};
  for (const seed of warehouseSeeds) {
    warehousesByCode[seed.code] = await upsertWarehouse(organization.id, seed);
  }

  const categoriesByCode = {};
  for (const seed of categorySeeds) {
    categoriesByCode[seed.code] = await upsertCategory(organization.id, seed);
  }

  const existingDemoItems = await Item.findAll({
    where: {
      orgId: organization.id,
      sku: { [Op.in]: scopedSeeds.itemSeeds.map((seed) => seed.sku) },
    },
  });
  await resetDemoStock(organization.id, existingDemoItems.map((item) => item.id));

  const itemsBySku = {};
  for (const seed of scopedSeeds.itemSeeds) {
    const category = categoriesByCode[seed.categoryCode];
    itemsBySku[seed.sku] = await upsertItem(organization.id, seed, category.id);
  }

  await resetDemoStock(organization.id, Object.values(itemsBySku).map((item) => item.id));
  const stockResult = await seedOpeningStock({
    organizationId: organization.id,
    adminUserId: adminUser.id,
    demoClientId: demoClient?.id ?? null,
    warehousesByCode,
    itemsBySku,
    stockSeeds: scopedSeeds.stockSeeds,
  });

  const [summary] = await sequelize.query(
    `
      select
        (select count(*) from warehouses where org_id = :organizationId and code like 'CRM-%') as warehouses,
        (select count(*) from item_categories where org_id = :organizationId and code like 'CRM-%') as categories,
        (select count(*) from items where org_id = :organizationId and sku like :skuLike) as items,
        (select coalesce(sum(ss.qty_on_hand), 0)
           from stock_summary ss
           join items i on i.id = ss.item_id
          where i.org_id = :organizationId and i.sku like :skuLike) as stock_qty,
        (select coalesce(sum(ss.qty_on_hand * ss.avg_cost), 0)
           from stock_summary ss
           join items i on i.id = ss.item_id
          where i.org_id = :organizationId and i.sku like :skuLike) as stock_value,
        (select count(*)
           from stock_ledger sl
           join items i on i.id = sl.item_id
          where i.org_id = :organizationId
            and i.sku like :skuLike
            and (:demoClientId is null or sl.client_id = cast(:demoClientId as uuid))) as scoped_stock_ledger_rows
    `,
    { replacements: { organizationId: organization.id, demoClientId: demoClient?.id ?? null, skuLike: scopedSeeds.skuLike } },
  );

  console.log('Croma-style inventory demo data seeded successfully.');
  console.log(JSON.stringify({
    organization: organization.name,
    organizationId: organization.id,
    demoClient,
    ...summary[0],
    stock_ledger_rows_created: stockResult.ledgerRows,
    stock_summary_rows_created: stockResult.summaryRows,
  }, null, 2));

  await sequelize.close();
}

main().catch(async (error) => {
  console.error('Failed to seed Croma-style inventory demo data:', error);
  try {
    await sequelize.close();
  } catch (closeError) {
    console.error('Failed to close database connection:', closeError);
  }
  process.exit(1);
});
