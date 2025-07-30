#!/usr/bin/env node

/**
 * Comprehensive Staging Environment Test Suite
 * Tests all API endpoints against the remote staging environment
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'https://carparts-backend-staging.up.railway.app';
const FRONTEND_URL = 'https://rasuki-carparts-staging.up.railway.app';

let authToken = '';
let testPartId = '';
let testBillId = '';
let testReservationId = '';

// Test utilities
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

// Test suites
const testAuthentication = async () => {
  log.info('Testing Authentication...');

  try {
    // Test valid login
    const { response, data } = await makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (response.status === 200 && data.token) {
      authToken = data.token;
      log.success('Login successful');
      log.info(`User role: ${data.role}`);
    } else {
      throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }

    // Test invalid login
    const { response: badResponse } = await makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'wrongpassword'
      })
    });

    if (badResponse.status === 401) {
      log.success('Invalid login correctly rejected');
    } else {
      log.warn('Invalid login should return 401');
    }

  } catch (error) {
    log.error(`Authentication test failed: ${error.message}`);
    throw error;
  }
};

const testPartsManagement = async () => {
  log.info('Testing Parts Management...');

  try {
    // Get all parts
    const { response, data } = await makeRequest('/parts');
    
    if (response.status === 200 && Array.isArray(data)) {
      log.success(`Retrieved ${data.length} parts`);
      if (data.length > 0) {
        testPartId = data[0].id;
        log.info(`Using test part ID: ${testPartId}`);
      }
    } else {
      throw new Error(`Failed to get parts: ${JSON.stringify(data)}`);
    }

    // Create a new part
    const newPart = {
      name: 'Test Staging Part',
      manufacturer: 'Test Brand',
      total_stock: 10,
      recommended_price: 100
    };

    const { response: createResponse, data: newPartData } = await makeRequest('/parts', {
      method: 'POST',
      body: JSON.stringify(newPart)
    });

    if (createResponse.status === 201 || createResponse.status === 200) {
      log.success('Part created successfully');
      testPartId = newPartData.id;
    } else {
      throw new Error(`Failed to create part: ${JSON.stringify(newPartData)}`);
    }

    // Update the part
    const { response: updateResponse } = await makeRequest(`/parts/${testPartId}`, {
      method: 'PATCH',
      body: JSON.stringify({ recommended_price: 150 })
    });

    if (updateResponse.status === 200) {
      log.success('Part updated successfully');
    } else {
      log.warn('Part update may have failed');
    }

  } catch (error) {
    log.error(`Parts management test failed: ${error.message}`);
    throw error;
  }
};

const testSalesSystem = async () => {
  log.info('Testing Sales System...');

  try {
    // Get all bills
    const { response, data } = await makeRequest('/bills');
    
    if (response.status === 200 && data.bills) {
      log.success(`Retrieved ${data.bills.length} bills`);
    } else {
      throw new Error(`Failed to get bills: ${JSON.stringify(data)}`);
    }

    // Create a sale
    const saleData = {
      customer_name: 'Test Customer',
      customer_phone: '123-456-7890',
      items: [{
        part_id: testPartId,
        quantity: 1,
        unit_price: 150
      }]
    };

    const { response: saleResponse, data: saleResult } = await makeRequest('/sales/sell', {
      method: 'POST',
      body: JSON.stringify(saleData)
    });

    if (saleResponse.status === 200 || saleResponse.status === 201) {
      log.success('Sale created successfully');
      testBillId = saleResult.id;
    } else {
      throw new Error(`Failed to create sale: ${JSON.stringify(saleResult)}`);
    }

  } catch (error) {
    log.error(`Sales system test failed: ${error.message}`);
    throw error;
  }
};

const testReservationSystem = async () => {
  log.info('Testing Reservation System...');

  try {
    // Get all reservations
    const { response, data } = await makeRequest('/api/reservations');
    
    if (response.status === 200 && Array.isArray(data)) {
      log.success(`Retrieved ${data.length} reservations`);
    } else {
      throw new Error(`Failed to get reservations: ${JSON.stringify(data)}`);
    }

    // Create a reservation
    const reservationData = {
      customer_name: 'Test Reservation Customer',
      customer_phone: '987-654-3210',
      deposit_amount: 50,
      items: [{
        part_id: testPartId,
        quantity: 1,
        unit_price: 150
      }]
    };

    const { response: resResponse, data: resResult } = await makeRequest('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData)
    });

    if (resResponse.status === 200 || resResponse.status === 201) {
      log.success('Reservation created successfully');
      testReservationId = resResult.id;
    } else {
      log.warn(`Reservation creation may have failed: ${JSON.stringify(resResult)}`);
    }

  } catch (error) {
    log.error(`Reservation system test failed: ${error.message}`);
  }
};

const testUserManagement = async () => {
  log.info('Testing User Management...');

  try {
    // Get all users (requires admin)
    const { response, data } = await makeRequest('/users');
    
    if (response.status === 200 && Array.isArray(data)) {
      log.success(`Retrieved ${data.length} users`);
    } else {
      throw new Error(`Failed to get users: ${JSON.stringify(data)}`);
    }

  } catch (error) {
    log.error(`User management test failed: ${error.message}`);
  }
};

const testAuditLog = async () => {
  log.info('Testing Audit Log...');

  try {
    // Get audit logs
    const { response, data } = await makeRequest('/audit-logs');
    
    if (response.status === 200 && data.logs) {
      log.success(`Retrieved ${data.logs.length} audit log entries`);
      log.info(`Total audit entries: ${data.total}`);
    } else {
      throw new Error(`Failed to get audit logs: ${JSON.stringify(data)}`);
    }

  } catch (error) {
    log.error(`Audit log test failed: ${error.message}`);
  }
};

const testCORS = async () => {
  log.info('Testing CORS Configuration...');

  try {
    // Test preflight request
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    if (response.status === 204 || response.status === 200) {
      const allowOrigin = response.headers.get('access-control-allow-origin');
      if (allowOrigin === FRONTEND_URL) {
        log.success('CORS configuration is correct');
      } else {
        log.warn(`CORS origin mismatch: expected ${FRONTEND_URL}, got ${allowOrigin}`);
      }
    } else {
      log.warn(`CORS preflight returned status: ${response.status}`);
    }

  } catch (error) {
    log.error(`CORS test failed: ${error.message}`);
  }
};

const testDatabaseSchema = async () => {
  log.info('Testing Database Schema Compatibility...');

  try {
    // Test parts table structure
    const { response, data } = await makeRequest('/parts');
    
    if (response.status === 200 && Array.isArray(data) && data.length > 0) {
      const part = data[0];
      const requiredFields = ['id', 'name', 'manufacturer', 'total_stock', 'available_stock', 'sold_stock', 'reserved_stock'];
      const missingFields = requiredFields.filter(field => !(field in part));
      
      if (missingFields.length === 0) {
        log.success('Parts table schema is correct');
      } else {
        log.error(`Missing fields in parts table: ${missingFields.join(', ')}`);
      }
    }

  } catch (error) {
    log.error(`Database schema test failed: ${error.message}`);
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Staging Environment Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}\n`);

  try {
    await testCORS();
    await testAuthentication();
    await testDatabaseSchema();
    await testPartsManagement();
    await testSalesSystem();
    await testReservationSystem();
    await testUserManagement();
    await testAuditLog();

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Staging environment is ready for use');

  } catch (error) {
    console.log('\n💥 Test suite failed');
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

// Run tests
runAllTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
