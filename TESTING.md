# Testing Suite Documentation

This project includes a comprehensive testing suite with Jest for unit/integration tests and Playwright for end-to-end testing.

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### Quality Checks

```bash
# Run all quality checks (lint, type-check, unit tests)
npm run quality

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run type checking
npm run type-check
```

## 📁 Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── services/           # Service layer tests
│   └── lib/                # Utility function tests
├── integration/            # Integration tests
│   └── services/           # Service integration tests
├── e2e/                    # End-to-end tests
│   └── dashboard.spec.ts   # E2E test examples
├── __mocks__/              # Mock files and utilities
│   ├── server.ts          # MSW server setup
│   └── testUtils.ts       # Test utility functions
├── global-setup.ts        # Playwright global setup
└── global-teardown.ts     # Playwright global teardown
```

## 🧪 Test Types

### Unit Tests
- **Location**: `tests/unit/`
- **Purpose**: Test individual functions and components in isolation
- **Pattern**: `*.test.ts` or `*.spec.ts`
- **Example**: `tests/unit/services/clientService.test.ts`

### Integration Tests
- **Location**: `tests/integration/`
- **Purpose**: Test interactions between multiple components/services
- **Pattern**: `*.integration.test.ts`
- **Example**: `tests/integration/services/clientService.integration.test.ts`

### End-to-End Tests
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user workflows
- **Pattern**: `*.spec.ts`
- **Example**: `tests/e2e/dashboard.spec.ts`

## 📋 Test Patterns

### AAA Pattern (Arrange, Act, Assert)

```typescript
describe('ClientService', () => {
  it('When creating a new client, then should return client with generated ID', async () => {
    // Arrange
    const clientData = TestUtils.createMockClientData();
    
    // Act
    const newClient = await ClientService.createClient(clientData);
    
    // Assert
    expect(newClient).toBeDefined();
    expect(newClient.id).toBeDefined();
    expect(newClient.id).toMatch(/^client_\d+$/);
  });
});
```

### Test Naming Convention

Use descriptive test names that follow the pattern: **"When [scenario], then [expected result]"**

```typescript
it('When getting client by valid ID, then should return the client', async () => {
  // test implementation
});

it('When getting client by invalid ID, then should return null', async () => {
  // test implementation
});
```

### Nested Describe Blocks

```typescript
describe('ClientService', () => {
  describe('getAllClients', () => {
    it('When getting all clients, then should return an array', async () => {
      // test implementation
    });
  });

  describe('createClient', () => {
    it('When creating a new client, then should return client with ID', async () => {
      // test implementation
    });
  });
});
```

## 🛠️ Configuration

### Jest Configuration (`jest.config.js`)

- **Coverage Threshold**: 80% for branches, functions, lines, and statements
- **Test Environment**: jsdom for React testing
- **Path Mapping**: Supports `@/` alias
- **Global Cleanup**: Enabled for test isolation

### Playwright Configuration (`playwright.config.ts`)

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:8080`
- **Retries**: 2 on CI, 0 locally
- **Reporters**: HTML, JSON, JUnit

### ESLint Configuration (`.eslintrc.js`)

- **Jest Plugin**: Enabled with recommended rules
- **React Plugin**: Configured for React testing
- **TypeScript**: Strict mode enabled
- **Test-specific Rules**: Relaxed for test files

## 🔧 Debugging Tests

### VS Code Debugging

1. **Jest Tests**: Use the "Debug Jest Tests" configuration
2. **Playwright Tests**: Use the "Debug Playwright Tests" configuration
3. **Current Test**: Use the "Debug Current Jest Test" or "Debug Current Playwright Test" configurations

### Debug Commands

```bash
# Debug Jest tests
npm run test -- --runInBand --no-cache

# Debug Playwright tests
npm run test:e2e:debug
```

## 📊 Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Report**: `coverage/lcov.info`
- **JSON Report**: `coverage/coverage-final.json`

## 🎭 Mocking

### MSW (Mock Service Worker)

API mocking is handled by MSW for both Jest and Playwright tests:

```typescript
// tests/__mocks__/server.ts
export const handlers = [
  http.get('https://api.example.com/data', () => {
    return HttpResponse.json({ data: 'mock data' });
  }),
];
```

### Test Utilities

Use `TestUtils` for creating mock data:

```typescript
import { TestUtils } from '@/tests/__mocks__/testUtils';

const mockClient = TestUtils.createMockClient();
const mockClientData = TestUtils.createMockClientData();
```

## 🚦 Pre-commit Hooks

Pre-commit hooks are configured with Husky and lint-staged:

- **Linting**: ESLint with auto-fix
- **Formatting**: Prettier
- **Type Checking**: TypeScript compiler
- **Unit Tests**: Jest unit tests

## 📈 Coverage Thresholds

Current coverage thresholds (80%):

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

To update thresholds, modify `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
},
```

## 🔄 Test Data Isolation

Each test creates its own data to ensure isolation:

```typescript
beforeEach(() => {
  // Create fresh test data for each test
  mockClientData = TestUtils.createMockClientData();
});
```

## 📝 Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **AAA Pattern**: Follow Arrange, Act, Assert structure
4. **Mock External Dependencies**: Use MSW for API calls
5. **Test Data**: Use `TestUtils` for consistent mock data
6. **Coverage**: Maintain 80%+ coverage
7. **Error Scenarios**: Test both success and error cases
8. **Edge Cases**: Test boundary conditions and edge cases

## 🐛 Troubleshooting

### Common Issues

1. **Tests failing due to imports**: Check path mapping in `jest.config.js`
2. **Coverage not working**: Ensure `collectCoverageFrom` includes correct patterns
3. **E2E tests failing**: Check if dev server is running on port 8080
4. **Mock not working**: Verify MSW handlers are properly configured

### Debug Tips

1. Use `console.log` in tests for debugging (allowed in test files)
2. Use VS Code debugger for step-through debugging
3. Check browser console for E2E test issues
4. Use `--verbose` flag for detailed Jest output

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [MSW Documentation](https://mswjs.io/docs/)
- [ESLint Jest Plugin](https://github.com/jest-community/eslint-plugin-jest)
