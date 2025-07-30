#!/usr/bin/env node

/**
 * Refund System Test for Staging Environment
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';
const FRONTEND_URL = 'https://rasuki-carparts-staging.up.railway.app';

let authToken = '';

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`)
};

const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Origin': FRONTEND_URL,
    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
  };

  const response = await fetch(url, {
    headers: { ...defaultHeaders, ...options.headers },
    ...options
  });

  const contentType = response.headers.get('content-type');
  let data;
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { response, data };
};

const testRefundSystem = async () => {
  console.log('🧪 Testing Refund System on Staging\n');

  try {
    // Login
    log.info('Authenticating...');
    const { response: loginResponse, data: loginData } = await makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (loginResponse.status === 200 && loginData.token) {
      authToken = loginData.token;
      log.success('Authentication successful');
    } else {
      throw new Error('Authentication failed');
    }

    // Get a bill to refund
    log.info('Getting bills...');
    const { response: billsResponse, data: billsData } = await makeRequest('/bills');
    
    if (billsResponse.status === 200 && billsData.bills && billsData.bills.length > 0) {
      const bill = billsData.bills[0];
      log.success(`Found bill ID: ${bill.id} for testing`);

      // Test partial refund
      log.info('Testing partial refund...');
      const refundData = {
        refund_type: 'partial',
        refund_amount: 50.00,
        refund_reason: 'Testing partial refund functionality',
        items: [{
          part_id: bill.items[0].part_id,
          quantity: 1,
          unit_price: 50.00
        }]
      };

      const { response: refundResponse, data: refundResult } = await makeRequest(`/bills/${bill.id}/refund`, {
        method: 'POST',
        body: JSON.stringify(refundData)
      });

      if (refundResponse.status === 200) {
        log.success('Partial refund created successfully');
        log.info(`Refund ID: ${refundResult.refund?.id}`);
      } else {
        log.warn(`Refund may have failed: ${JSON.stringify(refundResult)}`);
      }

      // Test full refund on another bill if available
      if (billsData.bills.length > 1) {
        const secondBill = billsData.bills[1];
        log.info('Testing full refund...');
        
        const fullRefundData = {
          refund_type: 'full',
          refund_reason: 'Testing full refund functionality'
        };

        const { response: fullRefundResponse } = await makeRequest(`/bills/${secondBill.id}/refund`, {
          method: 'POST',
          body: JSON.stringify(fullRefundData)
        });

        if (fullRefundResponse.status === 200) {
          log.success('Full refund created successfully');
        } else {
          log.warn('Full refund may have failed');
        }
      }

    } else {
      log.warn('No bills found to test refunds');
    }

    log.success('Refund system test completed');

  } catch (error) {
    log.error(`Refund test failed: ${error.message}`);
    throw error;
  }
};

// Run test
testRefundSystem().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
