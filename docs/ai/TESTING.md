# Testing Guide

## Overview

This project uses comprehensive testing strategies including unit tests, integration tests, and end-to-end tests to ensure reliability and maintainability. The testing setup is optimized for both developers and non-coders using Cursor AI.

## Testing Stack

### Core Testing Tools
- **Jest**: Unit testing framework
- **Playwright**: End-to-end testing and browser automation
- **MSW (Mock Service Worker)**: API mocking for tests
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers

### Additional Testing Tools
- **playwright-lighthouse**: Performance testing with Lighthouse audits
- **ARIA snapshots**: Accessibility testing with `expect(locator).toMatchAriaSnapshot()`
- **MSW**: API mocking for integration tests

## Test Types

### 1. Unit Tests
Test individual components and functions in isolation.

**Location**: `src/**/*.test.ts` and `src/**/*.test.tsx`

**Example**:
```typescript
// src/components/__tests__/MetricsCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MetricsCard } from '../MetricsCard';

describe('MetricsCard', () => {
  it('displays metric value correctly', () => {
    render(
      <MetricsCard 
        title="Total Leads" 
        value="150" 
        change={{ value: 12, type: 'increase' }}
      />
    );
    
    expect(screen.getByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests
Test how different parts of the application work together.

**Location**: `tests/integration/`

**Example**:
```typescript
// tests/integration/api-integration.test.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { FacebookAdsService } from '../../src/services/facebookAdsService';

const server = setupServer(
  rest.get('https://graph.facebook.com/v18.0/me/adaccounts', (req, res, ctx) => {
    return res(ctx.json({
      data: [{ id: '123', name: 'Test Account' }]
    }));
  })
);

describe('Facebook Ads Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fetches ad accounts successfully', async () => {
    const service = new FacebookAdsService();
    const accounts = await service.getAdAccounts();
    
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe('Test Account');
  });
});
```

### 3. End-to-End Tests
Test complete user workflows using Playwright.

**Location**: `tests/e2e/`

**Example**:
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('displays campaign metrics', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="metrics-card"]');
    
    // Check metrics are displayed
    await expect(page.locator('[data-testid="total-leads"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-spend"]')).toBeVisible();
  });

  test('navigates between tabs', async ({ page }) => {
    await page.goto('/');
    
    // Click on Facebook Ads tab
    await page.click('[data-testid="facebook-tab"]');
    
    // Verify Facebook Ads content is displayed
    await expect(page.locator('[data-testid="facebook-metrics"]')).toBeVisible();
  });
});
```

### 4. Accessibility Tests
Test accessibility compliance using ARIA snapshots.

**Example**:
```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('dashboard has proper ARIA structure', async ({ page }) => {
    await page.goto('/');
    
    // Take ARIA snapshot
    await expect(page.locator('main')).toMatchAriaSnapshot('dashboard-aria');
  });

  test('forms are accessible', async ({ page }) => {
    await page.goto('/admin/integrations');
    
    // Check form accessibility
    await expect(page.locator('form')).toMatchAriaSnapshot('integration-form-aria');
  });
});
```

### 5. Performance Tests
Test application performance using Lighthouse audits.

**Example**:
```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Performance', () => {
  test('dashboard meets performance standards', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Run Lighthouse audit
    await playAudit({
      page,
      thresholds: {
        performance: 90,
        accessibility: 90,
        'best-practices': 90,
        seo: 90
      }
    });
  });
});
```

## Running Tests

### For Non-Coders Using Cursor AI

#### Using Composer (Ctrl + L)
- **"Run all tests"** - Execute the complete test suite
- **"Generate tests for the MetricsCard component"** - Create new tests
- **"Fix failing tests"** - Debug and fix test issues
- **"Add accessibility tests for the dashboard"** - Create accessibility tests

#### Using Inline Chat (Ctrl + I)
- **"Explain what this test does"** - Get test explanations
- **"Fix this test error"** - Debug specific test failures
- **"Optimize this test for better performance"** - Improve test efficiency

### Command Line Testing

#### Run All Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

#### Run E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run specific E2E test file
npm run test:e2e tests/e2e/dashboard.spec.ts
```

#### Run Performance Tests
```bash
# Run Lighthouse audits
npm run test:lighthouse

# Run performance tests
npm run test:performance
```

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Mocking Strategies

### API Mocking with MSW
```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('https://graph.facebook.com/v18.0/me/adaccounts', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          {
            id: '123456789',
            name: 'Test Ad Account',
            account_status: 'ACTIVE',
            currency: 'USD'
          }
        ]
      })
    );
  }),

  rest.get('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', (req, res, ctx) => {
    return res(
      ctx.json({
        resourceNames: ['customers/1234567890']
      })
    );
  })
];
```

### Component Mocking
```typescript
// Mock external components
jest.mock('@/components/ui/Chart', () => ({
  Chart: ({ data }: { data: any }) => <div data-testid="mock-chart">{JSON.stringify(data)}</div>
}));

// Mock services
jest.mock('@/services/facebookAdsService', () => ({
  FacebookAdsService: jest.fn().mockImplementation(() => ({
    getAdAccounts: jest.fn().mockResolvedValue([
      { id: '123', name: 'Test Account', platform: 'facebook' }
    ])
  }))
}));
```

## Test Data Management

### Test Fixtures
```typescript
// tests/fixtures/campaignData.ts
export const mockCampaignData = {
  facebook: {
    leads: 150,
    spend: 500,
    impressions: 10000,
    clicks: 300
  },
  google: {
    leads: 120,
    spend: 400,
    impressions: 8000,
    clicks: 250
  }
};

export const mockClientData = {
  id: 'client-1',
  name: 'Test Client',
  integrations: {
    facebook: { connected: true },
    google: { connected: true }
  }
};
```

### Database Seeding for Tests
```typescript
// tests/setup/testDatabase.ts
import { createClient } from '@supabase/supabase-js';

export const seedTestDatabase = async () => {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_ANON_KEY!
  );

  // Clear existing test data
  await supabase.from('clients').delete().neq('id', '');
  
  // Insert test data
  await supabase.from('clients').insert(mockClientData);
};
```

## Debugging Tests

### Using Cursor AI for Test Debugging

#### Common Debugging Prompts
- **"Fix this test failure"** - Paste the error message
- **"Explain why this test is failing"** - Get analysis of test issues
- **"Optimize this slow test"** - Improve test performance
- **"Add proper assertions to this test"** - Enhance test coverage

#### Debugging Workflow
1. **Identify the Issue**: Use Cursor AI to analyze error messages
2. **Check Test Setup**: Verify mocks and test data
3. **Fix the Code**: Use AI suggestions to resolve issues
4. **Verify the Fix**: Run tests to confirm resolution

### Manual Debugging Techniques

#### Debug Playwright Tests
```typescript
// Add debugging to E2E tests
test('debug dashboard', async ({ page }) => {
  await page.goto('/');
  
  // Pause execution for debugging
  await page.pause();
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'debug-dashboard.png' });
  
  // Log page content
  const content = await page.textContent('body');
  console.log('Page content:', content);
});
```

#### Debug Unit Tests
```typescript
// Add debugging to unit tests
test('debug component rendering', () => {
  const { debug } = render(<MetricsCard title="Test" value="100" />);
  
  // Print component HTML
  debug();
  
  // Check specific elements
  const element = screen.getByText('Test');
  console.log('Element:', element);
});
```

## Test Coverage

### Coverage Goals
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Configuration
```javascript
// jest.config.js
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/main.tsx',
  '!src/setupTests.ts'
],
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:coverage
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## Best Practices

### Writing Effective Tests
1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it
2. **Use Descriptive Test Names**: Make test names clear and specific
3. **Follow AAA Pattern**: Arrange, Act, Assert
4. **Keep Tests Independent**: Each test should be able to run in isolation
5. **Mock External Dependencies**: Use mocks for API calls and external services

### Test Organization
1. **Group Related Tests**: Use `describe` blocks to organize tests
2. **Use Setup and Teardown**: Clean up after tests
3. **Share Test Utilities**: Create reusable test helpers
4. **Keep Tests Simple**: One assertion per test when possible

### Performance Considerations
1. **Use Parallel Execution**: Run tests in parallel when possible
2. **Mock Heavy Operations**: Mock API calls and database operations
3. **Use Test Data Builders**: Create test data efficiently
4. **Clean Up Resources**: Properly dispose of test resources

## Troubleshooting Common Issues

### Test Failures
1. **Check Console Output**: Look for error messages
2. **Verify Test Data**: Ensure mocks and fixtures are correct
3. **Check Dependencies**: Verify all required dependencies are installed
4. **Use Cursor AI**: Ask AI to analyze test failures

### Performance Issues
1. **Optimize Test Data**: Use smaller, focused test datasets
2. **Mock External Calls**: Avoid real API calls in tests
3. **Use Test Databases**: Use separate test databases
4. **Profile Tests**: Identify slow tests and optimize them

### Flaky Tests
1. **Add Proper Waits**: Use appropriate wait strategies
2. **Stabilize Test Data**: Use consistent test data
3. **Handle Async Operations**: Properly handle promises and async code
4. **Use Retries**: Implement retry logic for unstable tests

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)

### AI-Assisted Testing
- Use **Ctrl + L** for complex test generation
- Use **Ctrl + I** for test debugging and optimization
- Ask AI to explain test concepts and best practices
- Use AI to generate test data and fixtures

---

For development setup, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).  
For troubleshooting, see [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md).  
For integration details, see [INTEGRATIONS_GUIDE.md](./INTEGRATIONS_GUIDE.md).
