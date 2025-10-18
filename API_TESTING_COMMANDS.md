# API Testing Commands Reference

## 🚀 Quick Commands

### Run All Tests
```bash
# Run all API tests
npm run test:api

# Run all tests (unit + API)
npm run test:all
```

### Run Specific Test Suites
```bash
# Functional tests
npm run test:api -- --testPathPattern=functional

# Validation tests
npm run test:api -- --testPathPattern=validation

# Error handling tests
npm run test:api -- --testPathPattern=error-handling

# Authentication tests
npm run test:api -- --testPathPattern=authentication

# Security tests
npm run test:api -- --testPathPattern=security

# Integration tests
npm run test:api -- --testPathPattern=integration
```

### Run Specific Tests
```bash
# Test specific endpoint
npm run test:api -- --testNamePattern="POST /api/venues"

# Test specific functionality
npm run test:api -- --testNamePattern="SQL injection"

# Test specific error scenario
npm run test:api -- --testNamePattern="401 Unauthorized"
```

## 📊 Coverage Commands

```bash
# Run tests with coverage
npm run test:api:coverage

# Check coverage thresholds
npm run coverage:check

# Generate coverage report
npm run coverage:report
```

## 🔍 Debug Commands

```bash
# Run tests in debug mode
DEBUG=* npm run test:api

# Run specific test in debug mode
DEBUG=* npm run test:api -- --testNamePattern="specific test"

# Run tests with verbose output
npm run test:api -- --verbose

# Run tests with detailed output
npm run test:api -- --detectOpenHandles
```

## ⚡ Performance Commands

```bash
# Run performance tests
npm run test:api -- --testPathPattern=integration

# Run load tests
npm run test:api -- --testNamePattern="concurrent"

# Run stress tests
npm run test:api -- --testNamePattern="stress"
```

## 🔒 Security Commands

```bash
# Run security tests
npm run test:api -- --testPathPattern=security

# Run vulnerability tests
npm run test:api -- --testNamePattern="injection"

# Run authentication tests
npm run test:api -- --testNamePattern="authentication"
```

## 🛠️ Development Commands

```bash
# Run tests in watch mode
npm run test:api:watch

# Run tests for CI/CD
npm run test:api:ci

# Run tests with specific environment
NODE_ENV=test npm run test:api

# Run tests with custom timeout
TEST_TIMEOUT=30000 npm run test:api
```

## 📝 Test Data Commands

```bash
# Generate test data
npm run test:data:generate

# Clean test data
npm run test:data:clean

# Seed test database
npm run test:db:seed

# Reset test database
npm run test:db:reset
```

## 🔧 Configuration Commands

```bash
# Validate environment
npm run env:validate

# Check environment variables
npm run env:check

# Test database connection
npm run db:test:connection

# Verify database setup
npm run db:test:verify
```

## 📊 Reporting Commands

```bash
# Generate test report
npm run test:report

# Generate coverage report
npm run coverage:report

# Generate performance report
npm run performance:report

# Generate security report
npm run security:report
```

## 🚀 CI/CD Commands

```bash
# Run tests for CI/CD
npm run test:api:ci

# Run tests with coverage for CI/CD
npm run test:api:coverage:ci

# Run all tests for CI/CD
npm run test:all:ci

# Run tests with reporting
npm run test:api:report:ci
```

## 🐛 Troubleshooting Commands

```bash
# Check test configuration
npm run test:config:check

# Validate test setup
npm run test:setup:validate

# Check test dependencies
npm run test:deps:check

# Fix test issues
npm run test:fix
```

## 📚 Documentation Commands

```bash
# Generate test documentation
npm run test:docs:generate

# Update test documentation
npm run test:docs:update

# Validate test documentation
npm run test:docs:validate
```

## 🎯 Best Practices Commands

```bash
# Run linting on tests
npm run test:lint

# Fix linting issues
npm run test:lint:fix

# Check test quality
npm run test:quality:check

# Optimize test performance
npm run test:performance:optimize
```

## 📈 Monitoring Commands

```bash
# Monitor test execution
npm run test:monitor

# Track test performance
npm run test:performance:track

# Monitor test coverage
npm run test:coverage:monitor

# Track test reliability
npm run test:reliability:track
```

## 🔄 Maintenance Commands

```bash
# Update test dependencies
npm run test:deps:update

# Clean test artifacts
npm run test:clean

# Reset test environment
npm run test:reset

# Backup test data
npm run test:backup
```

## 📋 Example Usage

### Running a Complete Test Suite
```bash
# Run all tests with coverage
npm run test:api:coverage

# Run specific test suite with coverage
npm run test:api:coverage -- --testPathPattern=functional

# Run tests in watch mode
npm run test:api:watch
```

### Debugging Failed Tests
```bash
# Run specific failing test
npm run test:api -- --testNamePattern="failing test"

# Run tests with debug output
DEBUG=* npm run test:api -- --testNamePattern="failing test"

# Run tests with verbose output
npm run test:api -- --verbose --testNamePattern="failing test"
```

### Performance Testing
```bash
# Run performance tests
npm run test:api -- --testPathPattern=integration

# Run load tests
npm run test:api -- --testNamePattern="concurrent"

# Run stress tests
npm run test:api -- --testNamePattern="stress"
```

### Security Testing
```bash
# Run all security tests
npm run test:api -- --testPathPattern=security

# Run SQL injection tests
npm run test:api -- --testNamePattern="SQL injection"

# Run XSS tests
npm run test:api -- --testNamePattern="XSS"
```

---

**Note**: All commands are designed to work with the Jest testing framework and the custom test utilities provided in the `tests/api/` directory.
