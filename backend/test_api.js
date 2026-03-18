'use strict';

const axios = require('axios');

async function testApi() {
  const baseUrl = 'http://localhost:3000/api/v1';
  
  try {
    console.log('1. Attempting Super Admin Login...');
    const loginRes = await axios.post(`${baseUrl}/super-admin/auth/login`, {
      email: 'admin@accudocs.app',
      password: 'Admin@123'
    });
    
    console.log('✅ Login Successful!');
    const token = loginRes.data.data.accessToken;
    console.log('Token received.');

    console.log('\n2. Attempting to List Organizations...');
    const orgsRes = await axios.get(`${baseUrl}/super-admin/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Organizations List Retrieved!');
    console.log('Total Orgs:', orgsRes.data.pagination.totalItems);
    if (orgsRes.data.data.length > 0) {
      console.log('First Org Name:', orgsRes.data.data[0].name);
    }

    console.log('\n3. Attempting to Get Analytics Overview...');
    const analyticsRes = await axios.get(`${baseUrl}/super-admin/analytics/overview`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Analytics Overview Retrieved!');
    console.log('Platform Stats:', analyticsRes.data.data.organizations);

    console.log('\nAll core tests passed!');

  } catch (err) {
    console.error('❌ Test Failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error Message:', err.message);
    }
    process.exit(1);
  }
}

testApi();
