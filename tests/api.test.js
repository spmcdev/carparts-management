import request from 'supertest';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

// Mock the database pool
jest.mock('pg');
const mockPool = {
  query: jest.fn(),
};
Pool.mockImplementation(() => mockPool);

// Import the app after mocking
import app from '../index.js';

const JWT_SECRET = 'your_jwt_secret_key';

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const hashedPassword = await bcrypt.hash('testpass', 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'testuser', role: 'general' }]
      });

      const response = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'testpass',
          role: 'general'
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 1,
        username: 'testuser',
        role: 'general'
      });
    });

    it('should handle registration with missing fields', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'testuser'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username and password required');
    });

    it('should handle duplicate username error', async () => {
      mockPool.query.mockRejectedValueOnce({
        code: '23505' // PostgreSQL unique constraint violation
      });

      const response = await request(app)
        .post('/register')
        .send({
          username: 'existinguser',
          password: 'testpass'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /login', () => {
    it('should login user successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('testpass', 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          password: hashedPassword,
          role: 'general'
        }]
      });

      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.role).toBe('general');
      expect(jwt.verify(response.body.token, JWT_SECRET)).toBeTruthy();
    });

    it('should reject login with incorrect credentials', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [] // No user found
      });

      const response = await request(app)
        .post('/login')
        .send({
          username: 'wronguser',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctpass', 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          password: hashedPassword,
          role: 'general'
        }]
      });

      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});

describe('Parts Management Endpoints', () => {
  let authToken, superAdminToken;

  beforeAll(() => {
    // Create test tokens
    authToken = jwt.sign(
      { id: 1, username: 'testuser', role: 'general' },
      JWT_SECRET
    );
    superAdminToken = jwt.sign(
      { id: 2, username: 'superadmin', role: 'superadmin' },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /parts', () => {
    it('should return parts for authenticated user (general)', async () => {
      const partsData = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Manufacturer',
          stock_status: 'available',
          cost_price: '100.00'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: partsData });

      const response = await request(app)
        .get('/parts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      // General user should not see cost_price
      expect(response.body[0]).not.toHaveProperty('cost_price');
      expect(response.body[0].name).toBe('Test Part');
    });

    it('should return parts with cost_price for superadmin', async () => {
      const partsData = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Manufacturer',
          stock_status: 'available',
          cost_price: '100.00'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: partsData });

      const response = await request(app)
        .get('/parts')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      // SuperAdmin should see cost_price
      expect(response.body[0]).toHaveProperty('cost_price', '100.00');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/parts');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /parts', () => {
    it('should create part successfully for authenticated user', async () => {
      const newPart = {
        id: 1,
        name: 'New Part',
        manufacturer: 'New Manufacturer',
        stock_status: 'available',
        cost_price: null
      };

      mockPool.query.mockResolvedValueOnce({ rows: [newPart] });

      const response = await request(app)
        .post('/parts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Part',
          manufacturer: 'New Manufacturer',
          stock_status: 'available'
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Part');
    });

    it('should allow cost_price for superadmin only', async () => {
      const newPart = {
        id: 1,
        name: 'New Part',
        manufacturer: 'New Manufacturer',
        stock_status: 'available',
        cost_price: '150.00'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [newPart] });

      const response = await request(app)
        .post('/parts')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'New Part',
          manufacturer: 'New Manufacturer',
          stock_status: 'available',
          cost_price: '150.00'
        });

      expect(response.status).toBe(201);
      expect(response.body.cost_price).toBe('150.00');
    });
  });

  describe('PATCH /parts/:id/sell', () => {
    it('should sell part successfully for any authenticated user', async () => {
      const soldPart = {
        id: 1,
        name: 'Test Part',
        stock_status: 'sold',
        sold_price: '200.00',
        sold_date: '2025-07-20'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [soldPart] });

      const response = await request(app)
        .patch('/parts/1/sell')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sold_price: '200.00' });

      expect(response.status).toBe(200);
      expect(response.body.stock_status).toBe('sold');
      expect(response.body.sold_price).toBe('200.00');
    });

    it('should handle part not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .patch('/parts/999/sell')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sold_price: '200.00' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Part not found');
    });
  });
});

describe('Bills Management Endpoints', () => {
  let authToken;

  beforeAll(() => {
    authToken = jwt.sign(
      { id: 1, username: 'testuser', role: 'general' },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /bills', () => {
    it('should create bill successfully', async () => {
      const newBill = {
        id: 1,
        customer_name: 'Test Customer',
        bill_number: 'TEST001',
        date: '2025-07-20',
        items: [{ id: 1, name: 'Test Part', sold_price: '200' }]
      };

      mockPool.query.mockResolvedValueOnce({ rows: [newBill] });

      const response = await request(app)
        .post('/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: 'Test Customer',
          billNumber: 'TEST001',
          date: '2025-07-20',
          items: [{ id: 1, name: 'Test Part', sold_price: '200' }]
        });

      expect(response.status).toBe(201);
      expect(response.body.customer_name).toBe('Test Customer');
    });
  });

  describe('GET /bills', () => {
    it('should return bills for authenticated user', async () => {
      const billsData = [
        {
          id: 1,
          customer_name: 'Test Customer',
          bill_number: 'TEST001',
          date: '2025-07-20',
          items: [{ id: 1, name: 'Test Part', sold_price: '200' }]
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: billsData });

      const response = await request(app)
        .get('/bills')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].customer_name).toBe('Test Customer');
    });
  });
});

describe('User Management Endpoints', () => {
  let adminToken, superAdminToken;

  beforeAll(() => {
    adminToken = jwt.sign(
      { id: 2, username: 'admin', role: 'admin' },
      JWT_SECRET
    );
    superAdminToken = jwt.sign(
      { id: 3, username: 'superadmin', role: 'superadmin' },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('should return users for admin', async () => {
      const usersData = [
        { id: 1, username: 'user1', role: 'general' },
        { id: 2, username: 'admin', role: 'admin' }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: usersData });

      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should deny access to general users', async () => {
      const generalToken = jwt.sign(
        { id: 1, username: 'user', role: 'general' },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${generalToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });
});

describe('Role-Based Access Control', () => {
  let generalToken, adminToken, superAdminToken;

  beforeAll(() => {
    generalToken = jwt.sign(
      { id: 1, username: 'general', role: 'general' },
      JWT_SECRET
    );
    adminToken = jwt.sign(
      { id: 2, username: 'admin', role: 'admin' },
      JWT_SECRET
    );
    superAdminToken = jwt.sign(
      { id: 3, username: 'superadmin', role: 'superadmin' },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cost Price Access Control', () => {
    it('should allow cost_price updates only for superadmin', async () => {
      // Mock for admin trying to update cost_price
      const response1 = await request(app)
        .patch('/parts/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cost_price: '100.00' });

      expect(response1.status).toBe(403);
      expect(response1.body.error).toBe('SuperAdmin access required to update cost price');

      // Mock for superadmin updating cost_price
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, cost_price: '100.00' }]
      });

      const response2 = await request(app)
        .patch('/parts/1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ cost_price: '100.00' });

      expect(response2.status).toBe(200);
    });
  });

  describe('Admin Panel Access', () => {
    it('should allow admin and superadmin access to user management', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      // Admin access
      const response1 = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response1.status).toBe(200);

      // SuperAdmin access
      const response2 = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response2.status).toBe(200);
    });

    it('should deny general user access to admin endpoints', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${generalToken}`);

      expect(response.status).toBe(403);
    });
  });
});
