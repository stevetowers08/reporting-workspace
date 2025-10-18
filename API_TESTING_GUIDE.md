# Comprehensive API Testing Setup

This document provides a complete guide to the API testing framework implemented for the Marketing Analytics Dashboard.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
# Copy environment template
cp .env.example .env.test

# Edit .env.test with your test configuration
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=your-test-anon-key
```

### 3. Run Tests
```bash
# Run all API tests
npm run test:api

# Run tests in watch mode
npm run test:api:watch

# Run tests with coverage
npm run test:api:coverage
```

## 📁 Project Structure

```
tests/
├── api/
│   ├── functional/           # Core API functionality tests
│   │   └── functional.test.ts
│   ├── validation/          # Request/response validation tests
│   │   └── validation.test.ts
│   ├── error-handling/      # Error scenario tests
│   │   └── errorHandling.test.ts
│   ├── authentication/      # Auth and authorization tests
│   │   └── authentication.test.ts
│   ├── security/           # Security vulnerability tests
│   │   └── security.test.ts
│   ├── integration/         # Database and external API tests
│   │   └── integration.test.ts
│   ├── fixtures/           # Test data and mock objects
│   │   └── testFixtures.ts
│   ├── utils/              # Test utilities and helpers
│   │   └── testUtils.ts
│   ├── setup.ts            # Test environment setup
│   ├── global-setup.ts     # Global test setup
│   ├── global-teardown.ts  # Global test cleanup
│   └── README.md           # API testing documentation
├── unit/                   # Unit tests (existing)
├── e2e/                    # End-to-end tests (existing)
└── integration/            # Integration tests (existing)
```

## 🧪 Test Categories

### 1. Functional Tests (`tests/api/functional/`)
Tests core API functionality and endpoints:

```typescript
// Example: Testing client creation
test('POST /api/venues -> 201 Created with valid data', async () => {
  const mockClient = TestFixtures.getMockClients()[0];
  
  const response = await TestUtils.makeRequest(
    `${config.baseUrl}/api/venues`,
    {
      method: 'POST',
      body: JSON.stringify(mockClient)
    }
  );

  TestUtils.assertStatusCode(response.status, 201);
  expect(response.data).toHaveProperty('id');
});
```

**Coverage:**
- ✅ Supabase Edge Functions
- ✅ Client Management API
- ✅ Integration APIs (Google Ads, Facebook Ads, GHL, Google Sheets)
- ✅ OAuth Callback handling

### 2. Validation Tests (`tests/api/validation/`)
Tests request/response validation and data types:

```typescript
// Example: Testing invalid email format
test('POST /api/venues -> 400 Bad Request with invalid email format', async () => {
  const invalidData = {
    name: 'Test Client',
    email: 'invalid-email-format', // Invalid email
    phone: '+1234567890'
  };

  const response = await TestUtils.makeRequest(
    `${config.baseUrl}/api/venues`,
    {
      method: 'POST',
      body: JSON.stringify(invalidData)
    }
  );

  TestUtils.assertStatusCode(response.status, 400);
  expect(response.data).toHaveProperty('error');
});
```

**Coverage:**
- ✅ Request schema validation
- ✅ Response schema validation
- ✅ Data type validation
- ✅ Content-Type validation

### 3. Error Handling Tests (`tests/api/error-handling/`)
Tests error scenarios and edge cases:

```typescript
// Example: Testing 404 Not Found
test('GET /api/venues/invalid-id -> 404 Not Found', async () => {
  const response = await TestUtils.makeRequest(
    `${config.baseUrl}/api/venues/non-existent-id`
  );

  TestUtils.assertStatusCode(response.status, 404);
  expect(response.data).toHaveProperty('error');
});
```

**Coverage:**
- ✅ HTTP status code tests
- ✅ Invalid input tests
- ✅ Edge case tests
- ✅ Network error tests
- ✅ OAuth error tests
- ✅ Rate limiting tests

### 4. Authentication Tests (`tests/api/authentication/`)
Tests token validation and authorization:

```typescript
// Example: Testing unauthorized access
test('GET /api/venues -> 401 Unauthorized without token', async () => {
  const response = await TestUtils.makeRequest(
    `${config.baseUrl}/api/venues`,
    {
      headers: {
        // No Authorization header
        'Content-Type': 'application/json'
      }
    }
  );

  TestUtils.assertStatusCode(response.status, 401);
  expect(response.data).toHaveProperty('error');
});
```

**Coverage:**
- ✅ Token validation tests
- ✅ Authorization tests
- ✅ Role-based access control
- ✅ OAuth token tests
- ✅ Session management tests
- ✅ API key tests
- ✅ CORS tests
- ✅ Rate limiting tests
- ✅ Security headers tests

### 5. Security Tests (`tests/api/security/`)
Tests for security vulnerabilities:

```typescript
// Example: Testing SQL injection prevention
test('POST /api/venues -> SQL injection in name field', async () => {
  const maliciousData = {
    name: "'; DROP TABLE venues; --",
    email: 'test@example.com',
    phone: '+1234567890'
  };

  const response = await TestUtils.makeRequest(
    `${config.baseUrl}/api/venues`,
    {
      method: 'POST',
      body: JSON.stringify(maliciousData)
    }
  );

  // Should either reject the request or sanitize the input
  expect([400, 201]).toContain(response.status);
});
```

**Coverage:**
- ✅ SQL injection tests
- ✅ XSS (Cross-Site Scripting) tests
- ✅ CSRF (Cross-Site Request Forgery) tests
- ✅ Input sanitization tests
- ✅ Authentication bypass tests
- ✅ Authorization bypass tests
- ✅ Data exposure tests
- ✅ Rate limiting security tests
- ✅ Header security tests
- ✅ Error information disclosure tests

### 6. Integration Tests (`tests/api/integration/`)
Tests API interactions with database and external services:

```typescript
// Example: Testing complete client workflow
test('Complete client management workflow', async () => {
  const mockClient = TestFixtures.getMockClients()[0];
  
  // 1. Create client
  const createResponse = await TestUtils.makeRequest(
    `${config.baseUrl}/api/venues`,
    {
      method: 'POST',
      body: JSON.stringify(mockClient)
    }
  );

  TestUtils.assertStatusCode(createResponse.status, 201);
  const clientId = createResponse.data.id;

  // 2. Retrieve client
  const getResponse = await TestUtils.makeRequest(
    `${config.baseUrl}/api/venues/${clientId}`
  );

  TestUtils.assertStatusCode(getResponse.status, 200);
  expect(getResponse.data.id).toBe(clientId);

  // 3. Update client
  // 4. Delete client
  // 5. Verify deletion
});
```

**Coverage:**
- ✅ Database integration tests
- ✅ External API integration tests
- ✅ End-to-end workflow tests
- ✅ Performance integration tests
- ✅ Error recovery tests

## 🛠️ Test Utilities

### TestUtils Class
Located in `tests/api/utils/testUtils.ts`:

```typescript
// Make API request with retry logic
const response = await TestUtils.makeRequest(url, options, retries);

// Generate test headers
const headers = TestUtils.getTestHeaders(accessToken);

// Validate response schema
const isValid = TestUtils.validateResponseSchema(response, schema);

// Assert response time
TestUtils.assertResponseTime(response.responseTime, 2000);

// Assert status code
TestUtils.assertStatusCode(response.status, 200);

// Assert required fields
TestUtils.assertRequiredFields(response.data, ['id', 'name']);
```

### TestFixtures Class
Located in `tests/api/fixtures/testFixtures.ts`:

```typescript
// Get mock users
const mockUsers = TestFixtures.getMockUsers();

// Get mock clients
const mockClients = TestFixtures.getMockClients();

// Get mock campaigns
const mockCampaigns = TestFixtures.getMockCampaigns();

// Get mock integrations
const mockIntegrations = TestFixtures.getMockIntegrations();

// Get mock API responses
const mockResponses = TestFixtures.getMockApiResponses();

// Get mock OAuth responses
const mockOAuth = TestFixtures.getMockOAuthResponses();
```

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/api/setup.ts'],
  testMatch: [
    '<rootDir>/tests/api/**/*.test.ts',
    '<rootDir>/tests/api/**/*.spec.ts'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage/api',
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true
};
```

### Environment Setup (`tests/api/setup.ts`)
```typescript
// Load environment variables
config({ path: '.env.test' });
config({ path: '.env.local' });
config({ path: '.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
```

## 🚀 Running Tests

### Local Development
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

# Run specific test
npm run test:api -- --testNamePattern="POST /api/venues"
```

### CI/CD Pipeline
```bash
# Run tests for CI/CD
npm run test:api:ci

# Run all tests (unit + API)
npm run test:all
```

## 📊 Test Coverage

### Coverage Goals
- **Overall Coverage**: > 80%
- **Critical Paths**: > 90%
- **Error Scenarios**: > 70%

### Coverage Reports
- **Text Report**: Console output
- **HTML Report**: `coverage/api/index.html`
- **LCOV Report**: `coverage/api/lcov.info`
- **JSON Report**: `coverage/api/coverage-final.json`

## 🔒 Security Testing

### Vulnerability Tests
- **SQL Injection**: Tests for SQL injection prevention
- **XSS**: Tests for Cross-Site Scripting prevention
- **CSRF**: Tests for Cross-Site Request Forgery prevention
- **Authentication Bypass**: Tests for authentication bypass attempts
- **Authorization Bypass**: Tests for authorization bypass attempts

### Security Headers
- **Content-Type-Options**: Prevents MIME type sniffing
- **Frame-Options**: Prevents clickjacking
- **XSS-Protection**: Enables XSS filtering
- **Strict-Transport-Security**: Enforces HTTPS

## ⚡ Performance Testing

### Response Time Thresholds
- **API Endpoints**: < 2 seconds
- **Database Operations**: < 1 second
- **External API Calls**: < 5 seconds

### Load Testing
- **Concurrent Requests**: 10-100 requests
- **Large Datasets**: 100-1000 records
- **Stress Testing**: 1000+ requests

## 🔄 CI/CD Integration

### GitHub Actions Workflow
Located in `.github/workflows/api-tests.yml`:

```yaml
name: API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run API tests
      run: npm run test:api:ci
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

### Test Reports
- **JUnit XML**: `test-results/api-test-results.xml`
- **Coverage Reports**: Uploaded as artifacts
- **Test Summary**: Generated in workflow

## 📝 Adding New Tests

### 1. Create Test File
```typescript
// tests/api/your-feature/yourFeature.test.ts
import { TestUtils } from '../utils/testUtils';
import { TestFixtures } from '../fixtures/testFixtures';

describe('Your Feature Tests', () => {
  const config = TestUtils.getTestConfig();

  test('Your test description', async () => {
    // Arrange
    const testData = TestFixtures.getMockData();
    
    // Act
    const response = await TestUtils.makeRequest(
      `${config.baseUrl}/your-endpoint`,
      {
        method: 'POST',
        body: JSON.stringify(testData)
      }
    );
    
    // Assert
    TestUtils.assertStatusCode(response.status, 200);
    expect(response.data).toHaveProperty('expectedField');
  });
});
```

### 2. Add Test Data
```typescript
// tests/api/fixtures/testFixtures.ts
export class TestFixtures {
  static getMockYourData(): YourDataType[] {
    return [
      {
        id: 'test-id',
        name: 'Test Name',
        // ... other fields
      }
    ];
  }
}
```

### 3. Add Test Utilities
```typescript
// tests/api/utils/testUtils.ts
export class TestUtils {
  static async yourCustomHelper(): Promise<any> {
    // Your custom test helper
  }
}
```

## 🐛 Troubleshooting

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
   ```

3. **Test Timeout Issues**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 30000
   ```

4. **Coverage Issues**
   ```bash
   # Check coverage configuration
   npm run test:api:coverage
   ```

### Debug Mode
```bash
# Run tests in debug mode
DEBUG=* npm run test:api

# Run specific test in debug mode
DEBUG=* npm run test:api -- --testNamePattern="specific test"
```

## 📚 Best Practices

### 1. Test Organization
- Group related tests in `describe` blocks
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

## 🎯 Continuous Improvement

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

## 📞 Support

For issues and questions:
1. Check the test documentation in `tests/api/README.md`
2. Review the test configuration files
3. Check the CI/CD workflow logs
4. Verify environment variables are set correctly

## 🏆 Success Metrics

- **Test Coverage**: > 80%
- **Test Execution Time**: < 5 minutes
- **Test Reliability**: > 95% pass rate
- **Security Coverage**: All major vulnerabilities tested
- **Performance**: All endpoints meet response time thresholds

---

**Note**: This testing framework is designed to be comprehensive, maintainable, and scalable. It follows industry best practices and provides excellent coverage for your Marketing Analytics Dashboard API.
