/**
 * Staging Environment Date Filtering Test
 * 
 * Run this script on your staging server to test date filtering functionality
 * Usage: node staging-date-validation.js [staging-url] [auth-token]
 */

import fetch from 'node-fetch';

const STAGING_URL = process.argv[2] || 'http://localhost:3000';
const AUTH_TOKEN = process.argv[3] || '';

console.log('🔍 Testing Date Filtering in Sold Stock Reports on Staging');
console.log('==========================================================');
console.log(`Staging URL: ${STAGING_URL}`);
console.log(`Auth Token: ${AUTH_TOKEN ? '***set***' : 'NOT SET'}\n`);

async function testEndpoint(description, endpoint, expectedStatus = 200) {
  console.log(`🔍 Testing: ${description}`);
  console.log(`Endpoint: ${endpoint}`);
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }
    
    const response = await fetch(`${STAGING_URL}${endpoint}`, {
      method: 'GET',
      headers
    });
    
    const statusCode = response.status;
    console.log(`Status Code: ${statusCode}`);
    
    if (statusCode === expectedStatus) {
      console.log(`✅ PASSED: Expected status ${expectedStatus}`);
      
      if (statusCode === 200) {
        const data = await response.json();
        
        // Display key metrics
        console.log('📊 Key Metrics:');
        if (data.summary) {
          console.log(`- Total Transactions: ${data.summary.total_transactions || 'N/A'}`);
          console.log(`- Total Revenue: $${data.summary.total_revenue || 0}`);
          console.log(`- Date Range: ${data.summary.earliest_sale || 'N/A'} to ${data.summary.latest_sale || 'N/A'}`);
          console.log(`- Unique Parts Sold: ${data.summary.unique_parts_sold || 0}`);
        }
        
        if (data.filters_applied) {
          console.log('🔧 Filters Applied:');
          console.log(`- From Date: ${data.filters_applied.from_date || 'none'}`);
          console.log(`- To Date: ${data.filters_applied.to_date || 'none'}`);
          console.log(`- Local Purchase: ${data.filters_applied.local_purchase || 'none'}`);
          console.log(`- Container No: ${data.filters_applied.container_no || 'none'}`);
        }
        
        if (data.sold_parts && Array.isArray(data.sold_parts)) {
          console.log(`📦 Parts Data: ${data.sold_parts.length} parts returned`);
          
          // Validate date filtering worked
          if (data.filters_applied && (data.filters_applied.from_date || data.filters_applied.to_date)) {
            console.log('🔍 Date Filter Validation:');
            let dateFilterValid = true;
            
            data.sold_parts.forEach((part, index) => {
              const firstSale = part.sales_summary?.first_sale_date;
              const lastSale = part.sales_summary?.last_sale_date;
              
              if (data.filters_applied.from_date && firstSale && firstSale < data.filters_applied.from_date) {
                console.log(`❌ Part ${index + 1}: First sale date ${firstSale} is before filter from_date ${data.filters_applied.from_date}`);
                dateFilterValid = false;
              }
              
              if (data.filters_applied.to_date && lastSale && lastSale > data.filters_applied.to_date) {
                console.log(`❌ Part ${index + 1}: Last sale date ${lastSale} is after filter to_date ${data.filters_applied.to_date}`);
                dateFilterValid = false;
              }
            });
            
            if (dateFilterValid) {
              console.log('✅ Date filtering validation PASSED: All returned data respects the date filters');
            } else {
              console.log('❌ Date filtering validation FAILED: Some data outside the date range was returned');
            }
          }
        }
      }
    } else {
      console.log(`❌ FAILED: Expected ${expectedStatus}, got ${statusCode}`);
      const errorText = await response.text();
      console.log(`Response: ${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
  
  console.log('\n' + '─'.repeat(80) + '\n');
}

async function runTests() {
  // Helper function to get date strings
  const getDateString = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };
  
  const today = getDateString(0);
  const yesterday = getDateString(1);
  const sevenDaysAgo = getDateString(7);
  const thirtyDaysAgo = getDateString(30);
  
  try {
    // Test 1: No date filters
    await testEndpoint(
      'Sold Stock Report - No Date Filters',
      '/sold-stock-report?page=1&limit=5'
    );
    
    // Test 2: From date filter (last 30 days)
    await testEndpoint(
      'Sold Stock Report - From Date Filter (30 days ago)',
      `/sold-stock-report?from_date=${thirtyDaysAgo}&page=1&limit=5`
    );
    
    // Test 3: To date filter (up to yesterday)
    await testEndpoint(
      'Sold Stock Report - To Date Filter (up to yesterday)',
      `/sold-stock-report?to_date=${yesterday}&page=1&limit=5`
    );
    
    // Test 4: Date range filter (last 7 days)
    await testEndpoint(
      'Sold Stock Report - Date Range Filter (last 7 days)',
      `/sold-stock-report?from_date=${sevenDaysAgo}&to_date=${today}&page=1&limit=5`
    );
    
    // Test 5: Summary with date filters
    await testEndpoint(
      'Sold Stock Summary - Date Range Filter',
      `/sold-stock-summary?from_date=${sevenDaysAgo}&to_date=${today}`
    );
    
    // Test 6: Local purchase filter + date
    await testEndpoint(
      'Sold Stock Report - Local Purchase + Date Filter',
      `/sold-stock-report?local_purchase=true&from_date=${sevenDaysAgo}&page=1&limit=5`
    );
    
    // Test 7: Container filter + date
    await testEndpoint(
      'Sold Stock Report - Container + Date Filter',
      `/sold-stock-report?local_purchase=false&from_date=${thirtyDaysAgo}&page=1&limit=5`
    );
    
    // Test 8: Test with same from and to date
    await testEndpoint(
      'Sold Stock Report - Same From/To Date',
      `/sold-stock-report?from_date=${yesterday}&to_date=${yesterday}&page=1&limit=5`
    );
    
    // Test 9: Test invalid date format (should handle gracefully)
    await testEndpoint(
      'Sold Stock Report - Invalid Date Format',
      '/sold-stock-report?from_date=invalid-date&page=1&limit=5',
      500  // Expect error status
    );
    
    console.log('🏁 Date Filtering Test Complete!');
    console.log('\n📝 Summary:');
    console.log('- All tests verify that date filtering works correctly');
    console.log('- The SQL parsing errors should be resolved');
    console.log('- Date filters should properly restrict results');
    console.log('- Response data should respect the applied date ranges');
    console.log('\n🔧 To run this test:');
    console.log('1. Upload this script to your staging server');
    console.log('2. Run: node staging-date-validation.js [staging-url] [auth-token]');
    console.log('   Example: node staging-date-validation.js https://your-staging.com your-auth-token');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
runTests();
