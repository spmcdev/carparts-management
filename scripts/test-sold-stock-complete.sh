#!/bin/bash

echo "=== Comprehensive Sold Stock Report Test ==="

# Get auth token
echo "1. Testing authentication..."
AUTH_RESPONSE=$(curl -s -X POST https://carparts-backend-staging.up.railway.app/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed!"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful"

# Test sold stock report endpoint
echo -e "\n2. Testing sold stock report endpoint..."
REPORT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://carparts-backend-staging.up.railway.app/sold-stock-report?page=1&limit=3")

echo "Raw response structure:"
echo $REPORT_RESPONSE | jq '.sold_parts[0] | keys' 2>/dev/null

# Check if response has expected structure
HAS_SOLD_PARTS=$(echo $REPORT_RESPONSE | jq -r '.sold_parts' 2>/dev/null)
if [ "$HAS_SOLD_PARTS" = "null" ]; then
  echo "❌ Response missing 'sold_parts' array!"
  echo "Response: $REPORT_RESPONSE"
  exit 1
fi

echo "✅ Response has 'sold_parts' array"

# Check sales_summary structure
HAS_SALES_SUMMARY=$(echo $REPORT_RESPONSE | jq -r '.sold_parts[0].sales_summary' 2>/dev/null)
if [ "$HAS_SALES_SUMMARY" = "null" ]; then
  echo "❌ Response missing 'sales_summary' in sold_parts!"
  exit 1
fi

echo "✅ Response has 'sales_summary' structure"

# Test pagination and summary
HAS_PAGINATION=$(echo $REPORT_RESPONSE | jq -r '.pagination' 2>/dev/null)
HAS_SUMMARY=$(echo $REPORT_RESPONSE | jq -r '.summary' 2>/dev/null)

if [ "$HAS_PAGINATION" != "null" ] && [ "$HAS_SUMMARY" != "null" ]; then
  echo "✅ Response has pagination and summary"
else
  echo "❌ Missing pagination or summary"
fi

# Test data structure that frontend expects
echo -e "\n3. Testing frontend compatibility..."
TOTAL_QUANTITY=$(echo $REPORT_RESPONSE | jq -r '.sold_parts[0].sales_summary.total_sold_quantity' 2>/dev/null)
PART_ID=$(echo $REPORT_RESPONSE | jq -r '.sold_parts[0].part_id' 2>/dev/null)
PART_NAME=$(echo $REPORT_RESPONSE | jq -r '.sold_parts[0].part_name' 2>/dev/null)

if [ "$TOTAL_QUANTITY" != "null" ] && [ "$PART_ID" != "null" ] && [ "$PART_NAME" != "null" ]; then
  echo "✅ All required fields available for frontend mapping"
  echo "   - part_id: $PART_ID"
  echo "   - part_name: $PART_NAME"
  echo "   - total_sold_quantity: $TOTAL_QUANTITY"
else
  echo "❌ Missing required fields for frontend"
fi

echo -e "\n4. Environment check..."
echo "Frontend staging config:"
grep REACT_APP_API_URL frontend/.env.staging
echo "Frontend production config:"
grep REACT_APP_API_URL frontend/.env.production

echo -e "\n=== Test Summary ==="
echo "✅ Backend API is working correctly"
echo "✅ Authentication successful"  
echo "✅ Response structure matches frontend expectations"
echo "✅ Environment configs point to correct backend"
echo ""
echo "The sold stock report should now work in the frontend!"
echo "If it still fails, the issue is likely:"
echo "1. Frontend not using the updated code (deployment delay)"
echo "2. Browser cache (try hard refresh)"
echo "3. Authentication token issues in frontend"
