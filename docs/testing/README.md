# 🧪 Tests Directory

This directory contains all test files for the Car Parts Management System.

## 📂 Test File Organization

### **Backend API Tests (Jest)**
- `api.test.js` - Unit tests for backend API endpoints
- `api-integration.test.js` - Integration tests for live API testing  
- `partial-refund.test.js` - Specialized tests for refund functionality
- `setup.js` - Jest configuration and test setup

### **Staging Environment Tests (Node.js)**
- `test-staging-remote.js` - Comprehensive staging API testing
- `test-refund-staging.js` - Refund system validation on staging
- `test-frontend-staging.js` - Frontend integration testing on staging

## 🚀 Running Tests

### **Unit & Integration Tests (Jest)**
```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

### **Staging Environment Tests (Node.js)**
```bash
# Comprehensive staging validation
node tests/test-staging-remote.js

# Test refund system
node tests/test-refund-staging.js

# Test frontend integration
node tests/test-frontend-staging.js
```

## 📋 Test Coverage

### **API Endpoints Tested:**
- ✅ Authentication (login/logout)
- ✅ Parts management (CRUD operations)
- ✅ Bills management with pagination
- ✅ Enhanced reservations (multi-item)
- ✅ User management
- ✅ Refund system (partial/full)
- ✅ Audit logging

### **Integration Points:**
- ✅ Database operations
- ✅ JWT authentication
- ✅ CORS configuration
- ✅ Frontend-backend communication
- ✅ Error handling

## 🎯 Test Environments

### **Local Development**
- Unit tests run against mocked data
- Integration tests can run against local server

### **Staging Environment**
- Live testing against Railway staging deployment
- Real database operations
- Full frontend-backend integration validation

### **Production Health Check**
```bash
npm run test:production
```

## 📝 Notes

- **Jest Configuration**: Located in root `jest.config.json`
- **ES Modules**: All tests use ES module syntax (`import/export`)
- **Authentication**: Staging tests use real admin credentials
- **Database**: Integration tests use actual database operations

## 🔧 Adding New Tests

1. **Unit Tests**: Add to `api.test.js` or create new `*.test.js` file
2. **Integration Tests**: Add to `api-integration.test.js`
3. **Staging Tests**: Create new `test-*.js` file for specific functionality
4. **Setup**: Use `setup.js` for shared test configuration
