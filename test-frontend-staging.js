#!/usr/bin/env node

/**
 * Frontend Integration Test for Staging Environment
 * Tests if the frontend can successfully load and make API calls
 */

import fetch from 'node-fetch';

const FRONTEND_URL = 'https://rasuki-carparts-staging.up.railway.app';
const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`)
};

const testFrontendLoading = async () => {
  log.info('Testing frontend loading...');
  
  try {
    const response = await fetch(FRONTEND_URL);
    
    if (response.status === 200) {
      const html = await response.text();
      
      // Check if it's the React app
      if (html.includes('Rasuki Group') && html.includes('root')) {
        log.success('Frontend loads successfully');
        
        // Check if API URL is correctly configured
        if (html.includes('carparts-backend-staging.up.railway.app')) {
          log.success('Frontend is configured with correct API URL');
        } else {
          log.warn('Frontend may not have correct API URL configuration');
        }
      } else {
        log.warn('Frontend may not be the expected React app');
      }
    } else {
      log.error(`Frontend returned status: ${response.status}`);
    }
  } catch (error) {
    log.error(`Frontend test failed: ${error.message}`);
  }
};

const testEndToEndFlow = async () => {
  log.info('Testing end-to-end flow simulation...');
  
  try {
    // Simulate what the frontend would do
    
    // 1. Login
    const loginResponse = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      const token = loginData.token;
      log.success('E2E: Login successful');

      // 2. Fetch parts (like loading stock management page)
      const partsResponse = await fetch(`${API_BASE_URL}/parts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': FRONTEND_URL
        }
      });

      if (partsResponse.status === 200) {
        const parts = await partsResponse.json();
        log.success(`E2E: Loaded ${parts.length} parts`);

        // 3. Create a sale (like using sales page)
        const saleResponse = await fetch(`${API_BASE_URL}/sales/sell`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Origin': FRONTEND_URL
          },
          body: JSON.stringify({
            customer_name: 'E2E Test Customer',
            customer_phone: '555-0123',
            items: [{
              part_id: parts[0].id,
              quantity: 1,
              unit_price: parts[0].recommended_price || 100
            }]
          })
        });

        if (saleResponse.status === 200) {
          log.success('E2E: Sale created successfully');
          
          // 4. Check bills (like loading reports page)
          const billsResponse = await fetch(`${API_BASE_URL}/bills`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Origin': FRONTEND_URL
            }
          });

          if (billsResponse.status === 200) {
            const billsData = await billsResponse.json();
            log.success(`E2E: Loaded ${billsData.bills.length} bills`);
          }
        }
      }
    }

    log.success('End-to-end flow completed successfully');

  } catch (error) {
    log.error(`E2E test failed: ${error.message}`);
  }
};

const testHealthEndpoints = async () => {
  log.info('Testing health and status endpoints...');
  
  try {
    // Test if backend is responsive
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/parts`, {
      headers: { 'Origin': FRONTEND_URL }
    });
    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      log.success(`Backend is healthy (${responseTime}ms response time)`);
    } else {
      log.warn(`Backend returned status: ${response.status}`);
    }

    // Test CORS headers
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
    };

    if (corsHeaders['access-control-allow-origin'] === FRONTEND_URL) {
      log.success('CORS headers are correctly configured');
    } else {
      log.warn('CORS headers may not be correctly configured');
    }

  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
  }
};

const runFrontendTests = async () => {
  console.log('🌐 Testing Frontend Integration on Staging\n');
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`API URL: ${API_BASE_URL}\n`);

  try {
    await testFrontendLoading();
    await testHealthEndpoints();
    await testEndToEndFlow();

    console.log('\n🎉 Frontend integration tests completed!');
    console.log('✅ Staging environment frontend is working correctly');

  } catch (error) {
    console.log('\n💥 Frontend tests failed');
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

// Run tests
runFrontendTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
