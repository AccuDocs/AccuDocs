import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';
let token = '';

async function verify() {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/admin-login`, {
      mobile: '9876543210',
      password: 'adminPassword123'
    });
    token = loginRes.data.data.accessToken;
    console.log('Login successful');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test Invoices
    console.log('Testing /billing/invoices...');
    const invRes = await axios.get(`${API_URL}/billing/invoices`, { headers });
    console.log('/billing/invoices status:', invRes.status);

    // 3. Test Metrics/Stats
    const endpoints = [
      '/billing/metrics',
      '/documents/stats',
      '/tasks/stats',
      '/compliance/upcoming',
      '/compliance/stats',
      '/checklists/stats',
      '/logs/stats',
      '/workspace/files'
    ];

    for (const ep of endpoints) {
      console.log(`Testing ${ep}...`);
      try {
        const res = await axios.get(`${API_URL}${ep}`, { headers });
        console.log(`${ep} status:`, res.status);
      } catch (err: any) {
        console.error(`${ep} failed:`, err.response?.status, err.response?.data);
      }
    }

  } catch (err: any) {
    console.error('Verification failed:', err.response?.data || err.message);
  }
}

verify();
