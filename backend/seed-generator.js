const fs = require('fs');
const { v4: uuid } = require('uuid');

// SEED SCALE
const NUM_ORGS = 5;
const STAFF_PER_ORG = 10;
const CLIENTS_PER_ORG = 25;
const INVOICES_PER_CLIENT = 8;

const sql = [];
sql.push('BEGIN;');
sql.push(`SET LOCAL app.bypass_rls = 'true';`);
sql.push('-- CLEANUP: Truncate tables to ensure a clean seed');
sql.push('TRUNCATE TABLE invoice_line_items, invoices, tasks, service_templates, clients, users, subscriptions, organizations, super_admins CASCADE;');

// Helper: Random Date between two dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

// Global Counters for Uniqueness
let globalClientCounter = 1;

// FIXED UUIDs for Consistency
const superAdminId = 'a0c47413-a5fd-42ee-a013-7212ad61d43d';
const orgIds = [
    'd248f759-d37d-4a07-84d4-2e71b678f8cf',
    '00bf0faa-f38f-4efc-a368-b21c45a1029d',
    'd5ae066b-69c2-45a2-b118-eae27ae1539a',
    'c10fbe53-6245-456e-be50-1efe34b8c1ff',
    'ce676877-2002-41df-a51a-826a2a92d3de'
];

// SECTION 1: super_admins
sql.push('-- SECTION 1: super_admins');
sql.push(`INSERT INTO super_admins (id, name, email, password, created_at, updated_at) VALUES ('${superAdminId}', 'Platform Master', 'admin@accudocs.app', '$2a$10$5PDHeq3xSre1Q4K2kP34fOY0ju1NZCKmzBbj/yXaFyxARbuKrsY2e', NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, updated_at = NOW();`);

// SECTION 2: organizations
sql.push('-- SECTION 2: organizations');
const orgData = [
  { name: 'Shah & Associates', slug: 'shah-associates', gstin: '24AABCS4051A1Z4', state: '24', city: 'Ahmedabad' },
  { name: 'Mehta Tax Consultants', slug: 'mehta-tax', gstin: '24AABCS7768A1Z8', state: '24', city: 'Ahmedabad' },
  { name: 'Patel & Co. Chartered Accountants', slug: 'patel-and-co', gstin: '27AABCS6785A1Z5', state: '27', city: 'Mumbai' },
  { name: 'Desai Audit Services', slug: 'desai-audit', gstin: '24AABCS8710A1Z9', state: '24', city: 'Ahmedabad' },
  { name: 'Joshi & Partners', slug: 'joshi-partners', gstin: '27AABCS7325A1Z2', state: '27', city: 'Mumbai' }
];

const orgs = orgData.map((data, i) => ({ ...data, id: orgIds[i] }));

const plans = ['starter', 'professional', 'enterprise'];

orgs.forEach((org, idx) => {
  const plan = plans[idx % 3];
  sql.push(`INSERT INTO organizations (id, name, slug, gstin, state_code, address, subscription_plan, is_active, created_at, updated_at) 
    VALUES ('${org.id}', '${org.name}', '${org.slug}', '${org.gstin}', '${org.state}', 'Main Street, ${org.city}', '${plan}', true, NOW(), NOW()) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();`);
});

// SECTION 3: subscriptions
sql.push('-- SECTION 3: subscriptions');
orgs.forEach(org => {
  const histId1 = uuid();
  const histId2 = uuid();
  const activeId = uuid();
  
  // History 1: Trial (Expired)
  sql.push(`INSERT INTO subscriptions (id, organization_id, plan, status, started_at, current_period_start, current_period_end, created_at, updated_at, created_by) 
    VALUES ('${histId1}', '${org.id}', 'trial', 'expired', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z', '2023-03-31T23:59:59Z', NOW(), NOW(), '${superAdminId}') ON CONFLICT (id) DO NOTHING;`);
  
  // History 2: Starter (Expired)
  sql.push(`INSERT INTO subscriptions (id, organization_id, plan, status, started_at, current_period_start, current_period_end, created_at, updated_at, created_by) 
    VALUES ('${histId2}', '${org.id}', 'starter', 'expired', '2023-04-01T00:00:00Z', '2023-04-01T00:00:00Z', '2024-03-31T23:59:59Z', NOW(), NOW(), '${superAdminId}') ON CONFLICT (id) DO NOTHING;`);
  
  // Active
  const plan = plans[orgs.indexOf(org) % 3];
  sql.push(`INSERT INTO subscriptions (id, organization_id, plan, status, started_at, current_period_start, current_period_end, created_at, updated_at, created_by) 
    VALUES ('${activeId}', '${org.id}', '${plan}', 'active', '2024-04-01T00:00:00Z', '2024-04-01T00:00:00Z', '2025-03-31T23:59:59Z', NOW(), NOW(), '${superAdminId}') ON CONFLICT (id) DO NOTHING;`);
    
  sql.push(`UPDATE organizations SET current_subscription_id = '${activeId}', updated_at = NOW() WHERE id = '${org.id}';`);
});

// SECTION 4: users (Staff)
sql.push('-- SECTION 4: users');
const orgAdminMap = new Map();
orgs.forEach(org => {
  for (let i = 1; i <= STAFF_PER_ORG; i++) {
    const role = i === 1 ? 'admin' : 'staff';
    const id = uuid();
    if (i === 1) orgAdminMap.set(org.id, id);
    const mobile = `+91${String(orgs.indexOf(org) + 1).padStart(2, '0')}${String(i).padStart(8, '0')}`;
    sql.push(`INSERT INTO users (id, organization_id, name, email, password, role, is_active, mobile, created_at, updated_at) 
    VALUES ('${id}', '${org.id}', 'Staff ${i} ${org.name}', 'staff${i}@${org.slug}.com', '$2a$10$5PDHeq3xSre1Q4K2kP34fOY0ju1NZCKmzBbj/yXaFyxARbuKrsY2e', '${role}', true, '${mobile}', NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, updated_at = NOW();`);
  }
});

// SECTION 5: Service Templates
sql.push('-- SECTION 5: service_templates');
orgs.forEach(org => {
  const commonServices = [
    { name: 'Income Tax Return Filing', sac: '998231', rate: 5000 },
    { name: 'GST Audit & Reconciliation', sac: '998232', rate: 15000 },
    { name: 'Company Registration (MCA)', sac: '998233', rate: 10000 },
    { name: 'TDS Return Preparation', sac: '998234', rate: 3000 }
  ];
  commonServices.forEach(s => {
    sql.push(`INSERT INTO service_templates (id, organization_id, name, sac_code, default_rate, default_gst_rate, created_at, updated_at)
      VALUES ('${uuid()}', '${org.id}', '${s.name}', '${s.sac}', ${s.rate}, 18.00, NOW(), NOW());`);
  });
});

// SECTION 6: clients & client users
sql.push('-- SECTION 6: clients');
const entityTypes = ['individual', 'proprietorship', 'partnership', 'pvt_ltd', 'llp', 'trust', 'huf'];
const cityNames = ['Ahmedabad', 'Surat', 'Rajkot', 'Mumbai', 'Pune', 'Nagpur'];

orgs.forEach(org => {
  const adminId = orgAdminMap.get(org.id);
  for (let i = 0; i < CLIENTS_PER_ORG; i++) {
    const userId = uuid();
    const clientId = uuid();
    const name = i % 3 === 0 ? `Company ${org.slug} ${i} Pvt Ltd` : i % 3 === 1 ? `Company ${org.slug} ${i} LLP` : `Person ${org.slug} ${i} Name`;
    const email = `client${org.id.slice(0,4)}${i}@example.com`;
    // Stable mobile for clients to avoid conflict drift
    const mobile = `+91${String(orgs.indexOf(org) + 1).padStart(2, '0')}C${String(i).padStart(7, '0')}`;
    const entity = entityTypes[i % 7];
    const pan = `PAN${String(globalClientCounter).padStart(5, '0')}A`;
    const gstin = `${org.state}${pan}1Z1`;
    const code = `CL${String(globalClientCounter).padStart(5, '0')}`;
    globalClientCounter++;

    // Insert user for client
    sql.push(`INSERT INTO users (id, organization_id, name, email, password, role, is_active, mobile, created_at, updated_at) 
    VALUES ('${userId}', '${org.id}', '${name}', '${email}', '$2a$10$5PDHeq3xSre1Q4K2kP34fOY0ju1NZCKmzBbj/yXaFyxARbuKrsY2e', 'client', true, '${mobile}', NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, updated_at = NOW();`);

    // Insert client record
    sql.push(`INSERT INTO clients (id, organization_id, user_id, code, name, entity_type, gstin, pan, mobile, email, address, state_code, city, pincode, is_active, created_at, updated_at) 
    VALUES ('${clientId}', '${org.id}', '${userId}', '${code}', '${name}', '${entity}', '${gstin}', '${pan}', '${mobile}', '${email}', 'Client Address ${i}', '${org.state}', '${cityNames[i % cityNames.length]}', '38000${i % 9}', true, NOW(), NOW()) ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();`);

    // SECTION 7: Invoices for this client
    for (let j = 1; j <= INVOICES_PER_CLIENT; j++) {
      const invId = uuid();
      const invDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const dueDate = new Date(invDate.getTime() + 15 * 24 * 60 * 60 * 1000);
      const statusIdx = Math.random();
      const status = statusIdx > 0.8 ? 'overdue' : statusIdx > 0.4 ? 'paid' : 'issued';
      const invNum = `${org.slug.toUpperCase().slice(0,3)}-${2324}-${String(globalClientCounter * 100 + j).padStart(6, '0')}`;
      const baseAmount = Math.floor(Math.random() * 50000) + 1000;
      const gstRate = 0.18;
      const gstAmount = baseAmount * gstRate;
      const totalAmount = baseAmount + gstAmount;
      const amountPaid = status === 'paid' ? totalAmount : 0;
      const gstType = org.state === '24' ? 'CGST_SGST' : 'IGST';

      sql.push(`INSERT INTO invoices (id, organization_id, client_id, invoice_number, status, invoice_date, due_date, issued_at, paid_at, gst_type, place_of_supply, client_gstin, firm_gstin, total_amount, amount_paid, subtotal, cgst_amount, sgst_amount, igst_amount, created_by, created_at, updated_at) 
      VALUES ('${invId}', '${org.id}', '${clientId}', '${invNum}', '${status}', '${invDate.toISOString()}', '${dueDate.toISOString()}', '${invDate.toISOString()}', ${status === 'paid' ? `'${invDate.toISOString()}'` : 'NULL'}, '${gstType}', '${org.state}', '${gstin}', '${org.gstin}', ${totalAmount}, ${amountPaid}, ${baseAmount}, ${gstType === 'CGST_SGST' ? gstAmount/2 : 0}, ${gstType === 'CGST_SGST' ? gstAmount/2 : 0}, ${gstType === 'IGST' ? gstAmount : 0}, '${adminId}', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;`);

      // Line items for invoice
      const numLines = Math.floor(Math.random() * 3) + 1;
      for (let k = 1; k <= numLines; k++) {
        sql.push(`INSERT INTO invoice_line_items (id, invoice_id, description, sac_code, quantity, unit_rate, created_at, updated_at)
          VALUES ('${uuid()}', '${invId}', 'Service component ${k} for ${invNum}', '998231', 1, ${baseAmount/numLines}, NOW(), NOW());`);
      }
    }
  }
});

// SECTION 8: tasks
sql.push('-- SECTION 8: tasks');
orgs.forEach(org => {
  const adminId = orgAdminMap.get(org.id);
  for (let i = 0; i < 50; i++) {
    const priorities = ['low', 'medium', 'high', 'medium'];
    const statuses = ['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'];
    sql.push(`INSERT INTO tasks (id, organization_id, title, priority, status, due_date, created_by, created_at, updated_at)
      VALUES ('${uuid()}', '${org.id}', 'Tax Task ${i} for ${org.name}', '${priorities[i % 4]}', '${statuses[i % 5]}', '${randomDate(new Date(2024, 0, 1), new Date(2025, 11, 31))}', '${adminId}', NOW(), NOW());`);
  }
});

sql.push('COMMIT;');

const output = sql.join('\n');
fs.writeFileSync('../database/seed_v2.sql', output);
console.log(`Successfully generated ${sql.length} SQL statements to D:\\AccuDocs-1\\database\\seed_v2.sql`);
