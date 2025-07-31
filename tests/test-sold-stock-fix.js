#!/usr/bin/env node

// Use native fetch for Node 18+ or provide fallback
const fetch = globalThis.fetch || (async () => {
  throw new Error('fetch is not available. Please use Node 18+ or install node-fetch');
});

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'admin',
  password: 'admin' // Change this to your actual admin password
};

async function testSoldStockReport() {
  try {
    console.log('🧪 Testing Sold Stock Report Fix...\n');

    // Step 1: Login to get authentication token
    console.log('1. 🔐 Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} - ${await loginResponse.text()}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 2: Test sold stock report endpoint without filters
    console.log('\n2. 📊 Testing sold stock report (no filters)...');
    const reportResponse = await fetch(`${BASE_URL}/sold-stock-report`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.error('❌ Report request failed:', reportResponse.status, errorText);
      return;
    }

    const reportData = await reportResponse.json();
    console.log('✅ Sold stock report successful');
    console.log(`📈 Found ${reportData.sold_stock.length} items in report`);
    console.log(`📊 Summary: ${reportData.summary.total_items_sold} total items sold`);

    // Step 3: Test sold stock summary endpoint
    console.log('\n3. 📈 Testing sold stock summary...');
    const summaryResponse = await fetch(`${BASE_URL}/sold-stock-summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error('❌ Summary request failed:', summaryResponse.status, errorText);
      return;
    }

    const summaryData = await summaryResponse.json();
    console.log('✅ Sold stock summary successful');
    console.log(`📊 Total Revenue: $${summaryData.summary.total_revenue}`);
    console.log(`🏆 Top selling parts: ${summaryData.top_selling_parts.length} items`);

    // Step 4: Test with date filters
    console.log('\n4. 📅 Testing with date filters...');
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const filteredResponse = await fetch(`${BASE_URL}/sold-stock-report?from_date=${lastWeek}&to_date=${today}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!filteredResponse.ok) {
      const errorText = await filteredResponse.text();
      console.error('❌ Filtered report request failed:', filteredResponse.status, errorText);
      return;
    }

    const filteredData = await filteredResponse.json();
    console.log('✅ Date-filtered report successful');
    console.log(`📅 Found ${filteredData.sold_stock.length} items in date range`);

    // Step 5: Test with local purchase filter
    console.log('\n5. 🏠 Testing with local purchase filter...');
    const localResponse = await fetch(`${BASE_URL}/sold-stock-report?local_purchase=true`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!localResponse.ok) {
      const errorText = await localResponse.text();
      console.error('❌ Local purchase filter failed:', localResponse.status, errorText);
      return;
    }

    const localData = await localResponse.json();
    console.log('✅ Local purchase filter successful');
    console.log(`🏠 Found ${localData.sold_stock.length} local purchase items`);

    console.log('\n🎉 All tests passed! The sold stock report is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSoldStockReport();
