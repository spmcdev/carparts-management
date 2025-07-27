import fetch from 'node-fetch';

const API_BASE_URL = 'https://carparts-management-production.up.railway.app';

console.log('🔍 Testing API Endpoints (No Auth Required)...\n');

// Test basic connectivity and public endpoints
async function testPublicEndpoints() {
  console.log('='.repeat(60));
  console.log('📋 PUBLIC ENDPOINTS TEST');
  console.log('='.repeat(60));
  console.log('');

  // Test root endpoint
  try {
    console.log('1. Testing root endpoint...');
    const response = await fetch(API_BASE_URL);
    console.log(`   Status: ${response.status}`);
    if (response.status === 200) {
      console.log(`   ✅ Root endpoint accessible\n`);
    } else {
      console.log(`   ⚠️  Root endpoint returned: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Root endpoint error: ${error.message}\n`);
  }

  // Test login endpoint with wrong credentials (should return proper error)
  try {
    console.log('2. Testing login endpoint structure...');
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      })
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response structure: ${Object.keys(data).join(', ')}`);
    if (response.status === 400 || response.status === 401) {
      console.log(`   ✅ Login endpoint working (properly rejecting invalid credentials)\n`);
    } else {
      console.log(`   ⚠️  Unexpected login response\n`);
    }
  } catch (error) {
    console.log(`   ❌ Login endpoint error: ${error.message}\n`);
  }

  // Test protected endpoint without auth (should return 401)
  try {
    console.log('3. Testing protected endpoint without auth...');
    const response = await fetch(`${API_BASE_URL}/bills`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log(`   ✅ Protected endpoints properly secured\n`);
    } else {
      console.log(`   ⚠️  Protected endpoint returned: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Protected endpoint test error: ${error.message}\n`);
  }

  console.log('='.repeat(60));
  console.log('💡 AUTHENTICATION TROUBLESHOOTING');
  console.log('='.repeat(60));
  console.log('');
  console.log('The API is running but authentication failed.');
  console.log('This could be due to:');
  console.log('1. Default admin credentials changed');
  console.log('2. Database migration reset user data');
  console.log('3. User table structure changed');
  console.log('');
  console.log('To resolve:');
  console.log('1. Check the users table in Railway PostgreSQL console');
  console.log('2. Run: SELECT * FROM users;');
  console.log('3. Verify admin user exists with correct password hash');
  console.log('4. If needed, create admin user manually or run migrations');
  console.log('');
  console.log('='.repeat(60));
}

testPublicEndpoints().catch(console.error);
