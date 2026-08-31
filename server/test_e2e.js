// End-to-end verification script for SHG Loan Verification API
const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 STARTING AUTOMATED END-TO-END VERIFICATION...\n');

  // Test 1: Healthcheck
  console.log('1️Testing /api/health...');
  const health = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  console.log('   Response Status:', health.status, 'Payload:', health.data);
  if (health.status !== 200 || health.data.status !== 'healthy') throw new Error('Health check failed');
  console.log('   ✅ Health check passed.\n');

  // Test 2: Field Officer Login
  console.log('2️⃣ Testing Field Officer Login (EMP001)...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { employee_id: 'EMP001', password: 'field123' });

  console.log('   Login Status:', loginRes.status);
  if (loginRes.status !== 200 || !loginRes.data.token) throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  const token = loginRes.data.token;
  console.log(`   ✅ Field Officer authenticated. Token obtained: ${token.substring(0, 18)}...\n`);

  // Test 3: Admin Login
  console.log('3️⃣ Testing Admin Login (ADMIN001)...');
  const adminLoginRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { employee_id: 'ADMIN001', password: 'admin123' });

  if (adminLoginRes.status !== 200 || !adminLoginRes.data.token) throw new Error('Admin login failed');
  const adminToken = adminLoginRes.data.token;
  console.log(`   ✅ Admin authenticated: ${adminLoginRes.data.user.name} (${adminLoginRes.data.user.role})\n`);

  // Test 4: Create Complete 10-Member Geotagged SHG Record
  console.log('4️⃣ Testing SHG Record Creation with 10 Members & GPS Photos...');
  
  // Create sample 10 members
  const members = Array.from({ length: 10 }, (_, i) => ({
    member_number: i + 1,
    member_name: `SHG Member ${i + 1}`,
    member_id: `CUST-MND-${101 + i}`,
    loan_amount: 50000,
    mobile_number: `98450${10000 + i}`
  }));

  // Create sample 10 member photos + 1 group photo with GPS coordinates
  // Use a small 1x1 transparent PNG data URL for test
  const samplePhotoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const photos = [
    ...members.map(m => ({
      photo_type: 'MEMBER',
      member_number: m.member_number,
      stamped_image_url: samplePhotoDataUrl,
      original_image_url: samplePhotoDataUrl,
      latitude: 12.971598 + (m.member_number * 0.0001),
      longitude: 77.594566 + (m.member_number * 0.0001),
      gps_accuracy: 5,
      address: 'Hulivana Village, Mandya Taluk, Karnataka',
      captured_at: new Date().toISOString()
    })),
    {
      photo_type: 'GROUP',
      member_number: null,
      stamped_image_url: samplePhotoDataUrl,
      original_image_url: samplePhotoDataUrl,
      latitude: 12.971598,
      longitude: 77.594566,
      gps_accuracy: 4,
      address: 'Hulivana Village Panchayat Hall, Mandya',
      captured_at: new Date().toISOString()
    }
  ];

  const shgPayload = {
    shgData: {
      shg_name: 'Mahila Shakthi Swasahaya Sangha',
      shg_code: 'SHG-MND-402',
      village: 'Hulivana',
      panchayat: 'Keragodu GP',
      taluk: 'Mandya',
      district: 'Mandya District',
      state: 'Karnataka',
      branch_name: 'Mandya Rural Branch',
      branch_code: 'MND01',
      loan_amount: 500000,
      loan_account_number: 'SHG-AC-782190',
      num_members: 10,
      meeting_date: '2026-08-28',
      remarks: 'All 10 members verified in person with GPS geotags.',
      status: 'submitted'
    },
    members,
    photos
  };

  const createRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/shgs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, shgPayload);

  console.log('   Create SHG Status:', createRes.status);
  if (createRes.status !== 201) throw new Error('SHG creation failed: ' + JSON.stringify(createRes.data));
  const createdShg = createRes.data;
  console.log(`   ✅ SHG Documentation created & submitted successfully!`);
  console.log(`   Report ID: ${createdShg.report_id} | Members: ${createdShg.members?.length} | Photos: ${createdShg.photos?.length}\n`);

  // Test 5: Verify Report Retrieval by ID
  console.log(`5️⃣ Testing /api/shgs/${createdShg.id}...`);
  const getShgRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/shgs/${createdShg.id}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (getShgRes.status !== 200 || !getShgRes.data.report_id) throw new Error('Get SHG failed');
  console.log(`   ✅ Retrieved full SHG record. Status: ${getShgRes.data.status}\n`);

  // Test 6: Verify Dashboard Stats
  console.log('6️⃣ Testing /api/shgs/stats...');
  const statsRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/shgs/stats',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   Dashboard Metrics:', statsRes.data);
  if (statsRes.status !== 200 || statsRes.data.totalSHGs < 1) throw new Error('Stats computation failed');
  console.log('   ✅ Metrics verified.\n');

  // Test 7: Verify Admin Audit Logs & Employee List
  console.log('7️⃣ Testing Admin Audit Trail (/api/admin/audit-logs)...');
  const auditRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/audit-logs',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  if (auditRes.status !== 200 || !Array.isArray(auditRes.data)) throw new Error('Audit trail failed');
  console.log(`   ✅ Audit logs verified: ${auditRes.data.length} audit entries found (Latest: ${auditRes.data[0]?.action}).\n`);

  // Test 8: Verify CSV Export Endpoint
  console.log('8️⃣ Testing CSV Export Endpoint (/api/admin/export/csv)...');
  const csvRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/export/csv',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  if (csvRes.status !== 200 || !csvRes.raw.includes('Report ID')) throw new Error('CSV Export failed');
  console.log(`   ✅ CSV Export generated successfully (${csvRes.raw.length} bytes).\n`);

  console.log('🎉 ALL INTEGRATION & VERIFICATION TESTS PASSED PERFECTLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
