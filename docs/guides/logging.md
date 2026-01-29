# Logging Guide

This guide explains the unified `LoggerService`, which is the single source of truth for all application logging.

## Core Principles

The `LoggerService` is designed to be simple, powerful, and environment-aware.

1.  **Unified API:** Use the single `Logger` instance for all logging needs (`Logger.info`, `Logger.warn`, `Logger.error`).
2.  **Environment-Aware:**
    - In `development`, logs are only printed to the console with colors for readability. Sentry is not used.
    - In `production`, `staging`, and `demo`, logs are sent to Sentry and also printed to the console.
3.  **Structured Context:** The `error` method uses a `context` object to attach structured, filterable data to Sentry events.

## Logging Flow

```text
+--------+       +---------+       +--------+       +---------+       +--------+
| Client |       | Express |       | Logger |       | Console |       | Sentry |
+--------+       +---------+       +--------+       +---------+       +--------+
    |                 |                 |                |                 |
    | [1] Request     |                 |                |                 |
    |---------------->|                 |                |                 |
    |                 |                 |                |                 |
    |                 | [2] Log Info/Warn                |                 |
    |                 |---------------->|                |                 |
    |                 |                 | [3] Print      |                 |
    |                 |                 |--------------->|                 |
    |                 |                 |                |                 |
    |                 |                 | [4] IF PROD/STAGING              |
    |                 |                 |--------------------------------->|
    |                 |                 | captureMessage()                 |
    |                 |                 |                |                 |
    |                 | [5] Log ERROR   |                |                 |
    |                 |---------------->|                |                 |
    |                 |                 | [6] Print (Stack Trace)          |
    |                 |                 |--------------->|                 |
    |                 |                 |                |                 |
    |                 |                 | [7] IF PROD/STAGING              |
    |                 |                 |--------------------------------->|
    |                 |                 | captureException()               |
    |                 |                 |                |                 |
    | [8] Response    |                 |                |                 |
    |<----------------|                 |                |                 |
    |                 |                 |                |                 |
    |                 | [9] Request Completion (Middleware)                |
    |                 |---------------->|                |                 |
    |                 |                 | [10] Print     |                 |
    |                 |                 |--------------->|                 |
    |                 |                 |                |                 |
    |                 |                 | [11] IF PROD/STAGING             |
    |                 |                 |--------------------------------->|
    |                 |                 | captureMessage()                 |
    |                 |                 | [!!! WARNING: HIGH VOLUME !!!]   |
    |                 |                 |                |                 |
```

## Usage

### Importing the Logger

```typescript
import Logger from '@/services/logger';
```

### Informational and Warning Logs

Use `info` and `warn` for general application events.

```typescript
Logger.info('User created successfully', { userId: 'user-123' });
Logger.warn('API response is slower than expected', { duration: '2500ms' });
```

### Error Logging (Most Important)

Always use `Logger.error` to report exceptions. This ensures they are captured in Sentry with actionable context.

The second argument is a `context` object that should contain filterable tags (`domain`, `component`, etc.) and any other relevant data.

```typescript
import { DOMAINS } from '@/services/logger/constants';

try {
  // ... some operation that might fail
} catch (e) {
  Logger.error(e as Error, {
    domain: DOMAINS.AUTH,
    component: 'UserController', // Free-form string identifying the component
    operation: 'createUser',     // Free-form string identifying the operation
    userId: 'user-123',
    // ... any other relevant data
  });
}
```

### Available Tags

For a full list of available, standardized tags to use in the `context` object, please refer to the constants defined in:
`src/services/logger/constants.ts`.
