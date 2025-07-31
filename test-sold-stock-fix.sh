#!/bin/bash

# Test Sold Stock Report Fix
echo "🧪 Testing Sold Stock Report Fix..."
echo

# Configuration
BASE_URL="http://localhost:3000"
USERNAME="admin"
PASSWORD="admin"  # Change this to your actual admin password

echo "1. 🔐 Logging in..."

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

if [[ $? -ne 0 ]]; then
  echo "❌ Login request failed. Is the server running?"
  exit 1
fi

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$TOKEN" ]]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"

echo
echo "2. 📊 Testing sold stock report (no filters)..."

# Test sold stock report
REPORT_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/sold-stock-report" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE="${REPORT_RESPONSE: -3}"
RESPONSE_BODY="${REPORT_RESPONSE%???}"

if [[ "$HTTP_CODE" -eq "200" ]]; then
  echo "✅ Sold stock report successful (HTTP $HTTP_CODE)"
  
  # Count items in response
  ITEM_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"sold_stock":\[' | wc -l)
  if [[ $ITEM_COUNT -gt 0 ]]; then
    echo "📈 Report contains data"
  else
    echo "📊 Report is empty (no sold items yet)"
  fi
else
  echo "❌ Sold stock report failed (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo
echo "3. 📈 Testing sold stock summary..."

# Test sold stock summary
SUMMARY_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/sold-stock-summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE="${SUMMARY_RESPONSE: -3}"
RESPONSE_BODY="${SUMMARY_RESPONSE%???}"

if [[ "$HTTP_CODE" -eq "200" ]]; then
  echo "✅ Sold stock summary successful (HTTP $HTTP_CODE)"
else
  echo "❌ Sold stock summary failed (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo
echo "4. 📅 Testing with date filters..."

# Get today's date and last week
TODAY=$(date +"%Y-%m-%d")
LAST_WEEK=$(date -v-7d +"%Y-%m-%d" 2>/dev/null || date -d "7 days ago" +"%Y-%m-%d")

# Test with date filters
FILTERED_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/sold-stock-report?from_date=$LAST_WEEK&to_date=$TODAY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE="${FILTERED_RESPONSE: -3}"
RESPONSE_BODY="${FILTERED_RESPONSE%???}"

if [[ "$HTTP_CODE" -eq "200" ]]; then
  echo "✅ Date-filtered report successful (HTTP $HTTP_CODE)"
else
  echo "❌ Date-filtered report failed (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo
echo "5. 🏠 Testing with local purchase filter..."

# Test with local purchase filter
LOCAL_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/sold-stock-report?local_purchase=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE="${LOCAL_RESPONSE: -3}"
RESPONSE_BODY="${LOCAL_RESPONSE%???}"

if [[ "$HTTP_CODE" -eq "200" ]]; then
  echo "✅ Local purchase filter successful (HTTP $HTTP_CODE)"
else
  echo "❌ Local purchase filter failed (HTTP $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
  exit 1
fi

echo
echo "🎉 All tests passed! The sold stock report is working correctly."
echo
echo "💡 To use the sold stock report:"
echo "   • Visit your frontend and navigate to Stock Management"
echo "   • Use the 'Sold Stock Report' section"
echo "   • Apply filters for container number, local/container purchase, or date ranges"
echo "   • View detailed analytics and export data"
