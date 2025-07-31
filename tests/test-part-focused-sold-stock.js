#!/usr/bin/env node

/**
 * Demo script to test the updated part-focused sold stock report endpoints
 * Run with: node test-part-focused-sold-stock.js
 */

const API_BASE = 'http://localhost:3000';

// Sample API calls to test the updated endpoints
const testCases = [
  {
    name: 'Get all sold parts (first page)',
    endpoint: '/sold-stock-report?page=1&limit=10',
    description: 'Retrieves first 10 parts with their sales summaries'
  },
  {
    name: 'Get container parts only',
    endpoint: '/sold-stock-report?local_purchase=false&page=1&limit=5',
    description: 'Shows only parts from containers (non-local purchases)'
  },
  {
    name: 'Get local purchase parts only',
    endpoint: '/sold-stock-report?local_purchase=true&page=1&limit=5',
    description: 'Shows only locally purchased parts'
  },
  {
    name: 'Get parts by date range',
    endpoint: '/sold-stock-report?from_date=2024-01-01&to_date=2024-12-31&page=1&limit=5',
    description: 'Shows parts sold within date range'
  },
  {
    name: 'Get specific container parts',
    endpoint: '/sold-stock-report?container_no=CTN-001&page=1&limit=5',
    description: 'Shows parts from a specific container'
  },
  {
    name: 'Get overall summary',
    endpoint: '/sold-stock-summary',
    description: 'Comprehensive summary with top selling parts'
  },
  {
    name: 'Get filtered summary',
    endpoint: '/sold-stock-summary?local_purchase=false&from_date=2024-01-01',
    description: 'Summary for container parts from 2024'
  },
  {
    name: 'Get available containers',
    endpoint: '/sold-stock-containers',
    description: 'List of available container numbers for filtering'
  }
];

function logTestCase(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`ENDPOINT: ${testCase.endpoint}`);
  console.log(`DESCRIPTION: ${testCase.description}`);
  console.log('='.repeat(80));
  
  console.log(`\nCURL Command:`);
  console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" "${API_BASE}${testCase.endpoint}"`);
  
  console.log(`\nFetch Example:`);
  console.log(`fetch('${API_BASE}${testCase.endpoint}', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));`);
}

function analyzeResponse(response) {
  console.log(`\nResponse Structure Analysis:`);
  
  if (response.sold_parts) {
    console.log(`- sold_parts array with ${response.sold_parts.length} items`);
    if (response.sold_parts[0]) {
      const sample = response.sold_parts[0];
      console.log(`- Sample part: ${sample.part_name} by ${sample.manufacturer}`);
      console.log(`- Sales summary includes: total_sold_quantity, times_sold, total_revenue, etc.`);
    }
  }
  
  if (response.summary) {
    console.log(`- Summary includes:`);
    console.log(`  * unique_parts_sold: ${response.summary.unique_parts_sold}`);
    console.log(`  * total_quantity_sold: ${response.summary.total_quantity_sold}`);
    console.log(`  * total_revenue: $${response.summary.total_revenue}`);
  }
  
  if (response.top_selling_parts) {
    console.log(`- Top selling parts: ${response.top_selling_parts.length} items`);
  }
  
  if (response.pagination) {
    console.log(`- Pagination: page ${response.pagination.page} of ${response.pagination.pages}`);
  }
}

function showExpectedResponse(testCase) {
  console.log(`\nExpected Response Structure:`);
  
  if (testCase.endpoint.includes('/sold-stock-report')) {
    console.log(`{
  "sold_parts": [
    {
      "part_id": 123,
      "part_name": "Brake Pad Set",
      "manufacturer": "Bosch",
      "part_number": "BP-001",
      "container_no": "CTN-2024-001",
      "local_purchase": false,
      "cost_price": 50.00,
      "recommended_price": 80.00,
      "sales_summary": {
        "total_sold_quantity": 15,
        "times_sold": 8,
        "total_revenue": 1200.00,
        "average_selling_price": 80.00,
        "min_selling_price": 75.00,
        "max_selling_price": 85.00,
        "first_sale_date": "2024-01-15",
        "last_sale_date": "2024-12-30",
        "average_profit_margin_percent": 37.5,
        "total_profit": 450.00
      }
    }
  ],
  "summary": { /* aggregate statistics */ },
  "pagination": { /* pagination info */ }
}`);
  } else if (testCase.endpoint.includes('/sold-stock-summary')) {
    console.log(`{
  "summary": {
    "unique_parts_sold": 150,
    "total_transactions": 500,
    "total_quantity_sold": 1200,
    "total_revenue": 50000.00,
    "estimated_profit": 15000.00
  },
  "top_selling_parts": [
    {
      "part_id": 123,
      "name": "Brake Pad Set",
      "total_sold": 15,
      "total_revenue": 1200.00,
      "avg_profit_margin_percent": 37.5
    }
  ]
}`);
  } else if (testCase.endpoint.includes('/sold-stock-containers')) {
    console.log(`[
  "CTN-2024-001",
  "CTN-2024-002",
  "CTN-2024-003"
]`);
  }
}

console.log('PART-FOCUSED SOLD STOCK REPORT API TESTING GUIDE');
console.log('=' .repeat(80));
console.log('This script provides examples for testing the updated sold stock endpoints.');
console.log('The endpoints now focus on part-level summaries instead of bill-level details.');

testCases.forEach(testCase => {
  logTestCase(testCase);
  showExpectedResponse(testCase);
});

console.log(`\n${'='.repeat(80)}`);
console.log('KEY CHANGES FROM PREVIOUS VERSION:');
console.log('='.repeat(80));
console.log('✅ REMOVED: Customer details (name, phone)');
console.log('✅ REMOVED: Bill details (bill_id, bill_number, bill_date)');
console.log('✅ REMOVED: Individual transaction details');
console.log('✅ ADDED: Part-level sales aggregation');
console.log('✅ ADDED: Sales summary metrics (total_sold_quantity, times_sold, etc.)');
console.log('✅ ADDED: Profit analysis (profit margins, total profit)');
console.log('✅ ADDED: Price analysis (min, max, average selling prices)');
console.log('✅ ENHANCED: Better pagination (counts unique parts, not transactions)');
console.log('✅ ENHANCED: More meaningful sorting (by sales volume/revenue)');

console.log(`\n${'='.repeat(80)}`);
console.log('BENEFITS:');
console.log('='.repeat(80));
console.log('📊 Better business intelligence and analytics');
console.log('🔒 Privacy-compliant (no customer data in part reports)');
console.log('⚡ Better performance (fewer rows, better aggregation)');
console.log('📈 Strategic insights for inventory management');
console.log('💰 Profit analysis for pricing decisions');

console.log(`\n${'='.repeat(80)}`);
console.log('TO TEST THESE ENDPOINTS:');
console.log('='.repeat(80));
console.log('1. Ensure your server is running on port 3000');
console.log('2. Get an authentication token');
console.log('3. Replace "YOUR_TOKEN" in the curl commands above');
console.log('4. Run the commands to see the new response structure');
console.log('5. Compare with the expected response structures shown above');
