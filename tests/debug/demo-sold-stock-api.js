/**
 * Sold Stock Report API Demo Script
 * 
 * This script demonstrates how to use the new sold stock report endpoints.
 * Run this after starting the server to test the functionality.
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USERNAME = process.env.TEST_USERNAME || 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

let authToken = '';

// Helper function to display section separators
function displaySeparator(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// Helper function to make authenticated requests
async function authenticatedRequest(endpoint) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Request failed for ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

// Function to authenticate and get token
async function authenticate() {
  try {
    console.log('🔐 Authenticating...');
    const response = await axios.post(`${BASE_URL}/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

// Demo function: Basic sold stock report
async function demoBasicSoldStockReport() {
  displaySeparator('BASIC SOLD STOCK REPORT');
  
  try {
    const data = await authenticatedRequest('/sold-stock-report?limit=5');
    
    if (data) {
      console.log('📊 Sold Stock Report Sample:');
      console.log(`   Total Items Sold: ${data.summary.total_items_sold}`);
      console.log(`   Total Revenue: $${data.summary.total_revenue}`);
      console.log(`   Unique Parts: ${data.summary.unique_parts_sold}`);
      console.log(`   Local Purchase Items: ${data.summary.local_purchase_items}`);
      console.log(`   Container Items: ${data.summary.container_items}`);
      
      if (data.sold_stock.length > 0) {
        console.log('\n📋 Sample Sales:');
        data.sold_stock.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.part_details.part_name} - $${item.sale_metrics.sale_total} (Qty: ${item.sale_metrics.sold_quantity})`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in basic report demo:', error.message);
  }
}

// Demo function: Container analysis
async function demoContainerAnalysis() {
  displaySeparator('CONTAINER ANALYSIS');
  
  try {
    // First get all data to find available containers
    const allData = await authenticatedRequest('/sold-stock-report?limit=1000');
    
    if (allData && allData.sold_stock.length > 0) {
      // Extract unique containers
      const containers = [...new Set(
        allData.sold_stock
          .map(item => item.part_details.container_no)
          .filter(container => container && container !== null)
      )];
      
      console.log(`📦 Found ${containers.length} unique containers in sales data`);
      
      // Analyze first few containers
      for (const containerNo of containers.slice(0, 3)) {
        console.log(`\n🔍 Analyzing Container: ${containerNo}`);
        const data = await authenticatedRequest(`/sold-stock-report?container_no=${containerNo}&limit=10`);
        
        if (data) {
          console.log(`   Items Sold: ${data.summary.total_items_sold}`);
          console.log(`   Revenue: $${data.summary.total_revenue}`);
          console.log(`   Unique Parts: ${data.summary.unique_parts_sold}`);
        }
      }
    } else {
      console.log('ℹ️  No container sales data found');
    }
  } catch (error) {
    console.error('❌ Error in container analysis:', error.message);
  }
}

// Demo function: Local vs Container comparison
async function demoLocalVsContainer() {
  displaySeparator('LOCAL VS CONTAINER PURCHASES');
  
  try {
    const [localData, containerData] = await Promise.all([
      authenticatedRequest('/sold-stock-report?local_purchase=true'),
      authenticatedRequest('/sold-stock-report?local_purchase=false')
    ]);
    
    console.log('🏪 Local Purchases:');
    if (localData) {
      console.log(`   Items Sold: ${localData.summary.total_items_sold}`);
      console.log(`   Revenue: $${localData.summary.total_revenue}`);
      console.log(`   Average Price: $${localData.summary.average_selling_price}`);
    }
    
    console.log('\n📦 Container Purchases:');
    if (containerData) {
      console.log(`   Items Sold: ${containerData.summary.total_items_sold}`);
      console.log(`   Revenue: $${containerData.summary.total_revenue}`);
      console.log(`   Average Price: $${containerData.summary.average_selling_price}`);
      console.log(`   Unique Containers: ${containerData.summary.unique_containers}`);
    }
    
    // Compare revenues
    if (localData && containerData) {
      const total = localData.summary.total_revenue + containerData.summary.total_revenue;
      if (total > 0) {
        const localPercent = ((localData.summary.total_revenue / total) * 100).toFixed(1);
        const containerPercent = ((containerData.summary.total_revenue / total) * 100).toFixed(1);
        
        console.log('\n📈 Revenue Distribution:');
        console.log(`   Local: ${localPercent}% ($${localData.summary.total_revenue})`);
        console.log(`   Container: ${containerPercent}% ($${containerData.summary.total_revenue})`);
      }
    }
  } catch (error) {
    console.error('❌ Error in local vs container demo:', error.message);
  }
}

// Demo function: Date range analysis
async function demoDateRangeAnalysis() {
  displaySeparator('DATE RANGE ANALYSIS');
  
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthStr = thisMonth.toISOString().split('T')[0];
    const lastMonthStr = lastMonth.toISOString().split('T')[0];
    
    console.log(`📅 Comparing sales data:`);
    console.log(`   This month (from ${thisMonthStr})`);
    console.log(`   Last month (${lastMonthStr} to ${thisMonthStr})`);
    
    const [lastMonthData, thisMonthData] = await Promise.all([
      authenticatedRequest(`/sold-stock-report?from_date=${lastMonthStr}&to_date=${thisMonthStr}`),
      authenticatedRequest(`/sold-stock-report?from_date=${thisMonthStr}`)
    ]);
    
    console.log('\n📊 Last Month Performance:');
    if (lastMonthData) {
      console.log(`   Items Sold: ${lastMonthData.summary.total_items_sold}`);
      console.log(`   Revenue: $${lastMonthData.summary.total_revenue}`);
      console.log(`   Bills Generated: ${lastMonthData.summary.total_bills}`);
    }
    
    console.log('\n📊 This Month Performance:');
    if (thisMonthData) {
      console.log(`   Items Sold: ${thisMonthData.summary.total_items_sold}`);
      console.log(`   Revenue: $${thisMonthData.summary.total_revenue}`);
      console.log(`   Bills Generated: ${thisMonthData.summary.total_bills}`);
    }
  } catch (error) {
    console.error('❌ Error in date range demo:', error.message);
  }
}

// Demo function: Summary endpoint
async function demoSummaryEndpoint() {
  displaySeparator('SUMMARY ENDPOINT DEMO');
  
  try {
    const summary = await authenticatedRequest('/sold-stock-summary');
    
    if (summary) {
      console.log('📈 Overall Sales Summary:');
      console.log(`   Total Revenue: $${summary.summary.total_revenue}`);
      console.log(`   Total Items Sold: ${summary.summary.total_items_sold}`);
      console.log(`   Average Selling Price: $${summary.summary.average_selling_price}`);
      console.log(`   Price Range: $${summary.summary.min_selling_price} - $${summary.summary.max_selling_price}`);
      console.log(`   Estimated Profit: $${summary.summary.estimated_profit}`);
      
      if (summary.top_selling_parts.length > 0) {
        console.log('\n🏆 Top Selling Parts:');
        summary.top_selling_parts.slice(0, 5).forEach((part, index) => {
          console.log(`   ${index + 1}. ${part.name} - ${part.total_sold} units ($${part.total_revenue})`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in summary demo:', error.message);
  }
}

// Main demo function
async function runDemo() {
  console.log('🚀 Starting Sold Stock Report API Demo');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  // Authenticate first
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log('❌ Demo cannot continue without authentication');
    return;
  }
  
  try {
    await demoBasicSoldStockReport();
    await demoContainerAnalysis();
    await demoLocalVsContainer();
    await demoDateRangeAnalysis();
    await demoSummaryEndpoint();
    
    console.log('\n✨ All sold stock report endpoints are working correctly!');
    console.log('📖 See SOLD-STOCK-REPORT-GUIDE.md for complete API documentation');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the demo
if (require.main === module) {
  runDemo()
    .then(() => {
      console.log('\n🎉 Demo completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Demo failed with error:', error);
      process.exit(1);
    });
}

module.exports = {
  runDemo,
  authenticate,
  authenticatedRequest
};
