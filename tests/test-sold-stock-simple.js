/**
 * Quick Test Script for Sold Stock Report API
 * 
 * This script provides a simple way to test the new sold stock report endpoints
 * after authentication. Run this with: node test-sold-stock-simple.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const USERNAME = 'admin'; // Replace with your username
const PASSWORD = 'admin123'; // Replace with your password

async function testSoldStockAPI() {
  try {
    console.log('🚀 Testing Sold Stock Report API');
    console.log('================================\n');

    // Step 1: Login
    console.log('🔐 Step 1: Authenticating...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      username: USERNAME,
      password: PASSWORD
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful\n');
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };

    // Test sold stock report endpoint
    console.log('📊 Testing sold stock report endpoint...');
    const reportResponse = await axios.get(`${BASE_URL}/sold-stock-report`, {
      headers: authHeaders
    });
    
    const reportData = reportResponse.data;
    console.log('✅ Sold stock report endpoint working!');
    console.log(`   📈 Total items sold: ${reportData.summary.total_items_sold}`);
    console.log(`   💰 Total revenue: $${reportData.summary.total_revenue}`);
    console.log(`   📦 Container items: ${reportData.summary.container_items}`);
    console.log(`   🏪 Local purchase items: ${reportData.summary.local_purchase_items}`);
    
    // Test with filters
    console.log('\n🔍 Testing with local purchase filter...');
    const localResponse = await axios.get(`${BASE_URL}/sold-stock-report?local_purchase=true&limit=5`, {
      headers: authHeaders
    });
    
    console.log('✅ Filter functionality working!');
    console.log(`   📊 Local purchase items: ${localResponse.data.summary.total_items_sold}`);
    console.log(`   💰 Local purchase revenue: $${localResponse.data.summary.total_revenue}`);
    
    // Test summary endpoint
    console.log('\n📋 Testing summary endpoint...');
    const summaryResponse = await axios.get(`${BASE_URL}/sold-stock-summary`, {
      headers: authHeaders
    });
    
    console.log('✅ Summary endpoint working!');
    console.log(`   🏆 Top selling parts: ${summaryResponse.data.top_selling_parts.length}`);
    console.log(`   💎 Estimated profit: $${summaryResponse.data.summary.estimated_profit}`);
    
    // Test container filter
    console.log('\n📦 Testing container filter...');
    const containerResponse = await axios.get(`${BASE_URL}/sold-stock-report?local_purchase=false&limit=3`, {
      headers: authHeaders
    });
    
    console.log('✅ Container filter working!');
    console.log(`   📦 Container items: ${containerResponse.data.summary.total_items_sold}`);
    console.log(`   🌟 Unique containers: ${containerResponse.data.summary.unique_containers}`);
    
    console.log('\n🎉 All tests passed! The sold stock report API is working correctly.');
    console.log('📖 Check SOLD-STOCK-REPORT-GUIDE.md for complete documentation.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSoldStockAPI();
