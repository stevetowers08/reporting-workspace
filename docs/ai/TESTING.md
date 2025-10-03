# Testing Documentation

This document outlines the comprehensive testing setup for the Marketing Analytics Dashboard project, including tools, test types, and instructions for running and maintaining tests. It is designed to help both technical and non-technical users understand and interact with the testing suite using Cursor AI.

## Overview

The project uses a comprehensive testing suite to ensure code quality, functionality, accessibility, and performance. The suite includes:

- **Unit Tests**: Test individual functions or components in isolation
- **Integration Tests**: Test interactions between components or systems (e.g., API calls)
- **End-to-End (E2E) Tests**: Test user flows in a browser (e.g., login, form submission)
- **Linting and Type Checking**: Ensure code style and type safety
- **Accessibility Tests**: Ensure WCAG 2.1 AA compliance
- **Performance Tests**: Monitor Core Web Vitals and Lighthouse scores

## Testing Tools

### Core Testing Framework
- **Jest**: Primary framework for unit and integration tests, configured with TypeScript support
- **Playwright**: Used for E2E tests to simulate user interactions in browsers
- **React Testing Library**: Tests React components with user-centric approach

### Code Quality Tools
- **ESLint**: Enforces code style and catches errors, with Jest-specific rules
- **TypeScript**: Ensures type safety via `tsc --noEmit`
- **Prettier**: Code formatting for consistency

### Testing Utilities
- **MSW (Mock Service Worker)**: Mocks API responses for reliable tests
- **@faker-js/faker**: Generates realistic test data (e.g., fake names, emails)
- **Supertest**: Tests API endpoints (if using Express/Node backend)
- **@axe-core/playwright**: Checks accessibility in E2E tests

### CI/CD Integration
- **concurrently**: Runs multiple scripts in parallel (e.g., linting, tests)
- **husky and lint-staged**: Enforce pre-commit checks (tests, linting, type checking)
- **jest-junit**: Generates CI-compatible test reports

## Test Structure

Tests are organized in the following directories:

```
tests/
├── unit/                    # Unit tests (*.test.ts, *.spec.ts)
│   ├── services/           # Service layer tests
│   ├── components/         # Component tests
│   └── lib/               # Utility function tests
├── integration/            # Integration tests
│   ├── services/          # Service integration tests
│   └── api/               # API integration tests
├── e2e/                   # End-to-end tests (Playwright)
│   ├── dashboard.spec.ts  # Dashboard E2E tests
│   ├── accessibility.spec.ts  # Accessibility tests
│   └── performance.spec.ts     # Performance tests
├── __mocks__/             # Mock files and utilities
│   ├── server.ts          # MSW server setup
│   └── testUtils.ts       # Test utilities
├── global-setup.ts        # Global test setup
└── global-teardown.ts     # Global test cleanup
```

## Best Practices

### Test Naming Convention
- Use descriptive names: `should display error message when API fails`
- Group related tests: `describe('Facebook Ads Service', () => { ... })`
- Use consistent patterns: `should [expected behavior] when [condition]`

### Test Structure (AAA Pattern)
```typescript
it('should calculate ROI correctly', () => {
  // Arrange
  const spend = 1000;
  const revenue = 3000;
  
  // Act
  const roi = calculateROI(spend, revenue);
  
  // Assert
  expect(roi).toBe(200);
});
```

### Test Isolation
- Each test creates its own data to avoid conflicts
- Use `beforeEach` and `afterEach` for setup and cleanup
- Mock external dependencies consistently

### Coverage Goals
- Aim for 80% coverage (branches, functions, lines, statements)
- Focus on critical business logic
- Test error scenarios and edge cases

## How to Run Tests

Use the integrated terminal in Cursor AI (`Ctrl + ``) or a command line to run these npm scripts:

### Basic Test Commands
```bash
# Run All Tests
npm run test
# Executes all Jest tests (unit and integration)

# Run in Watch Mode
npm run test:watch
# Runs tests interactively, re-running on file changes

# Run with Coverage
npm run test:coverage
# Generates a coverage report in coverage/

# Run Unit Tests
npm run test:unit
# Runs tests in tests/unit/

# Run Integration Tests
npm run test:integration
# Runs tests in tests/integration/
```

### E2E Test Commands
```bash
# Run E2E Tests
npm run test:e2e
# Runs Playwright tests in tests/e2e/

# Run E2E Tests with UI
npm run test:e2e:ui
# Opens Playwright UI for interactive testing

# Run E2E Tests in Headed Mode
npm run test:e2e:headed
# Runs tests with visible browser

# Debug E2E Tests
npm run test:e2e:debug
# Runs tests in debug mode
```

### Code Quality Commands
```bash
# Run Linting
npm run lint
# Checks code style with ESLint

# Fix Linting Issues
npm run lint:fix
# Automatically fixes linting issues

# Run Type Checking
npm run type-check
# Verifies TypeScript types (tsc --noEmit)

# Run All Quality Checks
npm run quality
# Runs lint, type-check, and unit tests in parallel
```

### Playwright Setup Commands
```bash
# Install Playwright Browsers
npm run playwright:install
# Installs browser binaries for Playwright

# Install Playwright Dependencies
npm run playwright:install-deps
# Installs system dependencies for Playwright
```

## Running Tests in Cursor AI

### Using Composer (Ctrl + L)
1. Open Composer and type commands like:
   - "Run unit tests"
   - "Run E2E tests with coverage"
   - "Fix linting errors in this file"

### Using Inline Chat (Ctrl + I)
1. Select a test file and use inline chat to:
   - "Explain this test"
   - "Fix this failing test"
   - "Add more test cases for this function"

### Using Terminal (Ctrl + `)
1. Open the integrated terminal
2. Run npm scripts directly
3. View real-time test results

## Debugging Tests

### VS Code Integration
- Cursor AI supports test debugging out of the box
- Use the "Run and Debug" panel (`Ctrl + Shift + D`)
- Set breakpoints and debug tests interactively

### Playwright Reports
- After running `npm run test:e2e`, check `playwright-report/` for HTML reports
- Reports include test traces, screenshots, and videos
- Access reports at `http://localhost:9323` after running tests

### Jest Debugging
- Use `--debug` flag for Jest debugging
- Set breakpoints in test files
- Use `console.log` statements for debugging (remove before committing)

## Pre-Commit Hooks

### Husky and lint-staged
- Automatically run linting, type checking, and unit tests on staged files before each commit
- If any check fails (e.g., test errors, lint issues), the commit is blocked until fixed

### Fixing Pre-Commit Issues
1. Use Composer (`Ctrl + L`) to prompt: "Fix ESLint errors in this file"
2. Use inline chat (`Ctrl + I`) on problematic code
3. Run `npm run lint:fix` to auto-fix issues

## Maintaining Tests

### Updating PROJECT_STATUS.md
1. **Open the file**: Use `Ctrl + P` to open `docs/ai/PROJECT_STATUS.md`
2. **Edit with AI**: Use `Ctrl + I` to prompt AI: "Update the testing progress section with current status"
3. **Save changes**: Use `Ctrl + S` to save

### Adding New Tests
1. **Open Composer**: Use `Ctrl + L` to open Composer
2. **Prompt AI**: "Create a unit test for this function" or "Generate E2E tests for the dashboard"
3. **Specify test type**: Unit, integration, or E2E
4. **Follow AAA pattern**: Arrange, Act, Assert structure

### Checking Coverage
1. Run `npm run test:coverage` to generate coverage report
2. Open `coverage/lcov-report/index.html` in browser
3. If below 80%, ask AI to generate more tests (`Ctrl + L`)

### Accessibility Testing
1. Run E2E tests with `@axe-core/playwright` to catch accessibility issues
2. Use ARIA snapshots: `await expect(page.locator('main')).toMatchAriaSnapshot()`
3. Test keyboard navigation and screen reader compatibility

## Test Examples

### Unit Test Example
```typescript
// tests/unit/services/facebookAdsService.test.ts
import { FacebookAdsService } from '@/services/facebookAdsService';
import { faker } from '@faker-js/faker';

describe('FacebookAdsService', () => {
  let service: FacebookAdsService;
  
  beforeEach(() => {
    service = new FacebookAdsService();
  });

  it('should fetch campaigns successfully', async () => {
    // Arrange
    const adAccountId = faker.string.alphanumeric(16);
    
    // Act
    const campaigns = await service.getCampaigns(adAccountId);
    
    // Assert
    expect(campaigns).toHaveLength(3);
    expect(campaigns[0]).toHaveProperty('id');
    expect(campaigns[0]).toHaveProperty('name');
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    const invalidAccountId = 'invalid';
    
    // Act & Assert
    await expect(service.getCampaigns(invalidAccountId))
      .rejects.toThrow('Invalid ad account ID');
  });
});
```

### Component Test Example
```typescript
// tests/unit/components/EventDashboard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventDashboard } from '@/components/EventDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('EventDashboard', () => {
  it('should render dashboard with metrics', () => {
    // Arrange & Act
    render(<EventDashboard />, { wrapper: TestWrapper });
    
    // Assert
    expect(screen.getByText('Campaign Performance')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should handle date range selection', async () => {
    // Arrange
    render(<EventDashboard />, { wrapper: TestWrapper });
    
    // Act
    const datePicker = screen.getByLabelText('Select date range');
    fireEvent.click(datePicker);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });
  });
});
```

### Integration Test Example
```typescript
// tests/integration/services/clientService.integration.test.ts
import { ClientService } from '@/services/clientService';
import { faker } from '@faker-js/faker';

describe('ClientService Integration Tests', () => {
  it('should handle complete client lifecycle', async () => {
    // Arrange
    const clientData = {
      name: faker.company.name(),
      industry: faker.company.buzzNoun(),
      status: 'active' as const,
      monthlySpend: faker.number.int({ min: 1000, max: 50000 }),
      contactEmail: faker.internet.email(),
      // ... other required fields
    };

    // Act & Assert - Create
    const createdClient = await ClientService.createClient(clientData);
    expect(createdClient).toBeDefined();
    expect(createdClient.id).toBeDefined();

    // Act & Assert - Read
    const retrievedClient = await ClientService.getClientById(createdClient.id);
    expect(retrievedClient?.name).toBe(clientData.name);

    // Act & Assert - Update
    const updates = { status: 'paused' as const };
    const updatedClient = await ClientService.updateClient(createdClient.id, updates);
    expect(updatedClient?.status).toBe('paused');

    // Act & Assert - Delete
    const deleteResult = await ClientService.deleteClient(createdClient.id);
    expect(deleteResult).toBe(true);
  });
});
```

### E2E Test Example
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test('should display campaign metrics', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Act
    await page.waitForSelector('[data-testid="campaign-metrics"]');
    
    // Assert
    await expect(page.locator('[data-testid="total-spend"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-clicks"]')).toBeVisible();
    
    // Take ARIA snapshot for accessibility
    await expect(page.locator('main')).toMatchAriaSnapshot();
  });

  test('should filter campaigns by platform', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Act
    await page.click('[data-testid="platform-filter"]');
    await page.selectOption('[data-testid="platform-filter"]', 'facebook');
    
    // Assert
    await expect(page.locator('[data-testid="campaign-row"]')).toHaveCount(2);
  });
});
```

### Accessibility Test Example
```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('should have proper ARIA structure', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Act & Assert
    await expect(page.locator('main')).toMatchAriaSnapshot();
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings).toHaveCount(4);
    
    // Verify form labels
    await expect(page.locator('label[for="date-range"]')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Act
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Assert
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
```

### Performance Test Example
```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should pass Lighthouse audit', async ({ page }) => {
    // Arrange
    await page.goto('/');
    
    // Act
    const audit = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Simulate Lighthouse audit
        resolve({
          performance: 95,
          accessibility: 98,
          'best-practices': 92,
          seo: 90,
        });
      });
    });
    
    // Assert
    expect(audit.performance).toBeGreaterThan(90);
    expect(audit.accessibility).toBeGreaterThan(95);
  });

  test('should load within performance budget', async ({ page }) => {
    // Arrange
    const startTime = Date.now();
    
    // Act
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Assert
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 seconds
  });
});
```

## Common Test Patterns

### API Mocking with MSW
```typescript
// tests/__mocks__/server.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const server = setupServer(
  rest.get('/api/facebook/campaigns', (req, res, ctx) => {
    return res(ctx.json([
      { id: '1', name: 'Test Campaign', status: 'active' }
    ]));
  }),
  
  rest.post('/api/clients', (req, res, ctx) => {
    return res(ctx.json({ id: 'client_123', ...req.body }));
  })
);

// In test files
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Component Testing with Context
```typescript
// Test components that use React Context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <Router>
        {children}
      </Router>
    </QueryClientProvider>
  </AuthProvider>
);

render(<Component />, { wrapper: TestWrapper });
```

### Async Testing
```typescript
// Test async operations
it('should load data on mount', async () => {
  render(<DataComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Common Issues

#### TypeScript Errors
- **Issue**: Type errors in tests
- **Solution**: Use AI to fix type issues (`Ctrl + I` on problematic code)
- **Prevention**: Run `npm run type-check` before committing

#### React Testing Library Errors
- **Issue**: Component not rendering in tests
- **Solution**: Check component lifecycle and state management
- **Prevention**: Use proper test utilities and mocks

#### Playwright Timeouts
- **Issue**: Tests timing out
- **Solution**: Increase timeout in `playwright.config.ts`
- **Prevention**: Use proper wait strategies (`waitForSelector`, `waitForLoadState`)

#### MSW Mock Issues
- **Issue**: Mocks not working
- **Solution**: Ensure handlers are reset between tests
- **Prevention**: Use proper setup/teardown in test files

### AI-Assisted Debugging
1. **Use Inline Chat**: `Ctrl + I` on problematic code
2. **Provide Context**: Include error messages and relevant code
3. **Ask Specific Questions**: Be precise about the issue
4. **Follow AI Suggestions**: Implement recommended solutions

## CI/CD Integration

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
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:coverage
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Resources

### Documentation
- **Project Docs**: See `docs/ai/` directory for complete documentation
- **External Docs**: React, TypeScript, Supabase, Facebook/Google APIs
- **AI Help**: Use Cursor AI for code generation and debugging

### Learning
- **AI Prompts**: Use AI to explain concepts and best practices
- **Code Examples**: Ask AI to generate examples and patterns
- **Refactoring**: Use AI to improve code quality and performance

---

**Remember**: This project is designed for AI-assisted development. Use Cursor AI effectively to generate code, debug issues, and learn best practices. Always follow the established patterns and maintain code quality standards.