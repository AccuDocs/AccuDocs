const fs = require('fs');
const file = 'd:/AccuDocs-1/frontend/src/app/core/module-registry.ts';
let content = fs.readFileSync(file, 'utf8');

const target = "  { id: 'billing_invoices', hub: 'billing', label: 'Revenue & Invoices', icon: '🧾', desc: 'CA Invoicing & prediction', status: 'live', badge: 12, route: '/billing/invoices', pinned: true },";
const replacement = target + "\n  { id: 'inventory_dashboard', hub: 'billing', label: 'Inventory & Stock', icon: '📦', desc: 'Manage catalog, warehouses, and POs', status: 'live', badge: null, route: '/inventory', pinned: true },";

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('updated registry');
