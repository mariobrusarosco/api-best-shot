# Unit Testing Guide

## Overview

This guide outlines how to write and run unit tests for the API Best Shot project.

## Test Structure

- All test files should be placed next to the file they are testing with the `.spec.ts` or `.test.ts` extension
- Example: For `src/services/auth-service.ts`, create `src/services/auth-service.spec.ts`

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'jest';

describe('Module or function name', () => {
  it('should do something specific', () => {
    // Arrange - setup test data and conditions

    // Act - call the function/method being tested

    // Assert - check that the expected outcome is achieved
    expect(result).toBe(expectedValue);
  });
});
```

### Mocking Dependencies

```typescript
import { jest } from '@jest/globals';

// Mock a module
jest.mock('../path/to/module', () => ({
  someFunction: jest.fn().mockReturnValue('mocked value'),
}));

// Mock a specific function
const mockFunction = jest.fn().mockImplementation(() => 'result');

// Spy on a method
jest.spyOn(object, 'method').mockImplementation(() => 'result');
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  // Arrange
  const input = {
    /* test data */
  };

  // Act
  const result = await asyncFunction(input);

  // Assert
  expect(result).toEqual(expected);
});
```

## Running Tests

### Basic Commands

- Run all tests: `yarn test`
- Run tests in watch mode: `yarn test:watch`
- Run tests with coverage: `yarn test:coverage`
- Run a specific test file: `yarn test path/to/file.spec.ts`

### Test Coverage

We aim for a minimum of 70% code coverage on all new code.

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests
2. **Clear Test Names**: Test names should clearly describe what is being tested
3. **Avoid Test Interdependence**: Don't make tests depend on the order of execution
4. **Fast Tests**: Keep tests fast to encourage frequent running
5. **One Assertion Per Test**: When possible, limit to one assertion per test for clarity
6. **Test Edge Cases**: Include tests for edge cases and error conditions
