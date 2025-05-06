# Application Profiling Guide

This guide explains how to use the profiling system in the Best Shot API for error tracking, performance monitoring, and debugging.

## Overview

The Best Shot API includes a profiling system built around [Sentry](https://sentry.io/), a powerful application monitoring platform. The profiling service provides:

- **Error Tracking**: Capture and log errors with detailed context
- **Performance Monitoring**: Track application performance metrics
- **Environment-Based Logging**: Different behavior in development vs. production/demo environments
- **Structured Logging**: Consistent format for all application logs

## How Profiling Works

The profiling system consists of two main components:

1. **Sentry Integration**: Automatically captures errors and performance data in production/demo environments
2. **Profiling Service**: A simplified interface for logging errors and messages throughout the application

The system automatically determines whether to send data to Sentry or log to the console based on the current environment:
- **Development**: Logs to the console for local debugging
- **Production/Demo**: Sends data to Sentry for monitoring and alerting

## Using the Profiling Service

### Importing the Service

```typescript
import Profiling from '@/services/profiling';
```

### Logging Errors

Use the `error` method to log error information:

```typescript
try {
  // Your code that might throw an error
} catch (error) {
  Profiling.error('Failed to process data', error);
}
```

This will:
- In development: Log to the console with environment context
- In production/demo: Send the error to Sentry with full context

### Logging Messages

Use the `log` method to log informational messages:

```typescript
// Log a simple message
Profiling.log('User signup successful');

// Log with additional data
Profiling.log('Payment processed', { 
  amount: 50.00,
  currency: 'USD',
  userId: 'user-123'
});
```

## Best Practices

### Standardized Error Message Keys

**Important**: Each domain should define an enum with standardized error message keys following the pattern `PROFILLING_DOMAIN_NAME`. This makes logs easily searchable and filterable in Sentry or other monitoring tools.

#### Why Use Standardized Message Keys?

1. **Discoverability**: Makes it easy to find related errors in Sentry
2. **Consistency**: Ensures log messages follow a standard pattern
3. **Organization**: Groups related logs by domain and function
4. **Analytics**: Enables accurate error frequency tracking by specific error type

#### Implementation Example

For each domain, create an enum with standardized error keys:

```typescript
// src/domains/auth/constants/profiling.ts
export enum PROFILLING_AUTH {
  AUTHENTICATE_USER = '[AUTH] Failed to authenticate user',
  VALIDATE_TOKEN = '[AUTH] Failed to validate token',
  CREATE_TOKEN = '[AUTH] Failed to create token',
  REFRESH_TOKEN = '[AUTH] Failed to refresh token'
}

// src/domains/user/constants/profiling.ts
export enum PROFILLING_USER {
  CREATE_USER = '[USER] Failed to create user',
  UPDATE_USER = '[USER] Failed to update user profile',
  FETCH_USER = '[USER] Failed to fetch user data',
  DELETE_USER = '[USER] Failed to delete user'
}
```

#### Usage Example

```typescript
import { PROFILLING_AUTH } from '../constants/profiling';
import Profiling from '@/services/profiling';

// In authentication controller
const authenticateUser = async (req: Request, res: Response) => {
  try {
    // Authentication logic
  } catch (error) {
    // Use the standardized error key
    Profiling.error(PROFILLING_AUTH.AUTHENTICATE_USER, error);
    return handleInternalServerErrorResponse(res, error);
  }
};
```

#### Real-world Example with Request Validation
Follow the steps below to log a validation error:

1. Validate the request body
2. Check if there are validation errors
3. Format the validation errors
4. Log the validation errors
5. Return the validation errors

```typescript
const validationResult = authenticateUserSchema.safeParse(req.body); // Step 1: Validate the request body
const hasValidationError = !validationResult.success; // Step 2: Check if there are validation errors
   
if (hasValidationError) {
  const errors = validationResult.error.format(); // Step 3: Format the validation errors

  // Use the standardized error key from the enum
  Profiling.error(PROFILLING_AUTH.AUTHENTICATE_USER, errors); // Step 4: Log the validation errors
  
  return res // Step 5: Return the validation errors
    .status(AuthErrorMapper.VALIDATION_ERROR.status)
    .send({ 
      message: AuthErrorMapper.VALIDATION_ERROR.user,
    });
}
```

### When to Use Profiling

1. **Error Handling**: Always use `Profiling.error()` in catch blocks
   ```typescript
   try {
     // Code that might fail
   } catch (error) {
     Profiling.error(PROFILLING_DOMAIN.OPERATION_NAME, error);
     return handleInternalServerErrorResponse(res, error);
   }
   ```

2. **Important Events**: Log significant application events
   ```typescript
   Profiling.log(PROFILLING_AUTH.USER_AUTHENTICATED, { userId });
   ```

3. **Performance Tracking**: Log at the start and end of important operations
   ```typescript
   Profiling.log(PROFILLING_DATABASE.MIGRATION_STARTED);
   // ... migration code
   Profiling.log(PROFILLING_DATABASE.MIGRATION_COMPLETED, { tablesUpdated: 5 });
   ```

### Contextual Information

Always include relevant context with your logs:

```typescript
// Good - includes contextual information and uses standardized key
Profiling.error(PROFILLING_TOURNAMENT.CREATE_FAILED, { tournamentId, error });

// Better - includes structured data
Profiling.error(PROFILLING_TOURNAMENT.CREATE_FAILED, { 
  tournamentId,
  error,
  attemptCount
});
```

## Configuration

### Environment Variables

The profiling system uses these environment variables:

- `NODE_ENV`: Determines logging behavior (development/demo/production)
- `SENTRY_DSN`: Sentry Data Source Name for connecting to your Sentry project

### Sentry Configuration

Sentry is configured in `src/services/profiling/sentry-instrument.ts` with these settings:

- `tracesSampleRate: 1.0`: Captures 100% of transactions
- `profilesSampleRate: 1.0`: Full profiling data collection
- `environment`: Uses the current NODE_ENV value

## Example Usage Patterns

### API Error Handling

```typescript
const createResource = async (req: Request, res: Response) => {
  try {
    const result = await service.create(req.body);
    return res.status(201).send(result);
  } catch (error) {
    Profiling.error(PROFILLING_RESOURCE.CREATE_FAILED, error);
    return handleInternalServerErrorResponse(res, error);
  }
};
```

### Service Layer Logging

```typescript
const processData = async (data) => {
  try {
    Profiling.log(PROFILLING_DATA.PROCESSING_STARTED, { size: data.length });
    // Processing logic
    Profiling.log(PROFILLING_DATA.PROCESSING_COMPLETED);
    return result;
  } catch (error) {
    Profiling.error(PROFILLING_DATA.PROCESSING_FAILED, error);
    throw error; // Re-throw for the caller to handle
  }
};
```

## Debugging with Profiling

When troubleshooting issues:

1. **Check console logs** in development environment
2. **Review Sentry dashboard** in production/demo environments:
   - View full error stack traces
   - See error frequency and affected users
   - Track performance bottlenecks
   - **Filter by specific PROFILLING_DOMAIN keys** to isolate domain-specific issues

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Node.js Error Handling Best Practices](https://www.joyent.com/node-js/production/design/errors) 