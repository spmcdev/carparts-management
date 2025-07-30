// Jest setup file for backend tests
process.env.NODE_ENV = 'test';

// Set test database URL if needed
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

// Setup test timeout
jest.setTimeout(30000);
