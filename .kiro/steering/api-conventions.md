---
description: API design and development conventions
globs: "**/api/**", "**/routes/**", "**/controllers/**"
alwaysApply: true
---

# API Development Conventions

## Domain-Driven API Structure

### Endpoint Organization
- Group endpoints by domain (tournament, match, auth, etc.)
- Use versioned routes (`/v1/`, `/v2/`) for API evolution
- Maintain consistent URL patterns within domains

### Route Structure
```
/api/v1/tournaments/:tournamentId/matches
/api/v1/tournaments/:tournamentId/standings
/api/v1/auth/login
/api/v1/members/:memberId/performance
```

## Request/Response Patterns

### Error Handling
- Use domain-specific error mappers
- Return consistent error response format
- Include proper HTTP status codes
- Log errors with Sentry integration

### Authentication
- Use JWT tokens for authentication
- Support both Bearer tokens and cookies
- Implement proper token validation middleware
- Handle authentication errors gracefully

### Data Validation
- Use Zod schemas for request validation
- Validate at controller level before service calls
- Return clear validation error messages
- Sanitize input data appropriately

## Controller Patterns

### Request Processing
1. Extract and validate request parameters
2. Call appropriate service methods
3. Handle service errors appropriately
4. Return formatted response

### Service Integration
- Controllers should only orchestrate, not contain business logic
- Call services for all business operations
- Use queries directly only for simple data retrieval
- Handle cross-domain operations through services

## Response Formats

### Success Responses
```typescript
{
  success: true,
  data: { ... },
  meta?: { pagination, etc. }
}
```

### Error Responses
```typescript
{
  success: false,
  error: "Human readable message",
  code?: "ERROR_CODE",
  details?: { ... }
}
```

## Performance Considerations

### Database Operations
- Use efficient queries with proper indexing
- Implement pagination for large datasets
- Cache frequently accessed data when appropriate
- Monitor query performance and optimize as needed

### Browser Operations
- Isolate Playwright operations to prevent crashes
- Implement proper timeouts and retries
- Use Cloud Functions for browser-heavy operations
- Monitor memory usage and cleanup resources

## Security Standards

### Input Validation
- Validate all input parameters
- Sanitize data before database operations
- Use parameterized queries to prevent SQL injection
- Implement rate limiting for API endpoints

### Authentication & Authorization
- Verify JWT tokens on protected routes
- Implement proper role-based access control
- Use secure cookie settings for authentication
- Log authentication attempts and failures