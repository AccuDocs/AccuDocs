-- Migration 007: Invoice Templates table
-- Run: psql -d accudocs -f database/migrations/007_invoice_templates.sql

CREATE TABLE IF NOT EXISTS invoice_templates (
  id            UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  html_content  TEXT          NOT NULL,
  thumbnail_url VARCHAR(500),
  is_default    BOOLEAN       NOT NULL DEFAULT FALSE,
  org_id        UUID          REFERENCES organizations(id) ON DELETE CASCADE,
  is_system     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Only one default per org (NULL org_id = system default)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'invoice_templates' AND indexname = 'invoice_templates_org_default_idx'
  ) THEN
    CREATE UNIQUE INDEX invoice_templates_org_default_idx
      ON invoice_templates(org_id)
      WHERE is_default = TRUE AND org_id IS NOT NULL;
  END IF;
END $$;

COMMENT ON TABLE invoice_templates IS 'Invoice PDF/HTML print templates (system + per-org custom)';

-- ─────────────────────────────────────────────────────────────
-- Seed 10 system templates
-- ─────────────────────────────────────────────────────────────
INSERT INTO invoice_templates (id, name, html_content, thumbnail_url, is_default, org_id, is_system)
VALUES

-- 1. Modern (default system)
(
  gen_random_uuid(), 'Modern', 
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Inter,sans-serif;margin:0;padding:40px;color:#1e293b;background:#fff}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
    .firm-name{font-size:28px;font-weight:800;color:#3b82f6}.invoice-badge{background:#3b82f6;color:#fff;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    th{background:#f1f5f9;padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
    td{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:14px}
    .total-row{font-weight:700;font-size:15px}.grand-total{background:#3b82f6;color:#fff}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body>
    <div class="header"><div><div class="firm-name">{{firmName}}</div><div style="font-size:13px;color:#64748b;margin-top:4px">{{firmAddress}}</div><div style="font-size:12px;color:#64748b">GSTIN: {{firmGstin}}</div></div>
    <div style="text-align:right"><div class="invoice-badge">{{invoiceType}}</div><div style="font-size:22px;font-weight:700;margin-top:10px">{{invoiceNumber}}</div><div style="font-size:13px;color:#64748b">Date: {{invoiceDate}}</div><div style="font-size:13px;color:#64748b">Due: {{dueDate}}</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;background:#f8fafc;padding:20px;border-radius:12px;margin-bottom:24px">
    <div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:6px">Bill To</div><div style="font-weight:600;font-size:15px">{{clientName}}</div><div style="font-size:13px;color:#64748b">{{clientAddress}}</div><div style="font-size:13px;color:#64748b">GSTIN: {{clientGstin}}</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>{{lineItemsRows}}</tbody>
    <tfoot><tr><td colspan="5" class="total-row" style="text-align:right">Subtotal</td><td class="total-row">₹{{subtotal}}</td></tr>
    {{taxRows}}
    <tr class="grand-total"><td colspan="5" style="text-align:right;padding:12px 14px;font-weight:700">Total</td><td style="padding:12px 14px;font-weight:700">₹{{totalAmount}}</td></tr></tfoot></table>
    {{notesSection}}
    <div class="footer">Thank you for your business · {{firmName}} · {{firmEmail}}</div>
  </body></html>',
  NULL, TRUE, NULL, TRUE
),

-- 2. Classic
(
  gen_random_uuid(), 'Classic',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Georgia,serif;margin:0;padding:40px;color:#1a1a1a}
    .header{border-bottom:3px solid #1a1a1a;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between}
    .firm-name{font-size:26px;font-weight:700}.invoice-title{font-size:32px;color:#6b7280;font-style:italic}
    table{width:100%;border-collapse:collapse;margin-top:20px}th{border-bottom:2px solid #1a1a1a;padding:8px 12px;text-align:left;font-size:12px}
    td{padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}.total-section{margin-top:20px;text-align:right}
    .grand-total{font-size:18px;font-weight:700;border-top:2px solid #1a1a1a;padding-top:8px;margin-top:8px}
  </style></head><body>
    <div class="header"><div><div class="firm-name">{{firmName}}</div><div style="font-size:12px;margin-top:4px">{{firmAddress}}</div><div style="font-size:12px">GSTIN: {{firmGstin}}</div></div>
    <div style="text-align:right"><div class="invoice-title">{{invoiceType}}</div><div style="font-size:16px;font-weight:700;margin-top:6px">{{invoiceNumber}}</div><div style="font-size:12px">Date: {{invoiceDate}} | Due: {{dueDate}}</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
    <div><strong>Bill To:</strong><br>{{clientName}}<br><span style="font-size:12px;color:#6b7280">{{clientAddress}}</span><br><span style="font-size:12px">GSTIN: {{clientGstin}}</span></div></div>
    <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>{{lineItemsRows}}</tbody></table>
    <div class="total-section">{{taxRows}}<div class="grand-total">Total: ₹{{totalAmount}}</div></div>
    {{notesSection}}
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 3. Minimal
(
  gen_random_uuid(), 'Minimal',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:48px;color:#111;background:#fff}
    h1{font-size:14px;font-weight:500;color:#666;letter-spacing:.12em;text-transform:uppercase;margin:0 0 40px}
    .row{display:flex;justify-content:space-between;margin-bottom:32px}
    .firm{font-size:20px;font-weight:700}.label{font-size:11px;color:#999;margin-bottom:2px}
    table{width:100%;border-collapse:collapse}th{font-size:11px;color:#999;font-weight:500;text-transform:uppercase;letter-spacing:.06em;padding:0 0 8px;border-bottom:1px solid #e5e7eb;text-align:left}
    td{padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:13px}.amount-col{text-align:right}
    .total{display:flex;justify-content:flex-end;margin-top:24px;flex-direction:column;align-items:flex-end;gap:6px}
    .total-line{display:flex;gap:48px;font-size:13px}.total-grand{display:flex;gap:48px;font-size:16px;font-weight:700;border-top:1px solid #111;padding-top:12px;margin-top:6px}
  </style></head><body>
    <h1>{{invoiceType}}</h1>
    <div class="row"><div><div class="firm">{{firmName}}</div><div style="font-size:12px;color:#666;margin-top:4px">{{firmAddress}}</div><div style="font-size:12px;color:#999">GSTIN: {{firmGstin}}</div></div>
    <div style="text-align:right"><div style="font-size:20px;font-weight:700">{{invoiceNumber}}</div><div style="font-size:12px;color:#666">{{invoiceDate}}</div><div style="font-size:12px;color:#999">Due {{dueDate}}</div></div></div>
    <div class="row"><div><div class="label">Billed To</div><div style="font-weight:600">{{clientName}}</div><div style="font-size:12px;color:#666">GSTIN: {{clientGstin}}</div></div></div>
    <table><thead><tr><th>Description</th><th>SAC</th><th>Qty</th><th class="amount-col">Rate</th><th class="amount-col">Amount</th></tr></thead><tbody>{{lineItemsRows}}</tbody></table>
    <div class="total">{{taxRows}}<div class="total-grand"><span>Total</span><span>₹{{totalAmount}}</span></div></div>
    {{notesSection}}
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 4. GST-Detailed
(
  gen_random_uuid(), 'GST Detailed',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Arial,sans-serif;font-size:13px;margin:0;padding:30px;color:#333}
    .gst-header{background:#1e3a5f;color:#fff;padding:16px 24px;margin:-30px -30px 24px;display:flex;justify-content:space-between;align-items:center}
    .gst-title{font-size:18px;font-weight:700}
    table{width:100%;border-collapse:collapse}th{background:#f0f4f8;padding:8px 10px;font-size:11px;text-align:left;border:1px solid #d1d5db}
    td{padding:8px 10px;border:1px solid #d1d5db}.tax-table{margin-top:16px;width:60%;margin-left:auto}
    .grand{background:#1e3a5f;color:#fff;font-weight:700}
    .gst-footer{margin-top:24px;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px}
  </style></head><body>
    <div class="gst-header"><div><div style="font-size:11px;opacity:.8;margin-bottom:2px">TAX INVOICE</div><div class="gst-title">{{firmName}}</div><div style="font-size:11px;opacity:.8">GSTIN: {{firmGstin}} | {{firmAddress}}</div></div>
    <div style="text-align:right"><div style="font-size:16px;font-weight:700">{{invoiceNumber}}</div><div style="font-size:11px;opacity:.8">Date: {{invoiceDate}}</div><div style="font-size:11px;opacity:.8">Due: {{dueDate}}</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;background:#f8fafc;padding:12px;border:1px solid #e2e8f0">
    <div><strong>Bill To:</strong><br>{{clientName}}<br><small>GSTIN: {{clientGstin}}</small><br><small>{{clientAddress}}</small></div>
    <div><strong>Place of Supply:</strong> {{placeOfSupply}}<br><strong>GST Type:</strong> {{gstType}}<br><strong>PAN:</strong> {{firmPan}}</div></div>
    <table><thead><tr><th>Sr</th><th>Description of Service</th><th>SAC Code</th><th>Qty</th><th>Unit Rate (₹)</th><th>Taxable Value (₹)</th><th>GST%</th><th>CGST (₹)</th><th>SGST (₹)</th><th>IGST (₹)</th><th>Total (₹)</th></tr></thead>
    <tbody>{{lineItemsDetailedRows}}</tbody></table>
    <table class="tax-table" style="margin-top:16px"><tr><td>Subtotal</td><td style="text-align:right">₹{{subtotal}}</td></tr>
    {{taxRows}}<tr class="grand"><td>Grand Total</td><td style="text-align:right">₹{{totalAmount}}</td></tr></table>
    <div class="gst-footer"><strong>Amount in words:</strong> {{amountInWords}}<br><br>{{notesSection}}<br>This is a computer-generated invoice. No signature required.</div>
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 5. Professional Blue
(
  gen_random_uuid(), 'Professional Blue',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:"Segoe UI",sans-serif;margin:0;padding:0;color:#1e293b}
    .top-bar{height:8px;background:linear-gradient(90deg,#2563eb,#7c3aed)}
    .content{padding:40px}
    .header{display:flex;justify-content:space-between;margin-bottom:40px}
    .firm-name{font-size:24px;font-weight:800;color:#2563eb}
    .inv-number{font-size:28px;font-weight:800;color:#2563eb}
    .client-box{background:#f8fafc;border-left:4px solid #2563eb;padding:16px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse}
    thead{background:linear-gradient(90deg,#2563eb,#7c3aed);color:#fff}
    th{padding:12px 14px;text-align:left;font-size:12px;font-weight:600}
    td{padding:11px 14px;border-bottom:1px solid #f1f5f9}
    .total-box{background:#f8fafc;padding:20px;margin-top:20px;text-align:right}
    .grand{font-size:20px;font-weight:800;color:#2563eb}
  </style></head><body>
    <div class="top-bar"></div><div class="content">
    <div class="header"><div><div class="firm-name">{{firmName}}</div><div style="font-size:12px;color:#64748b;margin-top:4px">{{firmAddress}}</div><div style="font-size:12px;color:#64748b">GSTIN: {{firmGstin}}</div></div>
    <div style="text-align:right"><div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em">{{invoiceType}}</div><div class="inv-number">{{invoiceNumber}}</div><div style="font-size:13px;color:#64748b">{{invoiceDate}} → {{dueDate}}</div></div></div>
    <div class="client-box"><div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px">Client</div><div style="font-size:16px;font-weight:700">{{clientName}}</div><div style="font-size:12px;color:#64748b">GSTIN: {{clientGstin}} | {{clientAddress}}</div></div>
    <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{{lineItemsRows}}</tbody></table>
    <div class="total-box">{{taxRows}}<div class="grand">Total ₹{{totalAmount}}</div></div>
    {{notesSection}}</div>
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 6. Dark Premium
(
  gen_random_uuid(), 'Dark Premium',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Inter,sans-serif;margin:0;padding:40px;color:#e2e8f0;background:#0f172a}
    .firm-name{font-size:26px;font-weight:800;background:linear-gradient(135deg,#38bdf8,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .header{display:flex;justify-content:space-between;margin-bottom:36px}
    .inv-num{font-size:22px;font-weight:700;color:#38bdf8}
    .client-box{background:#1e293b;border-radius:12px;padding:16px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse}
    th{color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.08em;padding:8px 12px;border-bottom:1px solid #1e293b;text-align:left}
    td{padding:11px 12px;border-bottom:1px solid #1e293b;font-size:13px}
    .total-row td{color:#e2e8f0;font-weight:600}
    .grand td{background:linear-gradient(135deg,#38bdf8,#818cf8);color:#0f172a;font-weight:800;font-size:16px}
  </style></head><body>
    <div class="header"><div><div class="firm-name">{{firmName}}</div><div style="font-size:12px;color:#64748b;margin-top:4px">{{firmAddress}}</div><div style="font-size:12px;color:#475569">GSTIN: {{firmGstin}}</div></div>
    <div style="text-align:right"><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em">{{invoiceType}}</div><div class="inv-num">{{invoiceNumber}}</div><div style="font-size:12px;color:#64748b">{{invoiceDate}} | Due {{dueDate}}</div></div></div>
    <div class="client-box"><div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px">BILL TO</div><div style="font-weight:700;font-size:15px">{{clientName}}</div><div style="font-size:12px;color:#64748b">GSTIN: {{clientGstin}}</div></div>
    <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{{lineItemsRows}}</tbody>
    <tfoot class="total-row">{{taxRows}}<tr class="grand"><td colspan="5" style="text-align:right;padding:12px 14px">TOTAL</td><td style="padding:12px 14px">₹{{totalAmount}}</td></tr></tfoot></table>
    {{notesSection}}
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 7. Simple Clean
(
  gen_random_uuid(), 'Simple Clean',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box}body{font-family:"Helvetica Neue",sans-serif;margin:0;padding:40px;color:#374151;font-size:13px}
    .header{margin-bottom:30px}.firm{font-size:22px;font-weight:700;color:#111827}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .meta-box{background:#f9fafb;padding:14px;border-radius:6px}
    .meta-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{padding:10px;background:#f3f4f6;font-weight:600;text-align:left}td{padding:10px;border-bottom:1px solid #f3f4f6}
    .totals{margin-top:16px;margin-left:auto;width:300px}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6}
    .grand-total{display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:15px;color:#111827}
  </style></head><body>
    <div class="header"><div class="firm">{{firmName}}</div><div style="color:#6b7280;margin-top:2px">{{firmAddress}} · GSTIN: {{firmGstin}}</div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:24px"><div style="font-size:11px;color:#9ca3af">{{invoiceType}}</div><div style="font-size:18px;font-weight:700">{{invoiceNumber}}</div></div>
    <div class="meta-grid"><div class="meta-box"><div class="meta-label">Client</div><div style="font-weight:600">{{clientName}}</div><div style="color:#6b7280">GSTIN: {{clientGstin}}</div></div>
    <div class="meta-box"><div class="meta-label">Dates</div><div>Invoice: {{invoiceDate}}</div><div>Due: {{dueDate}}</div></div></div>
    <table><thead><tr><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{{lineItemsRows}}</tbody></table>
    <div class="totals">{{taxRows}}<div class="grand-total"><span>Total</span><span>₹{{totalAmount}}</span></div></div>
    {{notesSection}}
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 8. Warm Tones
(
  gen_random_uuid(), 'Warm Tones',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Georgia,serif;margin:0;padding:40px;color:#3c2a1e;background:#fffdf7}
    .header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;border-bottom:2px solid #d97706;padding-bottom:16px}
    .firm-name{font-size:26px;font-weight:700;color:#d97706}
    .inv-num{font-size:20px;font-weight:700;color:#d97706}
    .client-band{background:#fef3c7;padding:14px 20px;border-radius:8px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse}
    th{border-bottom:2px solid #d97706;padding:10px;text-align:left;font-size:12px;color:#78350f;text-transform:uppercase}
    td{padding:10px;border-bottom:1px solid #fef3c7}
    .grand{font-weight:700;color:#d97706;font-size:16px;text-align:right;margin-top:16px}
  </style></head><body>
    <div class="header"><div><div class="firm-name">{{firmName}}</div><div style="font-size:12px;color:#92400e;margin-top:2px">{{firmAddress}} | GSTIN: {{firmGstin}}</div></div>
    <div style="text-align:right"><div style="font-size:11px;color:#92400e">{{invoiceType}}</div><div class="inv-num">{{invoiceNumber}}</div><div style="font-size:12px;color:#92400e">Date: {{invoiceDate}} | Due: {{dueDate}}</div></div></div>
    <div class="client-band"><strong>Bill To:</strong> {{clientName}} &nbsp;|&nbsp; GSTIN: {{clientGstin}} &nbsp;|&nbsp; {{clientAddress}}</div>
    <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{{lineItemsRows}}</tbody></table>
    <div style="text-align:right;margin-top:16px">{{taxRows}}<div class="grand">Grand Total: ₹{{totalAmount}}</div></div>
    {{notesSection}}
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 9. Green Eco
(
  gen_random_uuid(), 'Green Eco',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:"Trebuchet MS",sans-serif;margin:0;padding:40px;color:#1c3829}
    .header{display:flex;justify-content:space-between;margin-bottom:32px}
    .firm-name{font-size:24px;font-weight:700;color:#16a34a}
    .badge{background:#16a34a;color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600}
    .inv-num{font-size:20px;font-weight:700;color:#166534}
    table{width:100%;border-collapse:collapse}
    thead{background:#dcfce7}th{padding:10px 12px;text-align:left;font-size:12px;color:#166534;font-weight:700}
    td{padding:10px 12px;border-bottom:1px solid #dcfce7}
    .totals{margin-top:20px;text-align:right}
    .grand{color:#16a34a;font-size:18px;font-weight:700}
  </style></head><body>
    <div class="header"><div><div class="firm-name">{{firmName}}</div><div style="font-size:12px;color:#166534;margin-top:2px">{{firmAddress}} | GSTIN: {{firmGstin}}</div></div>
    <div style="text-align:right"><div class="badge">{{invoiceType}}</div><div class="inv-num" style="margin-top:6px">{{invoiceNumber}}</div><div style="font-size:12px;color:#166534">{{invoiceDate}} | Due: {{dueDate}}</div></div></div>
    <div style="background:#f0fdf4;border-radius:8px;padding:14px;margin-bottom:20px"><strong>Bill To:</strong> {{clientName}} | GSTIN: {{clientGstin}} | {{clientAddress}}</div>
    <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{{lineItemsRows}}</tbody></table>
    <div class="totals">{{taxRows}}<div class="grand">Total: ₹{{totalAmount}}</div></div>
    {{notesSection}}
  </body></html>',
  NULL, FALSE, NULL, TRUE
),

-- 10. Compact Grid
(
  gen_random_uuid(), 'Compact Grid',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:Arial,sans-serif;margin:0;padding:24px;font-size:12px;color:#111}
    .outer-border{border:2px solid #111;padding:20px}
    .firm-row{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:12px}
    .firm-name{font-size:20px;font-weight:700}
    .right-col{text-align:right}
    .inv-head{font-size:16px;font-weight:700}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #ccc;margin-bottom:12px}
    .info-cell{padding:8px 10px;border-right:1px solid #ccc;border-bottom:1px solid #ccc}
    .info-label{font-size:10px;color:#666;font-weight:700;text-transform:uppercase}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
    thead{background:#f5f5f5}
    .grand-row{font-weight:700;background:#111;color:#fff}
  </style></head><body><div class="outer-border">
    <div class="firm-row"><div><div class="firm-name">{{firmName}}</div><div>{{firmAddress}}</div><div>GSTIN: {{firmGstin}}</div></div>
    <div class="right-col"><div class="inv-head">{{invoiceType}}</div><div>{{invoiceNumber}}</div><div>Date: {{invoiceDate}}</div><div>Due: {{dueDate}}</div></div></div>
    <div class="info-grid"><div class="info-cell"><div class="info-label">Bill To</div><strong>{{clientName}}</strong><br>GSTIN: {{clientGstin}}</div>
    <div class="info-cell"><div class="info-label">Address</div>{{clientAddress}}</div></div>
    <table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>{{lineItemsRows}}</tbody>
    <tfoot>{{taxRows}}<tr class="grand-row"><td colspan="5">Grand Total</td><td>₹{{totalAmount}}</td></tr></tfoot></table>
    {{notesSection}}
  </div></body></html>',
  NULL, FALSE, NULL, TRUE
)
ON CONFLICT DO NOTHING;
