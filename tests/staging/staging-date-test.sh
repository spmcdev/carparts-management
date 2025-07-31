#!/bin/bash

# Remote Staging Test Script for Date Filtering in Sold Stock Reports
# Run this script on your staging environment to test date filtering functionality

echo "🔍 Testing Date Filtering in Sold Stock Reports on Staging Environment"
echo "=================================================================="
echo ""

# Set your staging API URL here
STAGING_URL="https://your-staging-url.com"  # Replace with your actual staging URL
AUTH_TOKEN=""  # You'll need to set this with a valid auth token

# Test endpoints
SOLD_STOCK_REPORT_ENDPOINT="/sold-stock-report"
SOLD_STOCK_SUMMARY_ENDPOINT="/sold-stock-summary"

echo "📋 Testing Overview:"
echo "1. Test sold stock report without date filters"
echo "2. Test sold stock report with from_date filter"
echo "3. Test sold stock report with to_date filter"
echo "4. Test sold stock report with date range (from_date + to_date)"
echo "5. Test sold stock summary with date filters"
echo ""

# Function to make API call and check response
test_endpoint() {
    local description="$1"
    local url="$2"
    local expected_status="$3"
    
    echo "🔍 Testing: $description"
    echo "URL: $url"
    
    # Make the API call
    response=$(curl -s -w "\n%{http_code}" "$url" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    # Split response and status code
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    echo "Status Code: $http_code"
    
    if [ "$http_code" = "$expected_status" ]; then
        echo "✅ PASSED: Expected status $expected_status"
        
        # Parse and display key metrics if it's a successful response
        if [ "$http_code" = "200" ]; then
            # Extract key metrics using jq if available
            if command -v jq &> /dev/null; then
                echo "📊 Key Metrics:"
                echo "$body" | jq -r '.summary | "- Total Transactions: \(.total_transactions // "N/A")\n- Total Revenue: $\(.total_revenue // 0)\n- Date Range: \(.earliest_sale // "N/A") to \(.latest_sale // "N/A")\n- Filters Applied: from_date=\(.filters_applied.from_date // "none"), to_date=\(.filters_applied.to_date // "none")"' 2>/dev/null || echo "Response received (jq parsing failed)"
            else
                echo "Response length: $(echo "$body" | wc -c) characters"
            fi
        fi
    else
        echo "❌ FAILED: Expected $expected_status, got $http_code"
        echo "Response: $body"
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Check if staging URL and auth token are set
if [ "$STAGING_URL" = "https://your-staging-url.com" ]; then
    echo "❌ Please update STAGING_URL in this script with your actual staging URL"
    exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo "⚠️  AUTH_TOKEN is not set. You may get 401 Unauthorized errors."
    echo "Please set AUTH_TOKEN with a valid authentication token."
    echo ""
fi

# Test 1: No date filters
test_endpoint "Sold Stock Report - No Date Filters" \
    "$STAGING_URL$SOLD_STOCK_REPORT_ENDPOINT?page=1&limit=5" \
    "200"

# Test 2: From date filter (last 30 days)
FROM_DATE=$(date -d '30 days ago' '+%Y-%m-%d' 2>/dev/null || date -v-30d '+%Y-%m-%d' 2>/dev/null || echo "2024-01-01")
test_endpoint "Sold Stock Report - From Date Filter" \
    "$STAGING_URL$SOLD_STOCK_REPORT_ENDPOINT?from_date=$FROM_DATE&page=1&limit=5" \
    "200"

# Test 3: To date filter (up to yesterday)
TO_DATE=$(date -d 'yesterday' '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null || echo "2024-12-31")
test_endpoint "Sold Stock Report - To Date Filter" \
    "$STAGING_URL$SOLD_STOCK_REPORT_ENDPOINT?to_date=$TO_DATE&page=1&limit=5" \
    "200"

# Test 4: Date range filter (last 7 days)
FROM_DATE_RANGE=$(date -d '7 days ago' '+%Y-%m-%d' 2>/dev/null || date -v-7d '+%Y-%m-%d' 2>/dev/null || echo "2024-06-01")
TO_DATE_RANGE=$(date '+%Y-%m-%d')
test_endpoint "Sold Stock Report - Date Range Filter" \
    "$STAGING_URL$SOLD_STOCK_REPORT_ENDPOINT?from_date=$FROM_DATE_RANGE&to_date=$TO_DATE_RANGE&page=1&limit=5" \
    "200"

# Test 5: Summary with date filters
test_endpoint "Sold Stock Summary - Date Range Filter" \
    "$STAGING_URL$SOLD_STOCK_SUMMARY_ENDPOINT?from_date=$FROM_DATE_RANGE&to_date=$TO_DATE_RANGE" \
    "200"

# Test 6: Test with local_purchase filter + date
test_endpoint "Sold Stock Report - Local Purchase + Date Filter" \
    "$STAGING_URL$SOLD_STOCK_REPORT_ENDPOINT?local_purchase=true&from_date=$FROM_DATE_RANGE&page=1&limit=5" \
    "200"

# Test 7: Test invalid date format
test_endpoint "Sold Stock Report - Invalid Date Format (should handle gracefully)" \
    "$STAGING_URL$SOLD_STOCK_REPORT_ENDPOINT?from_date=invalid-date&page=1&limit=5" \
    "500"

echo "🏁 Date Filtering Test Complete!"
echo ""
echo "📝 Summary:"
echo "- All tests check if the endpoints respond without the previous SQL parsing errors"
echo "- Date filters should properly restrict results to the specified date ranges"
echo "- The 'earliest_sale' and 'latest_sale' in responses should respect the date filters"
echo "- Invalid date formats should be handled gracefully with appropriate error messages"
echo ""
echo "🔧 To run this test:"
echo "1. Update STAGING_URL with your actual staging environment URL"
echo "2. Set AUTH_TOKEN with a valid authentication token"
echo "3. Make this script executable: chmod +x staging-date-test.sh"
echo "4. Run: ./staging-date-test.sh"
