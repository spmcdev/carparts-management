/**
 * Updated API Integration Tests
 * Fixed to work with production environment and updated features
 */

import request from 'supertest';
import { jest } from '@jest/globals';

// Use production URL for tests
const API_BASE_URL = process.env.API_BASE_URL || 'https://carparts-management-production.up.railway.app';

describe('Car Parts Management API - Integration Tests', () => {
  let authToken = '';
  let testUserId = '';
  let testPartId = '';
  let testBillId = '';
  let testReservationId = '';

  beforeAll(async () => {
    // Authenticate before running tests
    const response = await request(API_BASE_URL)
      .post('/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    authToken = response.body.token;
  }, 30000);

  describe('Authentication', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await request(API_BASE_URL)
        .post('/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.role).toBeDefined();
    });

    test('should fail login with invalid credentials', async () => {
      const response = await request(API_BASE_URL)
        .post('/login')
        .send({
          username: 'invalid',
          password: 'invalid'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Parts Management', () => {
    test('should retrieve parts list', async () => {
      const response = await request(API_BASE_URL)
        .get('/parts?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const part = response.body[0];
        expect(part).toHaveProperty('id');
        expect(part).toHaveProperty('name');
        expect(part).toHaveProperty('manufacturer');
        expect(part).toHaveProperty('stock_status');
        testPartId = part.id;
      }
    });

    test('should search parts by name', async () => {
      const response = await request(API_BASE_URL)
        .get('/parts/search?q=engine')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should handle parts search with no results', async () => {
      const response = await request(API_BASE_URL)
        .get('/parts/search?q=nonexistentpart12345')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('Enhanced Bills Management', () => {
    test('should retrieve bills with pagination support', async () => {
      const response = await request(API_BASE_URL)
        .get('/bills?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bills');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.bills)).toBe(true);
      
      // Check pagination structure
      const pagination = response.body.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('pages');
      expect(pagination).toHaveProperty('hasNextPage');
      expect(pagination).toHaveProperty('hasPreviousPage');
      
      if (response.body.bills.length > 0) {
        const bill = response.body.bills[0];
        expect(bill).toHaveProperty('id');
        expect(bill).toHaveProperty('customer_name');
        expect(bill).toHaveProperty('customer_phone');
        expect(bill).toHaveProperty('bill_number');
        expect(bill).toHaveProperty('status');
        expect(bill).toHaveProperty('items');
        testBillId = bill.id;
      }
    });

    test('should search bills with pagination', async () => {
      const response = await request(API_BASE_URL)
        .get('/bills?search=test&page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('bills');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.bills)).toBe(true);
    });

    test('should create bill with optional bill number', async () => {
      const billData = {
        customer_name: 'Test Customer',
        customer_phone: '123-456-7890',
        bill_number: null, // Optional
        items: [
          {
            part_name: 'Test Part',
            quantity: 1,
            unit_price: 100,
            total_price: 100,
            manufacturer: 'Test Manufacturer'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(billData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.customer_name).toBe(billData.customer_name);
      expect(response.body.status).toBe('active');
    });

    test('should edit existing bill', async () => {
      if (!testBillId) {
        console.log('Skipping bill edit test - no test bill available');
        return;
      }

      const editData = {
        customer_name: 'Updated Customer Name',
        customer_phone: '999-888-7777',
        bill_number: `EDIT-TEST-${Date.now()}`,
        items: [
          {
            part_name: 'Updated Part',
            quantity: 1,
            unit_price: 150,
            total_price: 150,
            manufacturer: 'Updated Manufacturer'
          }
        ]
      };

      const response = await request(API_BASE_URL)
        .put(`/bills/${testBillId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(editData);

      expect(response.status).toBe(200);
      expect(response.body.customer_name).toBe(editData.customer_name);
    });

    test('should process partial refund', async () => {
      if (!testBillId) {
        console.log('Skipping refund test - no test bill available');
        return;
      }

      const refundData = {
        refund_reason: 'Test partial refund',
        refund_type: 'partial',
        refund_amount: 25.00
      };

      const response = await request(API_BASE_URL)
        .post(`/bills/${testBillId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('refund processed');
    });
  });

  describe('Enhanced Reservations System', () => {
    test('should retrieve reservations with multi-item support', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reservations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const reservation = response.body[0];
        expect(reservation).toHaveProperty('id');
        expect(reservation).toHaveProperty('reservation_number');
        expect(reservation).toHaveProperty('customer_name');
        expect(reservation).toHaveProperty('customer_phone');
        expect(reservation).toHaveProperty('status');
        expect(reservation).toHaveProperty('total_amount');
        expect(reservation).toHaveProperty('deposit_amount');
        expect(reservation).toHaveProperty('remaining_amount');
        expect(reservation).toHaveProperty('items');
        expect(Array.isArray(reservation.items)).toBe(true);
        testReservationId = reservation.id;
        
        // Test enhanced multi-item structure
        if (reservation.items.length > 0 && reservation.items[0]) {
          const item = reservation.items[0];
          expect(item).toHaveProperty('part_id');
          expect(item).toHaveProperty('part_name');
          expect(item).toHaveProperty('quantity');
          expect(item).toHaveProperty('unit_price');
          expect(item).toHaveProperty('total_price');
        }
      }
    });

    test('should search reservations', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reservations?search=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter reservations by status', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/reservations?search=reserved')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('User Management', () => {
    test('should retrieve users list', async () => {
      const response = await request(API_BASE_URL)
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const user = response.body[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('role');
        testUserId = user.id;
      }
    });
  });

  describe('Performance Tests', () => {
    test('should respond to parts request within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(API_BASE_URL)
        .get('/parts?limit=50')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test('should respond to bills request within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(API_BASE_URL)
        .get('/bills?limit=50')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('Error Handling', () => {
    test('should handle unauthorized requests', async () => {
      const response = await request(API_BASE_URL)
        .get('/parts');

      expect(response.status).toBe(401);
    });

    test('should handle invalid bill ID in edit request', async () => {
      const response = await request(API_BASE_URL)
        .put('/bills/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customer_name: 'Test',
          items: []
        });

      expect(response.status).toBe(404);
    });

    test('should handle invalid refund request', async () => {
      if (!testBillId) {
        console.log('Skipping invalid refund test - no test bill available');
        return;
      }

      const response = await request(API_BASE_URL)
        .post(`/bills/${testBillId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required refund_reason
          refund_type: 'partial',
          refund_amount: 10.00
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('Database Schema Validation', () => {
  let authToken = '';

  beforeAll(async () => {
    const response = await request(API_BASE_URL)
      .post('/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    authToken = response.body.token;
  });

  test('should verify enhanced bills table structure', async () => {
    const response = await request(API_BASE_URL)
      .get('/bills?limit=1')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    
    if (response.body.length > 0) {
      const bill = response.body[0];
      
      // Check for enhanced fields from migration
      expect(bill).toHaveProperty('customer_phone');
      expect(bill).toHaveProperty('status');
      expect(bill).toHaveProperty('refund_date');
      expect(bill).toHaveProperty('refund_reason');
      expect(bill).toHaveProperty('refund_amount');
      expect(bill).toHaveProperty('refunded_by');
      
      // Bill number should be nullable
      expect(bill.bill_number === null || typeof bill.bill_number === 'string').toBe(true);
    }
  });

  test('should verify reservations table functionality', async () => {
    const response = await request(API_BASE_URL)
      .get('/api/reservations?limit=1')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    
    if (response.body.length > 0) {
      const reservation = response.body[0];
      
      // Check for required reservation fields
      expect(reservation).toHaveProperty('reservation_number');
      expect(reservation).toHaveProperty('customer_name');
      expect(reservation).toHaveProperty('part_id');
      expect(reservation).toHaveProperty('price_agreed');
      expect(reservation).toHaveProperty('deposit_amount');
      expect(reservation).toHaveProperty('status');
    }
  });
});
