require('ts-node/register');
require('../models/index');

const { sequelize } = require('../config/database.config');

const statements = [
  {
    label: 'organizations.turnover_above_5cr',
    sql: 'alter table organizations add column if not exists turnover_above_5cr boolean not null default false',
  },
  {
    label: 'organizations.eway_bill_username_enc',
    sql: 'alter table organizations add column if not exists eway_bill_username_enc text null',
  },
  {
    label: 'organizations.eway_bill_password_enc',
    sql: 'alter table organizations add column if not exists eway_bill_password_enc text null',
  },
  {
    label: 'invoices.currency',
    sql: "alter table invoices add column if not exists currency varchar(3) not null default 'INR'",
  },
  {
    label: 'invoices.exchange_rate',
    sql: 'alter table invoices add column if not exists exchange_rate numeric(12, 6) not null default 1.000000',
  },
  {
    label: 'invoices.receiver_name',
    sql: 'alter table invoices add column if not exists receiver_name varchar(200) null',
  },
  {
    label: 'invoices.receiver_address',
    sql: 'alter table invoices add column if not exists receiver_address text null',
  },
  {
    label: 'invoice_line_items.item_id',
    sql: 'alter table invoice_line_items add column if not exists item_id uuid null',
  },
  {
    label: 'invoice_line_items.variant_id',
    sql: 'alter table invoice_line_items add column if not exists variant_id uuid null',
  },
  {
    label: 'invoice_line_items.warehouse_id',
    sql: 'alter table invoice_line_items add column if not exists warehouse_id uuid null',
  },
  {
    label: 'invoice_line_items.batch_no',
    sql: 'alter table invoice_line_items add column if not exists batch_no varchar(100) null',
  },
  {
    label: 'invoice_line_items.track_inventory',
    sql: 'alter table invoice_line_items add column if not exists track_inventory boolean not null default false',
  },
  {
    label: 'idx_invoice_line_items_item_id',
    sql: 'create index if not exists idx_invoice_line_items_item_id on invoice_line_items(item_id)',
  },
  {
    label: 'idx_invoice_line_items_variant_id',
    sql: 'create index if not exists idx_invoice_line_items_variant_id on invoice_line_items(variant_id)',
  },
  {
    label: 'idx_invoice_line_items_warehouse_id',
    sql: 'create index if not exists idx_invoice_line_items_warehouse_id on invoice_line_items(warehouse_id)',
  },
];

async function repairBillingSchema() {
  try {
    await sequelize.authenticate();
    console.log('Repairing billing schema drift...');

    for (const statement of statements) {
      await sequelize.query(statement.sql);
      console.log(`OK ${statement.label}`);
    }

    console.log('Billing schema repair complete.');
  } catch (error) {
    console.error('Billing schema repair failed:', error.message);
    if (error.original) {
      console.error('Raw database error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

repairBillingSchema();
