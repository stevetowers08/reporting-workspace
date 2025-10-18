# Environment Configuration for API Testing

## Test Environment Variables

Create a `.env.test` file in your project root with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-test-anon-key

# Test Configuration
NODE_ENV=test
TEST_TIMEOUT=10000
TEST_RETRIES=3

# API Endpoints
API_BASE_URL=http://localhost:54321
```

## Environment Setup

### 1. Local Development
```bash
# Copy environment template
cp .env.example .env.test

# Install dependencies
npm install

# Run tests
npm run test:api
```

### 2. CI/CD Environment
Set the following secrets in your GitHub repository:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Staging Environment
```bash
# Staging environment variables
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
NODE_ENV=staging
```

### 4. Production Environment
```bash
# Production environment variables
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
NODE_ENV=production
```

## Test Database Setup

### 1. Create Test Database
```sql
-- Create test database
CREATE DATABASE test_marketing_analytics;

-- Create test user
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE test_marketing_analytics TO test_user;
```

### 2. Run Migrations
```bash
# Run database migrations for test environment
npm run db:migrate:test
```

### 3. Seed Test Data
```bash
# Seed test database with sample data
npm run db:seed:test
```

## Test Configuration Files

### Jest Configuration
The `jest.config.js` file configures:
- Test environment (Node.js)
- Setup files
- Test patterns
- Coverage settings
- Timeout configuration

### Test Setup
The `tests/api/setup.ts` file handles:
- Environment variable loading
- Global test configuration
- Error handling setup

## Running Tests

### Local Testing
```bash
# Run all API tests
npm run test:api

# Run tests in watch mode
npm run test:api:watch

# Run tests with coverage
npm run test:api:coverage

# Run specific test suite
npm run test:api -- --testPathPattern=functional
npm run test:api -- --testPathPattern=security
npm run test:api -- --testPathPattern=integration
```

### CI/CD Testing
```bash
# Run tests for CI/CD
npm run test:api:ci

# Run all tests (unit + API)
npm run test:all
```

## Test Categories

### 1. Functional Tests
- Test core API functionality
- Verify endpoint responses
- Test CRUD operations

### 2. Validation Tests
- Test request/response validation
- Verify data type validation
- Test schema validation

### 3. Error Handling Tests
- Test error scenarios
- Verify error responses
- Test edge cases

### 4. Authentication Tests
- Test token validation
- Verify authorization
- Test access control

### 5. Security Tests
- Test SQL injection prevention
- Test XSS prevention
- Test CSRF protection

### 6. Integration Tests
- Test database integration
- Test external API integration
- Test end-to-end workflows

## Test Data Management

### Test Fixtures
Located in `tests/api/fixtures/testFixtures.ts`:
- Mock users
- Mock clients
- Mock campaigns
- Mock integrations
- Mock API responses

### Test Utilities
Located in `tests/api/utils/testUtils.ts`:
- API request helpers
- Response validation
- Data cleanup utilities
- Performance testing helpers

## Performance Testing

### Response Time Thresholds
- API endpoints: < 2 seconds
- Database operations: < 1 second
- External API calls: < 5 seconds

### Load Testing
- Concurrent requests: 10-100 requests
- Large datasets: 100-1000 records
- Stress testing: 1000+ requests

## Security Testing

### Vulnerability Tests
- SQL injection
- XSS attacks
- CSRF attacks
- Authentication bypass
- Authorization bypass

### Security Headers
- Content-Type-Options
- Frame-Options
- XSS-Protection
- Strict-Transport-Security

## Monitoring and Reporting

### Test Reports
- JUnit XML reports
- Coverage reports
- Performance metrics
- Security scan results

### CI/CD Integration
- GitHub Actions workflow
- Automated test execution
- Test result reporting
- Coverage reporting

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loaded**
   ```bash
   # Check environment file exists
   ls -la .env.test
   
   # Verify variables are loaded
   npm run env:check
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connection
   npm run db:test:connection
   
   # Verify database exists
   npm run db:test:verify
   ```

3. **Test Timeout Issues**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 30000
   
   # Or set environment variable
   TEST_TIMEOUT=30000 npm run test:api
   ```

4. **Coverage Issues**
   ```bash
   # Check coverage configuration
   npm run test:api:coverage
   
   # Verify coverage thresholds
   npm run coverage:check
   ```

### Debug Mode
```bash
# Run tests in debug mode
DEBUG=* npm run test:api

# Run specific test in debug mode
DEBUG=* npm run test:api -- --testNamePattern="specific test"
```

## Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Test Data
- Use test fixtures for consistent data
- Clean up test data after tests
- Use unique identifiers for test data

### 3. Error Testing
- Test both success and failure scenarios
- Verify error messages are user-friendly
- Test edge cases and boundary conditions

### 4. Performance Testing
- Set reasonable timeout values
- Test with realistic data volumes
- Monitor response times

### 5. Security Testing
- Test all input validation
- Verify authentication and authorization
- Test for common vulnerabilities

## Continuous Improvement

### 1. Regular Updates
- Update test dependencies regularly
- Review and update test cases
- Monitor test performance

### 2. Coverage Goals
- Maintain > 80% code coverage
- Focus on critical paths
- Test error scenarios

### 3. Performance Monitoring
- Track response times
- Monitor test execution time
- Optimize slow tests

### 4. Security Reviews
- Regular security testing
- Update vulnerability tests
- Review security headers
