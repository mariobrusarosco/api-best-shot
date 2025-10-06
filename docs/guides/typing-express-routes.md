# Typing Express Routes - Quick Guide

## Overview

Express.js routes can be strongly typed using TypeScript generics to ensure type safety for request parameters, response bodies, request bodies, and query parameters.

## Basic Express Request Type Structure

```typescript
Request<Params, ResBody, ReqBody, ReqQuery, Locals>;
```

- **Params**: Route parameters (e.g., `/:id`)
- **ResBody**: Response body type
- **ReqBody**: Request body type
- **ReqQuery**: Query string parameters
- **Locals**: Local variables in `res.locals`

## Common Patterns

### 1. Routes Without Parameters

```typescript
// POST /tournaments
export type CreateTournamentRequest = Request<null, CreateTournamentInput>;

// Usage in handler
static async createTournament(req: CreateTournamentRequest, res: Response) {
  const { label, mode } = req.body; // Typed as CreateTournamentInput
}
```

### 2. Routes With Parameters

```typescript
// GET /tournaments/:tournamentId
export type GetTournamentRequest = Request<{ tournamentId: string }>;

// Usage in handler
static async getTournament(req: GetTournamentRequest, res: Response) {
  const { tournamentId } = req.params; // Typed as string
}
```

### 3. Flexible Routes (Parameters Optional)

```typescript
// Handles both POST /tournaments and GET /tournaments/:tournamentId
export type TournamentRequest = Request<{ tournamentId?: string }, CreateTournamentInput>;

// Usage
static async handleTournament(req: TournamentRequest, res: Response) {
  const tournamentId = req.params.tournamentId; // string | undefined
  const body = req.body; // CreateTournamentInput
}
```

### 4. Complex Routes with Multiple Parameters

```typescript
// GET /tournaments/:tournamentId/rounds/:roundId
export type TournamentRoundRequest = Request<{
  tournamentId: string;
  roundId: string;
}>;
```

### 5. Routes with Query Parameters

```typescript
// GET /tournaments?page=1&limit=10
export type TournamentListRequest = Request<
  null, // No route params
  unknown, // Response body (handled separately)
  unknown, // Request body
  { page?: string; limit?: string } // Query params
>;
```

## Best Practices

### 1. **Create Specific Types for Each Route Pattern**

```typescript
// Good: Specific types
export type CreateTournamentRequest = Request<null, CreateTournamentInput>;
export type UpdateTournamentRequest = Request<{ tournamentId: string }, UpdateTournamentInput>;

// Avoid: Generic any types
export type GenericRequest = Request<any, any>;
```

### 2. **Use Optional Parameters for Flexible Routes**

```typescript
// Handles multiple route patterns
export type TournamentRequest = Request<
  {
    tournamentId?: string;
    roundId?: string;
  },
  TournamentInput
>;
```

### 3. **Group Related Types**

```typescript
// Tournament-related types
export namespace TournamentTypes {
  export type CreateRequest = Request<null, CreateTournamentInput>;
  export type GetRequest = Request<{ tournamentId: string }>;
  export type UpdateRequest = Request<{ tournamentId: string }, UpdateTournamentInput>;
}
```

### 4. **Extend Base Types When Needed**

```typescript
// Base authenticated request
interface AuthenticatedRequest<P = null, B = unknown> extends Request<P, unknown, B> {
  authenticatedUser?: User;
}

// Specific tournament request with auth
export type AuthenticatedTournamentRequest = AuthenticatedRequest<{ tournamentId: string }, CreateTournamentInput>;
```

## Common Pitfalls

### ❌ **Don't use `any`**

```typescript
// Bad
export type BadRequest = Request<any, any>;
```

### ❌ **Don't forget optional parameters**

```typescript
// Bad: Will break on routes without tournamentId
export type BadTournamentRequest = Request<{ tournamentId: string }>;

// Good: Works for both parameterized and non-parameterized routes
export type GoodTournamentRequest = Request<{ tournamentId?: string }>;
```

### ❌ **Don't mix incompatible route patterns**

```typescript
// Bad: tournamentId required but used on routes without it
router.post('/tournaments', handler); // No tournamentId in route
// Type expects tournamentId but route doesn't provide it
```

## Example Implementation

```typescript
// types.ts
export interface CreateTournamentInput {
  label: string;
  mode: string;
}

export type TournamentRequest = Request<{ tournamentId?: string }, CreateTournamentInput>;

// routes.ts
import { TournamentRequest } from './types';

router.post('/tournaments', (req: TournamentRequest, res: Response) => {
  // req.body is typed as CreateTournamentInput
  // req.params.tournamentId is undefined
});

router.get('/tournaments/:tournamentId', (req: TournamentRequest, res: Response) => {
  // req.params.tournamentId is string
  // req.body is CreateTournamentInput (though not used in GET)
});
```

This approach ensures type safety while maintaining flexibility across different route patterns! 🚀
