import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  try {
    console.log('--- Phase 1: Authentication ---');
    console.log(`Hitting API: ${API_URL}/auth/admin-login`);
    console.log('Logging in as Admin (9876543210)...');
    
    const payload = {
      identifier: '9876543210',
      password: 'adminPassword123'
    };
    
    const loginRes = await axios.post(`${API_URL}/auth/admin-login`, payload);
    
    if (!loginRes.data.success) {
      throw new Error(`Login failed in response: ${JSON.stringify(loginRes.data)}`);
    }
    
    const token = loginRes.data.data.accessToken;
    console.log('Login successful! Token acquired.');

    const headers = { Authorization: `Bearer ${token}` };

    const endpoints = [
      { name: 'Invoices List', url: '/billing/invoices' },
      { name: 'Billing Metrics', url: '/billing/metrics' },
      { name: 'Clients List', url: '/clients?page=1&limit=5' },
      { name: 'Next Client Code', url: '/clients/next-code' },
      { name: 'Document Stats', url: '/documents/stats' },
      { name: 'Task Stats', url: '/tasks/stats' },
      { name: 'Compliance Stats', url: '/compliance/stats' },
      { name: 'Checklist Stats', url: '/checklists/stats' },
      { name: 'Log Stats', url: '/logs/stats' },
      { name: 'Users List', url: '/users' },
      { name: 'Compliance Deadlines', url: '/compliance/deadlines' },
      { name: 'Client Deadlines', url: '/compliance/client-deadlines' },
      { name: 'GST HSN/SAC Search', url: '/gst/hsn-sac/search?q=accounting&limit=5' },
      { name: 'Inventory Category Tree', url: '/inventory/categories/tree' },
      { name: 'Inventory Items', url: '/inventory/items?page=1&limit=5' },
      { name: 'Inventory Warehouses', url: '/inventory/warehouses?page=1&limit=5' },
      { name: 'Inventory Stock Valuation', url: '/inventory/stock/valuation' },
      { name: 'Vendor Dashboard', url: '/vendors/dashboard' },
      { name: 'Vendors List', url: '/vendors?page=1&limit=5' },
      { name: 'Sub Ledger Dashboard', url: '/sub-ledger/dashboard' },
      { name: 'Sub Ledger Outstanding', url: '/sub-ledger/outstanding' },
      { name: 'WhatsApp QR', url: '/whatsapp/qr' }
    ];

    console.log('\n--- Phase 2: Endpoint Verification ---');
    for (const ep of endpoints) {
      console.log(`Testing ${ep.name} (${ep.url})...`);
      try {
        const res = await axios.get(`${API_URL}${ep.url}`, { headers });
        console.log(`  [SUCCESS] ${ep.name}: Status 200`);
      } catch (err: any) {
        console.error(`  [FAILED] ${ep.name}:`);
        if (err.response) {
          console.error(`    Status: ${err.response.status}`);
          console.error(`    Code: ${err.response.data.error?.code}`);
          console.error(`    Message: ${err.response.data.error?.message}`);
        } else {
          console.error(`    Error: ${err.message}`);
        }
      }
    }

    console.log('\n--- Tests Complete ---');
    process.exit(0);
  } catch (err: any) {
    console.error('\n--- CRITICAL TEST FAILURE ---');
    if (err.response) {
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error Message:', err.message);
    }
    process.exit(1);
  }
}

runTests();
