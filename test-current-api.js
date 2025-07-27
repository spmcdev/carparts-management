import fetch from 'node-fetch';

const API_BASE_URL = 'https://carparts-management-production.up.railway.app';

console.log('🔍 Testing Current API Implementation...\n');

// Test basic connectivity
async function testConnectivity() {
  try {
    console.log('1. Testing basic connectivity...');
    const response = await fetch(API_BASE_URL);
    console.log(`   Status: ${response.status}`);
    console.log(`   ✅ API is accessible\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ API connection failed: ${error.message}\n`);
    return false;
  }
}

// Test authentication
async function testAuthentication() {
  try {
    console.log('2. Testing authentication...');
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && data.token) {
      console.log(`   ✅ Authentication successful`);
      console.log(`   Token received: ${data.token.substring(0, 20)}...`);
      console.log(`   Role: ${data.role}\n`);
      return data.token;
    } else {
      console.log(`   ❌ Authentication failed`);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Authentication error: ${error.message}\n`);
    return null;
  }
}

// Test bills API with pagination
async function testBillsAPI(token) {
  try {
    console.log('3. Testing bills API with pagination...');
    const response = await fetch(`${API_BASE_URL}/bills?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`   ✅ Bills API working`);
      console.log(`   Structure: ${Object.keys(data).join(', ')}`);
      if (data.pagination) {
        console.log(`   Pagination: Page ${data.pagination.page}/${data.pagination.pages}, Total: ${data.pagination.total}`);
      }
      if (data.bills) {
        console.log(`   Bills returned: ${data.bills.length}`);
      }
      console.log('');
      return true;
    } else {
      console.log(`   ❌ Bills API failed`);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Bills API error: ${error.message}\n`);
    return false;
  }
}

// Test reservations API
async function testReservationsAPI(token) {
  try {
    console.log('4. Testing enhanced reservations API...');
    const response = await fetch(`${API_BASE_URL}/api/reservations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`   ✅ Reservations API working`);
      console.log(`   Reservations returned: ${Array.isArray(data) ? data.length : 'N/A'}`);
      if (data.length > 0) {
        const reservation = data[0];
        console.log(`   Sample structure: ${Object.keys(reservation).join(', ')}`);
        if (reservation.items) {
          console.log(`   Multi-item support: ${Array.isArray(reservation.items) ? '✅' : '❌'}`);
        }
      }
      console.log('');
      return true;
    } else {
      console.log(`   ❌ Reservations API failed`);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Reservations API error: ${error.message}\n`);
    return false;
  }
}

// Test search functionality
async function testSearchFunctionality(token) {
  try {
    console.log('5. Testing search functionality...');
    const response = await fetch(`${API_BASE_URL}/bills?search=test&page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`   ✅ Search functionality working`);
      console.log(`   Search results: ${data.bills ? data.bills.length : 0} bills found`);
      console.log('');
      return true;
    } else {
      console.log(`   ❌ Search functionality failed`);
      console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Search error: ${error.message}\n`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('📋 CURRENT API IMPLEMENTATION TEST REPORT');
  console.log('='.repeat(60));
  console.log('');

  const results = [];
  
  // Test connectivity
  const connectivity = await testConnectivity();
  results.push({ name: 'Connectivity', passed: connectivity });

  if (!connectivity) {
    console.log('🚨 Cannot proceed without connectivity\n');
    return;
  }

  // Test authentication
  const token = await testAuthentication();
  results.push({ name: 'Authentication', passed: !!token });

  if (!token) {
    console.log('🚨 Cannot proceed without authentication\n');
    return;
  }

  // Test bills API
  const billsAPI = await testBillsAPI(token);
  results.push({ name: 'Bills API (Pagination)', passed: billsAPI });

  // Test reservations API
  const reservationsAPI = await testReservationsAPI(token);
  results.push({ name: 'Reservations API (Enhanced)', passed: reservationsAPI });

  // Test search
  const searchAPI = await testSearchFunctionality(token);
  results.push({ name: 'Search Functionality', passed: searchAPI });

  // Summary
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });
  
  console.log('');
  console.log(`Overall: ${passed}/${total} tests passed (${Math.round((passed/total)*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Current implementation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. See details above.');
  }
  
  console.log('='.repeat(60));
}

runTests().catch(console.error);
