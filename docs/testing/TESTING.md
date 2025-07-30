# Testing Documentation for Car Parts Management System

## Overview

This document describes the comprehensive testing strategy for the Car Parts Management System, including unit tests, integration tests, and production health checks.

## Testing Structure

### 1. Production Health Check Script (`scripts/production-health-check.js`)

**Purpose**: Validates all critical functionality in the production environment.

**Features**:
- Real-time API endpoint testing
- Performance monitoring
- Database schema validation
- Authentication verification
- Enhanced billing features testing
- Refund functionality validation
- Comprehensive reporting

**Usage**:
```bash
# Run production health check
npm run health-check

# Or run directly
cd scripts && npm install && node production-health-check.js
```

**What it tests**:
- ✅ Authentication system
- ✅ Parts management API
- ✅ Enhanced bills management (edit/refund)
- ✅ Reservations system
- ✅ User management
- ✅ Performance metrics
- ✅ Database schema integrity

### 2. Integration Tests (`tests/api-integration.test.js`)

**Purpose**: Tests API endpoints with actual HTTP requests to production.

**Features**:
- Real production environment testing
- End-to-end workflow validation
- Enhanced billing features testing
- Error handling verification

**Usage**:
```bash
# Run integration tests only
npm run test:integration

# Run with specific environment
API_BASE_URL=https://your-production-url npm run test:integration
```

### 3. Unit Tests (Existing test files)

**Purpose**: Test individual components and functions in isolation.

**Usage**:
```bash
# Run unit tests only
npm run test:unit

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Test Configuration

### Jest Configuration (`jest.config.json`)

The project uses multiple Jest projects:

1. **backend-unit**: Unit tests for backend functionality
2. **backend-integration**: Integration tests against production API
3. **frontend**: React component tests

### Environment Variables

```bash
# Optional: Override API URL for integration tests
export API_BASE_URL=https://carparts-management-production.up.railway.app

# Default credentials for testing
export TEST_USERNAME=admin
export TEST_PASSWORD=admin123
```

## Running Different Test Suites

### Quick Production Check
```bash
npm run health-check
```
**Best for**: Quick verification that production is healthy

### Full Integration Testing
```bash
npm run test:integration
```
**Best for**: Thorough API testing with real data

### Development Testing
```bash
npm run test:unit
```
**Best for**: Fast feedback during development

### Complete Test Suite
```bash
npm test
```
**Best for**: Comprehensive testing before deployment

## Production Health Check Report

The health check script provides detailed reporting:

```
PRODUCTION HEALTH CHECK REPORT
================================================================================

Overall Status: 8/8 tests passed (100.0%)
Total execution time: 3247ms

Detailed Results:
--------------------------------------------------
✓ Authentication              156ms
✓ Parts Retrieval             234ms
✓ Enhanced Bills              312ms
✓ Reservations System         189ms
✓ User Management             145ms
✓ Bill Edit                   423ms
✓ Refund Processing           234ms
✓ Performance                 1554ms

System Health Summary:
------------------------------
Healthy: Authentication, Parts Retrieval, Enhanced Bills, Reservations System, User Management, Bill Edit, Refund Processing, Performance
```

## Test Data Requirements

### For Production Testing
- Admin credentials must exist
- At least one part in inventory
- At least one bill in the system
- At least one user account

### Test Safety
- Health checks use read-only operations where possible
- Write operations use test data that can be safely modified
- All test changes are clearly marked with timestamps

## Continuous Integration

## CI/CD Integration

### Current Setup
- **Railway**: Automatic deployment from GitHub integration
- **Vercel**: Automatic frontend deployment from GitHub integration
- **Database**: PostgreSQL hosted on Railway with automatic migrations

### GitHub Integration Benefits
- Automatic deployments on push to main branch
- Railway rebuilds backend automatically
- Vercel rebuilds frontend automatically
- Database migrations run automatically via Railway

### Manual Monitoring
Since deployments are automatic via GitHub integration:
- Use `npm run health-check` after deployments to verify system health
- Monitor Railway logs for deployment status
- Monitor Vercel deployment dashboard
- Run production tests manually when needed

## Recommended Workflow

### Development
1. Run unit tests: `npm run test:unit`
2. Run integration tests: `npm run test:integration`
3. Commit and push changes

### After Deployment (Automatic via GitHub)
1. Wait for Railway/Vercel deployment to complete
2. Run production health check: `npm run health-check`
3. Monitor system status
4. Run production tests if needed: `npm run test:production`

### Regular Monitoring
- Set up periodic health checks
- Monitor Railway and Vercel dashboards
- Review deployment logs for any issues
- Use production health script for comprehensive validation

## Database Migration Testing

The tests automatically verify that database migrations have been applied:

### Enhanced Bills Table
- ✅ `customer_phone` column exists
- ✅ `status` column with proper values
- ✅ `refund_date`, `refund_reason`, `refund_amount` columns
- ✅ `refunded_by` foreign key constraint
- ✅ Bill number nullable constraint

### Performance Indexes
- ✅ Search indexes on key fields
- ✅ Query performance within acceptable limits

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   ```bash
   # Check credentials
   curl -X POST https://your-api/login -d '{"username":"admin","password":"admin123"}'
   ```

2. **Network Timeouts**
   ```bash
   # Check API connectivity
   curl -I https://your-api/
   ```

3. **Database Schema Issues**
   ```bash
   # Run integration tests to verify schema
   npm run test:integration
   ```

### Test Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   cd scripts && npm install
   ```

2. **Verify Configuration**
   ```bash
   # Check Jest config
   npx jest --showConfig
   ```

3. **Run Diagnostic**
   ```bash
   # Basic connectivity test
   npm run health-check
   ```

## Best Practices

### For Development
1. Run unit tests frequently during development
2. Run integration tests before pushing changes
3. Use health check after deployments

### For Production
1. Schedule automated health checks
2. Monitor test results and response times
3. Set up alerts for test failures

### For CI/CD
1. Include health checks in deployment pipeline
2. Fail deployments if health checks fail
3. Run full test suite before production releases

## Metrics and Monitoring

The testing system tracks:
- **Response Times**: API endpoint performance
- **Success Rates**: Percentage of passing tests
- **Error Patterns**: Common failure modes
- **Database Health**: Schema integrity and performance

### Performance Thresholds
- API responses: < 5 seconds
- Database queries: < 2 seconds
- Overall health check: < 30 seconds

## Future Enhancements

1. **Load Testing**: Add stress testing capabilities
2. **Security Testing**: Add security vulnerability scanning
3. **Mobile Testing**: Add mobile app API testing
4. **Reporting**: Enhanced reporting with dashboards
5. **Alerts**: Integration with monitoring systems
