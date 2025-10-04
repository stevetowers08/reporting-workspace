# Test Configuration Guide

## Test Structure

The project now uses a well-organized test structure:

```
tests/
├── unit/           # Unit tests (Vitest)
│   └── __tests__/  # Component unit tests
├── integration/    # Integration tests (Vitest)
│   └── ghlIntegrationTest.ts
├── e2e/           # End-to-end tests (Playwright)
│   ├── ai-insights.spec.ts
│   ├── inputSanitization.spec.ts
│   ├── rateLimiting.spec.ts
│   ├── security.spec.ts
│   └── validation.spec.ts
├── manual/        # Manual test scripts
│   ├── test-*.js  # Standalone test scripts
│   └── test-*.html # Test HTML files
└── setup.ts       # Playwright global setup
```

## Running Tests

### Unit Tests (Vitest)
```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:coverage
```

### Integration Tests (Vitest)
```bash
# Run integration tests
npm run test:integration
```

### End-to-End Tests (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed
```

### All Tests
```bash
# Run all test types
npm run test:all
```

## Test Types

### Unit Tests
- **Location**: `tests/unit/`
- **Framework**: Vitest + React Testing Library
- **Purpose**: Test individual components and functions
- **Setup**: `src/test/setup.ts`

### Integration Tests
- **Location**: `tests/integration/`
- **Framework**: Vitest
- **Purpose**: Test service integrations and API calls
- **Setup**: `src/test/setup.ts`

### End-to-End Tests
- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Purpose**: Test complete user workflows
- **Setup**: `tests/setup.ts`

### Manual Tests
- **Location**: `tests/manual/`
- **Purpose**: Standalone test scripts for debugging
- **Usage**: Run manually for specific testing needs

## Configuration Files

### Vitest Configuration (`vitest.config.ts`)
- Unit and integration test configuration
- Excludes E2E and manual tests
- Uses jsdom environment
- Includes React plugin

### Playwright Configuration (`playwright.config.ts`)
- E2E test configuration
- Points to `tests/e2e` directory
- Includes global setup
- Configured for multiple browsers

### Test Setup Files
- **`src/test/setup.ts`**: Vitest setup (mocks, environment)
- **`tests/setup.ts`**: Playwright global setup

## Best Practices

### Writing Tests
1. **Unit Tests**: Test components in isolation
2. **Integration Tests**: Test service interactions
3. **E2E Tests**: Test user workflows
4. **Manual Tests**: Use for debugging specific issues

### Test Organization
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names**
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies**

### Running Tests
1. **Development**: Use `npm run test:watch` for unit tests
2. **CI/CD**: Use `npm run test:all` for complete test suite
3. **Debugging**: Use `npm run test:e2e:headed` for E2E debugging
4. **Coverage**: Use `npm run test:coverage` for coverage reports

## Troubleshooting

### Common Issues
1. **Test failures**: Check console output and error messages
2. **Setup issues**: Verify environment variables and mocks
3. **E2E failures**: Check browser setup and selectors
4. **Coverage issues**: Ensure all code paths are tested

### Debug Commands
```bash
# Debug unit tests
npm run test:ui

# Debug E2E tests
npm run test:e2e:headed

# Check test configuration
npm run test:run --reporter=verbose
```

## AI-Assisted Testing

### Using Cursor AI for Tests
- **Generate tests**: "Create unit tests for the MetricsCard component"
- **Fix tests**: "Fix this failing test" (paste error)
- **Debug tests**: "Debug this E2E test failure"
- **Optimize tests**: "Optimize this test for better performance"

### Common AI Prompts
- "Generate integration tests for the FacebookAdsService"
- "Create E2E tests for the dashboard workflow"
- "Fix this Playwright test selector issue"
- "Add accessibility tests for this component"
