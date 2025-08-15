---
description: Testing standards and practices
globs: "**/*.test.ts"
alwaysApply: true
---

# Testing Standards

## Test Structure

### File Organization
- Co-locate tests with source files using `*.test.ts` naming
- Maintain domain-driven directory structure in tests
- Use `src/tests/helpers/` for shared test utilities

### Test Helpers
- Use centralized test helpers from `src/tests/helpers/`
- `DatabaseTestHelper` for database setup/teardown
- `AuthTestHelper` for authentication mocking
- `RequestTestHelper` for HTTP request/response mocking

## Testing Patterns

### Mocking Strategy
- Mock external dependencies at module level
- Use `jest.mock()` for consistent mocking
- Clear mocks in `beforeEach()` hooks
- Mock database operations for unit tests

### Test Coverage Requirements
- Maintain 70% coverage threshold (branches, functions, lines, statements)
- Focus on business logic and critical paths
- Exclude type definitions and configuration files

### Assertion Patterns
- Use descriptive test names that explain the scenario
- Test both success and error cases
- Verify function calls with proper parameters
- Assert on return values and side effects

## Domain Testing

### Service Layer Tests
- Test business logic without database dependencies
- Mock all external service calls
- Verify proper error handling and validation
- Test cross-domain service interactions

### Query Layer Tests
- Mock database operations
- Test query construction and parameter passing
- Verify error handling for database failures
- Test return value transformations

### Integration Tests
- Use supertest for API endpoint testing
- Test complete request/response cycles
- Verify authentication and authorization
- Test error responses and status codes

## Test Execution

### Running Tests
```bash
yarn test          # Run all tests
yarn test:watch    # Run in watch mode
yarn test:cov      # Run with coverage report
```

### CI Integration
- Tests must pass before merging
- Coverage reports should be generated
- Test results should be cached for performance