#!/usr/bin/env node

/**
 * Production Health Check Script for Car Parts Management System
 * Tests all critical API endpoints and functionality
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = 'https://carparts-management-production.up.railway.app';
const TEST_CONFIG = {
  timeout: 10000, // 10 seconds
  credentials: {
    username: 'admin',
    password: 'admin123'
  }
};

class ProductionHealthChecker {
  constructor() {
    this.token = null;
    this.testResults = [];
    this.startTime = performance.now();
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async recordTest(testName, passed, responseTime, details = {}) {
    this.testResults.push({
      testName,
      passed,
      responseTime,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async makeRequest(endpoint, options = {}) {
    const startTime = performance.now();
    const url = `${BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        responseTime,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      return {
        ok: false,
        status: 0,
        error: error.message,
        responseTime
      };
    }
  }

  async testAuthentication() {
    await this.log('Testing Authentication...', 'info');
    
    const result = await this.makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.credentials)
    });

    if (result.ok && result.data.token) {
      this.token = result.data.token;
      await this.log('✓ Authentication successful', 'success');
      await this.recordTest('Authentication', true, result.responseTime, {
        role: result.data.role
      });
      return true;
    } else {
      await this.log('✗ Authentication failed', 'error');
      await this.recordTest('Authentication', false, result.responseTime, {
        error: result.error || result.data
      });
      return false;
    }
  }

  async testPartsManagement() {
    await this.log('Testing Parts Management...', 'info');
    
    // Test parts retrieval
    const result = await this.makeRequest('/parts?limit=5');
    
    if (result.ok && Array.isArray(result.data)) {
      await this.log(`✓ Parts retrieval successful (${result.data.length} parts)`, 'success');
      await this.recordTest('Parts Retrieval', true, result.responseTime, {
        partsCount: result.data.length,
        hasSearchFields: result.data.length > 0 ? 
          Object.keys(result.data[0]).includes('name') && 
          Object.keys(result.data[0]).includes('manufacturer') : false
      });
      return true;
    } else {
      await this.log('✗ Parts retrieval failed', 'error');
      await this.recordTest('Parts Retrieval', false, result.responseTime, {
        error: result.error || result.data
      });
      return false;
    }
  }

  async testBillsManagement() {
    await this.log('Testing Enhanced Bills Management...', 'info');
    
    const result = await this.makeRequest('/bills?limit=5');
    
    if (result.ok && Array.isArray(result.data)) {
      const hasEnhancedFields = result.data.length > 0 ? 
        Object.keys(result.data[0]).includes('status') &&
        Object.keys(result.data[0]).includes('customer_phone') &&
        Object.keys(result.data[0]).includes('refund_date') : false;

      if (hasEnhancedFields) {
        await this.log('✓ Enhanced bills management operational', 'success');
        await this.recordTest('Enhanced Bills', true, result.responseTime, {
          billsCount: result.data.length,
          enhancedFields: true,
          statusTypes: [...new Set(result.data.map(bill => bill.status))]
        });
        return true;
      } else {
        await this.log('⚠ Bills retrieved but missing enhanced fields', 'warning');
        await this.recordTest('Enhanced Bills', false, result.responseTime, {
          error: 'Missing enhanced fields (status, customer_phone, refund_date)'
        });
        return false;
      }
    } else {
      await this.log('✗ Bills retrieval failed', 'error');
      await this.recordTest('Enhanced Bills', false, result.responseTime, {
        error: result.error || result.data
      });
      return false;
    }
  }

  async testReservationsSystem() {
    await this.log('Testing Reservations System...', 'info');
    
    const result = await this.makeRequest('/api/reservations?limit=5');
    
    if (result.ok && Array.isArray(result.data)) {
      await this.log(`✓ Reservations system operational (${result.data.length} reservations)`, 'success');
      await this.recordTest('Reservations System', true, result.responseTime, {
        reservationsCount: result.data.length,
        statusTypes: result.data.length > 0 ? 
          [...new Set(result.data.map(res => res.status))] : []
      });
      return true;
    } else {
      await this.log('✗ Reservations system failed', 'error');
      await this.recordTest('Reservations System', false, result.responseTime, {
        error: result.error || result.data
      });
      return false;
    }
  }

  async testUserManagement() {
    await this.log('Testing User Management...', 'info');
    
    const result = await this.makeRequest('/users');
    
    if (result.ok && Array.isArray(result.data)) {
      await this.log(`✓ User management operational (${result.data.length} users)`, 'success');
      await this.recordTest('User Management', true, result.responseTime, {
        usersCount: result.data.length,
        roles: [...new Set(result.data.map(user => user.role))]
      });
      return true;
    } else {
      await this.log('✗ User management failed', 'error');
      await this.recordTest('User Management', false, result.responseTime, {
        error: result.error || result.data
      });
      return false;
    }
  }

  async testBillEditFunctionality() {
    await this.log('Testing Bill Edit Functionality...', 'info');
    
    // First get a bill to edit
    const billsResult = await this.makeRequest('/bills?limit=1');
    
    if (!billsResult.ok || !billsResult.data.length) {
      await this.log('✗ No bills available for edit test', 'error');
      await this.recordTest('Bill Edit', false, 0, { error: 'No bills available' });
      return false;
    }

    const testBill = billsResult.data[0];
    const editData = {
      customer_name: `Test Edit ${Date.now()}`,
      customer_phone: '999-TEST-EDIT',
      bill_number: `TEST-${Date.now()}`,
      items: testBill.items || []
    };

    const editResult = await this.makeRequest(`/bills/${testBill.id}`, {
      method: 'PUT',
      body: JSON.stringify(editData)
    });

    if (editResult.ok) {
      await this.log('✓ Bill edit functionality working', 'success');
      await this.recordTest('Bill Edit', true, editResult.responseTime, {
        editedBillId: testBill.id,
        fieldsUpdated: Object.keys(editData)
      });
      return true;
    } else {
      await this.log('✗ Bill edit functionality failed', 'error');
      await this.recordTest('Bill Edit', false, editResult.responseTime, {
        error: editResult.error || editResult.data
      });
      return false;
    }
  }

  async testRefundFunctionality() {
    await this.log('Testing Refund Functionality...', 'info');
    
    // Get an active bill for refund test
    const billsResult = await this.makeRequest('/bills?limit=10');
    
    if (!billsResult.ok || !billsResult.data.length) {
      await this.log('✗ No bills available for refund test', 'error');
      await this.recordTest('Refund Processing', false, 0, { error: 'No bills available' });
      return false;
    }

    const activeBill = billsResult.data.find(bill => bill.status === 'active');
    
    if (!activeBill) {
      await this.log('⚠ No active bills for refund test', 'warning');
      await this.recordTest('Refund Processing', false, 0, { error: 'No active bills available' });
      return false;
    }

    const refundData = {
      refund_reason: `Test refund ${Date.now()}`,
      refund_type: 'partial',
      refund_amount: 10.00
    };

    const refundResult = await this.makeRequest(`/bills/${activeBill.id}/refund`, {
      method: 'POST',
      body: JSON.stringify(refundData)
    });

    if (refundResult.ok) {
      await this.log('✓ Refund functionality working', 'success');
      await this.recordTest('Refund Processing', true, refundResult.responseTime, {
        refundedBillId: activeBill.id,
        refundType: 'partial'
      });
      return true;
    } else {
      await this.log('✗ Refund functionality failed', 'error');
      await this.recordTest('Refund Processing', false, refundResult.responseTime, {
        error: refundResult.error || refundResult.data
      });
      return false;
    }
  }

  async testPerformance() {
    await this.log('Testing Performance Metrics...', 'info');
    
    const performanceTests = [
      { name: 'Parts Load', endpoint: '/parts?limit=50' },
      { name: 'Bills Load', endpoint: '/bills?limit=50' },
      { name: 'Reservations Load', endpoint: '/api/reservations?limit=50' }
    ];

    let allPassed = true;
    const results = {};

    for (const test of performanceTests) {
      const result = await this.makeRequest(test.endpoint);
      const passed = result.ok && result.responseTime < 5000; // 5 second threshold
      
      results[test.name] = {
        responseTime: result.responseTime,
        passed
      };

      if (passed) {
        await this.log(`✓ ${test.name}: ${result.responseTime}ms`, 'success');
      } else {
        await this.log(`✗ ${test.name}: ${result.responseTime}ms (too slow or failed)`, 'error');
        allPassed = false;
      }
    }

    const avgResponseTime = Object.values(results).reduce((sum, r) => sum + r.responseTime, 0) / Object.keys(results).length;

    await this.recordTest('Performance', allPassed, avgResponseTime, results);
    return allPassed;
  }

  async generateReport() {
    const endTime = performance.now();
    const totalTime = Math.round(endTime - this.startTime);
    
    const passed = this.testResults.filter(t => t.passed).length;
    const total = this.testResults.length;
    const passRate = ((passed / total) * 100).toFixed(1);

    await this.log('\n' + '='.repeat(80), 'info');
    await this.log('PRODUCTION HEALTH CHECK REPORT', 'info');
    await this.log('='.repeat(80), 'info');
    
    await this.log(`\nOverall Status: ${passed}/${total} tests passed (${passRate}%)`, 
      passRate >= 80 ? 'success' : 'error');
    await this.log(`Total execution time: ${totalTime}ms`, 'info');
    
    await this.log('\nDetailed Results:', 'info');
    await this.log('-'.repeat(50), 'info');
    
    for (const test of this.testResults) {
      const status = test.passed ? '✓' : '✗';
      const color = test.passed ? 'success' : 'error';
      await this.log(`${status} ${test.testName.padEnd(25)} ${test.responseTime}ms`, color);
      
      if (!test.passed && test.details.error) {
        await this.log(`  Error: ${test.details.error}`, 'error');
      }
    }

    await this.log('\nSystem Health Summary:', 'info');
    await this.log('-'.repeat(30), 'info');
    
    const healthyComponents = this.testResults.filter(t => t.passed).map(t => t.testName);
    const unhealthyComponents = this.testResults.filter(t => !t.passed).map(t => t.testName);
    
    if (healthyComponents.length > 0) {
      await this.log(`Healthy: ${healthyComponents.join(', ')}`, 'success');
    }
    
    if (unhealthyComponents.length > 0) {
      await this.log(`Issues: ${unhealthyComponents.join(', ')}`, 'error');
    }

    await this.log('\n' + '='.repeat(80), 'info');
    
    return {
      passRate: parseFloat(passRate),
      totalTests: total,
      passedTests: passed,
      executionTime: totalTime,
      healthy: passRate >= 80,
      details: this.testResults
    };
  }

  async runHealthCheck() {
    await this.log('Starting Production Health Check...', 'info');
    await this.log(`Target: ${BASE_URL}`, 'info');
    await this.log('-'.repeat(50), 'info');

    try {
      // Core authentication test
      const authSuccess = await this.testAuthentication();
      if (!authSuccess) {
        await this.log('Authentication failed - aborting remaining tests', 'error');
        return await this.generateReport();
      }

      // Run all other tests
      await this.testPartsManagement();
      await this.testBillsManagement();
      await this.testReservationsSystem();
      await this.testUserManagement();
      await this.testBillEditFunctionality();
      await this.testRefundFunctionality();
      await this.testPerformance();

    } catch (error) {
      await this.log(`Unexpected error: ${error.message}`, 'error');
      await this.recordTest('System Error', false, 0, { error: error.message });
    }

    return await this.generateReport();
  }
}

// Main execution
async function main() {
  const checker = new ProductionHealthChecker();
  const report = await checker.runHealthCheck();
  
  // Exit with appropriate code
  process.exit(report.healthy ? 0 : 1);
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ProductionHealthChecker;
