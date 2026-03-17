import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  try {
    console.log('--- Phase 1: Authentication ---');
    console.log(`Hitting API: ${API_URL}/auth/admin-login`);
    console.log('Logging in as Admin (9876543210)...');
    
    const payload = {
      mobile: '9876543210',
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
      { name: 'Document Stats', url: '/documents/stats' },
      { name: 'Task Stats', url: '/tasks/stats' },
      { name: 'Compliance Stats', url: '/compliance/stats' },
      { name: 'Checklist Stats', url: '/checklists/stats' },
      { name: 'Log Stats', url: '/logs/stats' }
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
