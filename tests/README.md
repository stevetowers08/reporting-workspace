# Testing Guide for Marketing Analytics Dashboard

This guide covers the comprehensive testing setup for the Marketing Analytics Dashboard, including development testing tools and unit tests.

## Overview

The testing infrastructure includes:
- **Development Testing Tools**: Interactive API testing utilities
- **Unit Tests**: Comprehensive test coverage for critical services
- **Integration Tests**: End-to-end testing capabilities
- **Manual Testing**: Browser-based testing tools

## Quick Start

### Run All Tests
```bash
npm run test:run
```

### Run Tests in Watch Mode
```bash
npm test
```

### Run Tests with UI
```bash
npm run test:ui
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Development Testing Tools

### DevAPITester Class

The `DevAPITester` class provides comprehensive API testing utilities for development and debugging.

#### Location
```
tests/dev-helpers/api-tester.ts
```

#### Usage Examples

```typescript
import { DevAPITester } from './tests/dev-helpers/api-tester';

// Test all endpoints
const results = await DevAPITester.testAllEndpoints();

// Test specific service
const facebookResults = await DevAPITester.testService('facebook');

// Test rate limiting
const rateLimitResults = await DevAPITester.testRateLimiting('GoHighLevel', 10);

// Test error handling
const errorResults = await DevAPITester.testErrorHandling('GoHighLevel');

// Get test summary
const summary = DevAPITester.getResultsSummary();

// Export results
const exportData = DevAPITester.exportResults();
```

#### Available Test Methods

- `testAllEndpoints()`: Tests all API services
- `testService(serviceName)`: Tests specific service (facebook, google, ghl, database)
- `testRateLimiting(serviceName, requests)`: Tests API rate limiting
- `testErrorHandling(serviceName)`: Tests error handling scenarios
- `getResultsSummary()`: Returns test summary statistics
- `exportResults()`: Exports test results as JSON
- `clearResults()`: Clears test results

### Enhanced API Testing Page

The API Testing Page (`src/pages/APITestingPage.tsx`) has been enhanced with:

- **Test Summary Dashboard**: Visual summary with success rates and performance metrics
- **Service-Specific Testing**: Individual test buttons for each service
- **Advanced Testing**: Rate limiting and error handling tests
- **Export Functionality**: Download test results as JSON
- **Real-time Progress**: Live updates during test execution

#### Features

- Test summary with success rate visualization
- Individual service testing buttons
- Advanced testing options (rate limiting, error handling)
- Export test results functionality
- Real-time test progress updates
- Duration tracking for each test

## Unit Tests

### Test Structure

```
tests/
├── unit/
│   └── services/
│       ├── goHighLevelService.test.ts
│       ├── facebookAdsService.test.ts
│       └── googleAdsService.test.ts
├── dev-helpers/
│   └── api-tester.ts
└── setup.ts
```

### Service Tests

#### GoHighLevelService Tests
- **Location**: `tests/unit/services/goHighLevelService.test.ts`
- **Coverage**: Contact retrieval, account info, token validation, error handling
- **Key Tests**:
  - Successful API responses
  - Error handling (401, network errors)
  - Rate limiting enforcement
  - Token validation
  - Empty response handling

#### FacebookAdsService Tests
- **Location**: `tests/unit/services/facebookAdsService.test.ts`
- **Coverage**: Campaigns, metrics, demographics, platform breakdown
- **Key Tests**:
  - Campaign retrieval and metrics
  - Ad account management
  - Demographics data
  - Platform breakdown
  - Token management and refresh
  - Error handling scenarios

#### GoogleAdsService Tests
- **Location**: `tests/unit/services/googleAdsService.test.ts`
- **Coverage**: Ad accounts, campaigns, keywords, ad groups
- **Key Tests**:
  - Account and campaign metrics
  - Keyword and ad group management
  - Currency conversion (micros to dollars)
  - Token management
  - Quota and rate limiting errors

### Test Configuration

#### Vitest Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['tests/unit/**/*.{test,spec}.{js,ts,tsx}', 'src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**', '**/tests/manual/**', '**/tests/integration/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### Test Setup
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    DEV: true
  },
  writable: true
})

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}))

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  QueryClient: vi.fn(),
  QueryClientProvider: vi.fn(),
}))
```

## Testing Best Practices

### Writing Unit Tests

1. **Mock External Dependencies**: Always mock API calls, database operations, and external services
2. **Test Error Scenarios**: Include tests for network errors, API errors, and edge cases
3. **Test Data Conversion**: Verify proper handling of currency conversions and data transformations
4. **Test Rate Limiting**: Ensure rate limiting logic works correctly
5. **Test Token Management**: Verify token refresh and error handling

### Example Test Structure

```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset static state
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should handle successful responses', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const result = await Service.method();
      expect(result).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      // Mock error response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(Service.method()).rejects.toThrow();
    });
  });
});
```

### Development Testing

1. **Use DevAPITester**: Leverage the development testing tools for quick API validation
2. **Test Real APIs**: Use the enhanced API Testing Page for integration testing
3. **Monitor Performance**: Track test durations and identify performance issues
4. **Export Results**: Save test results for debugging and documentation

## Running Tests

### Available Scripts

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npx vitest tests/unit/services/goHighLevelService.test.ts

# Run tests matching pattern
npx vitest --grep "FacebookAdsService"
```

### Test Runner Script

A custom test runner script is available at `scripts/test-runner.mjs`:

```bash
node scripts/test-runner.mjs
```

This script runs both unit tests and development API tests, providing a comprehensive test report.

## Debugging Tests

### Common Issues

1. **Mock Not Working**: Ensure mocks are set up before the service is imported
2. **Async Issues**: Use `await` for async operations and `vi.waitFor()` for DOM updates
3. **Token Issues**: Mock token management properly in tests
4. **Network Errors**: Test both success and error scenarios

### Debugging Tips

1. **Use `console.log`**: Add logging in tests to debug issues
2. **Check Mock Calls**: Use `vi.mocked()` to verify mock calls
3. **Test Isolation**: Ensure tests don't interfere with each other
4. **Error Messages**: Check error messages for debugging clues

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
```

## Performance Testing

### Rate Limiting Tests

The development testing tools include rate limiting tests to ensure APIs handle high request volumes correctly:

```typescript
// Test rate limiting with 10 requests
const results = await DevAPITester.testRateLimiting('GoHighLevel', 10);
```

### Performance Monitoring

- Test duration tracking
- Success rate monitoring
- Error rate analysis
- Performance regression detection

## Conclusion

This comprehensive testing setup provides:

- **Development Tools**: Interactive API testing for debugging
- **Unit Tests**: Comprehensive coverage of critical services
- **Integration Tests**: End-to-end testing capabilities
- **Performance Testing**: Rate limiting and performance monitoring
- **CI/CD Integration**: Automated testing in deployment pipelines

The testing infrastructure ensures the reliability and performance of the Marketing Analytics Dashboard across all integrated services.