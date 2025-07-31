#!/bin/bash

echo "Testing frontend connection to staging backend..."

# Test basic connectivity
echo "1. Testing basic connection:"
curl -s -I https://carparts-backend-staging.up.railway.app/sold-stock-report

echo -e "\n2. Testing with authentication:"
curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJzdXBlcmFkbWluIiwiaWF0IjoxNzUzOTkwNjU1fQ.H5R8iEKcme4kdsm2Q72QWgGwWj0w-q-jVrfuFDP2hs8" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  https://carparts-backend-staging.up.railway.app/sold-stock-report?page=1&limit=2 | jq '.sold_parts[0] | keys'

echo -e "\n3. Testing CORS preflight:"
curl -s -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -X OPTIONS \
  https://carparts-backend-staging.up.railway.app/sold-stock-report -v 2>&1 | grep -i "access-control"

echo -e "\nFrontend environment check:"
echo "REACT_APP_API_URL from .env.production:"
cat frontend/.env.production | grep REACT_APP_API_URL
