require('ts-node/register');
require('../models/index');

const { sequelize } = require('../config/database.config');

const statements = [
  {
    label: 'extension.pgcrypto',
    sql: 'create extension if not exists pgcrypto',
  },
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
    label: 'invoice_templates.table',
    sql: `
      create table if not exists invoice_templates (
        id uuid primary key default gen_random_uuid(),
        name varchar(100) not null,
        html_content text not null,
        thumbnail_url varchar(500) null,
        is_default boolean not null default false,
        org_id uuid null references organizations(id) on delete cascade,
        is_system boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `,
  },
  {
    label: 'invoice_templates.seed.modern',
    sql: `
      insert into invoice_templates (name, html_content, thumbnail_url, is_default, org_id, is_system)
      select
        'Retail Sales - Modern',
        $template$
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 18px; }
    .title { font-size: 30px; font-weight: 800; margin: 0; color: #064e3b; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .box { border: 1px solid #dbe4ee; border-radius: 14px; padding: 16px; }
    h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: #059669; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; }
    th { background: #ecfdf5; color: #065f46; text-align: left; padding: 10px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px; }
    .totals { margin-left: auto; width: 300px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .grand { font-size: 20px; font-weight: 800; color: #064e3b; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <p class="title">{{invoiceType}}</p>
      <p class="muted">Invoice No: <strong>{{invoiceNumber}}</strong><br/>Date: {{invoiceDate}} | Due: {{dueDate}}</p>
    </div>
    <div style="text-align:right">
      <h2 style="margin:0">{{firmName}}</h2>
      <p class="muted">{{firmAddress}}<br/>GSTIN: {{firmGstin}} | PAN: {{firmPan}}</p>
    </div>
  </div>
  <div class="grid">
    <div class="box"><h3>Bill To</h3><strong>{{clientName}}</strong><p class="muted">{{clientAddress}}<br/>GSTIN: {{clientGstin}}</p></div>
    <div class="box"><h3>Tax Details</h3><p class="muted">GST Type: {{gstType}}<br/>Place of Supply: {{placeOfSupply}}</p></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>{{lineItemsRows}}</tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><strong>Rs. {{subtotal}}</strong></div>
    {{taxSummaryRows}}
    <div class="total-row"><span>Round Off</span><strong>Rs. {{roundOff}}</strong></div>
    <div class="total-row grand"><span>Total</span><span>Rs. {{totalAmount}}</span></div>
  </div>
  <p class="muted"><strong>Amount in words:</strong> {{amountInWords}}</p>
  {{notesSection}}
</body>
</html>
        $template$,
        null,
        true,
        null,
        true
      where not exists (
        select 1 from invoice_templates where is_system = true and org_id is null and name = 'Retail Sales - Modern'
      )
    `,
  },
  {
    label: 'invoice_templates.seed.compact',
    sql: `
      insert into invoice_templates (name, html_content, thumbnail_url, is_default, org_id, is_system)
      select
        'Compact GST Invoice',
        $template$
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 28px; font-size: 12px; }
    .top { border: 2px solid #111827; padding: 16px; }
    .row { display: flex; justify-content: space-between; gap: 18px; }
    h1 { margin: 0; text-align: center; font-size: 22px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; }
    th { background: #f8fafc; }
    .right { text-align: right; }
    .summary { margin-left: auto; width: 280px; margin-top: 14px; }
    .summary div { display: flex; justify-content: space-between; padding: 7px; border: 1px solid #cbd5e1; border-top: 0; }
    .summary div:first-child { border-top: 1px solid #cbd5e1; }
    .grand { background: #111827; color: white; font-weight: 800; }
  </style>
</head>
<body>
  <div class="top">
    <h1>{{invoiceType}}</h1>
    <div class="row">
      <div><strong>{{firmName}}</strong><br/>{{firmAddress}}<br/>GSTIN: {{firmGstin}}</div>
      <div class="right">Invoice: <strong>{{invoiceNumber}}</strong><br/>Date: {{invoiceDate}}<br/>Due: {{dueDate}}</div>
    </div>
  </div>
  <div class="row" style="margin-top:14px">
    <div><strong>Customer</strong><br/>{{clientName}}<br/>{{clientAddress}}<br/>GSTIN: {{clientGstin}}</div>
    <div class="right"><strong>Supply</strong><br/>{{gstType}}<br/>POS: {{placeOfSupply}}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>{{lineItemsRows}}</tbody>
  </table>
  <div class="summary">
    <div><span>Subtotal</span><strong>Rs. {{subtotal}}</strong></div>
    {{taxSummaryRows}}
    <div><span>Round Off</span><strong>Rs. {{roundOff}}</strong></div>
    <div class="grand"><span>Grand Total</span><span>Rs. {{totalAmount}}</span></div>
  </div>
  <p><strong>In words:</strong> {{amountInWords}}</p>
  {{notesSection}}
</body>
</html>
        $template$,
        null,
        false,
        null,
        true
      where not exists (
        select 1 from invoice_templates where is_system = true and org_id is null and name = 'Compact GST Invoice'
      )
    `,
  },
  {
    label: 'invoice_templates.seed.premium',
    sql: `
      insert into invoice_templates (name, html_content, thumbnail_url, is_default, org_id, is_system)
      select
        'Premium Electronics Invoice',
        $template$
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 34px; }
    .sheet { background: white; border-radius: 22px; padding: 28px; border: 1px solid #e2e8f0; }
    .hero { background: linear-gradient(135deg, #0f766e, #172554); color: white; border-radius: 18px; padding: 24px; display: flex; justify-content: space-between; }
    .hero h1 { margin: 0; font-size: 30px; }
    .muted { color: #64748b; font-size: 12px; line-height: 1.6; }
    .hero .muted { color: rgba(255,255,255,.72); }
    .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
    .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 12px; }
    th { color: #475569; background: #f1f5f9; padding: 11px; text-align: left; }
    td { padding: 11px; border-bottom: 1px solid #e2e8f0; }
    .totals { margin-left: auto; width: 330px; margin-top: 20px; border-radius: 16px; overflow: hidden; border: 1px solid #dbeafe; }
    .totals div { display: flex; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
    .totals .grand { background: #0f766e; color: white; font-size: 18px; font-weight: 800; border-bottom: 0; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hero">
      <div><h1>{{invoiceType}}</h1><p class="muted">Customer sales invoice</p></div>
      <div style="text-align:right"><strong>{{invoiceNumber}}</strong><p class="muted">{{invoiceDate}}<br/>Due {{dueDate}}</p></div>
    </div>
    <div class="cards">
      <div class="card"><strong>{{firmName}}</strong><p class="muted">{{firmAddress}}<br/>GSTIN: {{firmGstin}}<br/>PAN: {{firmPan}}</p></div>
      <div class="card"><strong>Bill To: {{clientName}}</strong><p class="muted">{{clientAddress}}<br/>GSTIN: {{clientGstin}}<br/>{{gstType}} | POS {{placeOfSupply}}</p></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Product</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>{{lineItemsRows}}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><strong>Rs. {{subtotal}}</strong></div>
      {{taxSummaryRows}}
      <div><span>Round Off</span><strong>Rs. {{roundOff}}</strong></div>
      <div class="grand"><span>Payable</span><span>Rs. {{totalAmount}}</span></div>
    </div>
    <p class="muted"><strong>Amount in words:</strong> {{amountInWords}}</p>
    {{notesSection}}
  </div>
</body>
</html>
        $template$,
        null,
        false,
        null,
        true
      where not exists (
        select 1 from invoice_templates where is_system = true and org_id is null and name = 'Premium Electronics Invoice'
      )
    `,
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
