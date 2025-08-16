# Architecture Overview

Best Shot API follows a **domain-driven three-layer architecture** that promotes maintainability, testability, and clear separation of concerns.

## Core Architecture

### Three-Layer Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 API Layer                                   │
│  • HTTP concerns (request/response)                         │
│  • Input validation                                         │
│  • Error mapping                                            │
│  • Route handling                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Service Layer                                 │
│  • Business logic                                           │
│  • Data transformation                                      │
│  • Cross-domain orchestration                               │
│  • Error handling                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Query Layer                                  │
│  • Database operations                                      │
│  • Raw data access                                          │
│  • Drizzle ORM queries                                      │
│  • No business logic                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL                                  │
└─────────────────────────────────────────────────────────────┘
```

### Domain-Driven Structure

Each business domain follows a consistent pattern:

```
src/domains/{domain}/
├── api/           # HTTP endpoints and route handlers
├── services/      # Business logic and data transformation
├── queries/       # Database operations (Drizzle ORM)
├── routes/        # Express route definitions (v1, v2)
├── schema/        # Database schema definitions
├── typing.ts      # TypeScript type definitions
└── (optional):
    ├── controllers/    # Complex business logic
    ├── error-handling/ # Domain-specific error mapping
    └── utils/          # Domain-specific utilities
```

## Layer Responsibilities

### 1. Query Layer (`queries/index.ts`)

**Purpose**: Raw database operations and data access

**Responsibilities**:

- Database queries using Drizzle ORM
- Raw data retrieval and persistence
- Database-specific logic
- No business logic or transformations

**Example**:

```typescript
// domains/performance/queries/index.ts
const queryPerformanceOfAllMemberTournaments = async (memberId: string) => {
  return await db
    .select()
    .from(T_TournamentPerformance)
    .where(eq(T_TournamentPerformance.memberId, memberId));
};

export const QUERIES_PERFORMANCE = {
  queryPerformanceOfAllMemberTournaments,
};
```

### 2. Service Layer (`services/index.ts`)

**Purpose**: Business logic, data transformation, and orchestration

**Responsibilities**:

- Business rules and logic
- Data transformation and processing
- Cross-domain service calls
- Error handling and validation
- Orchestrating multiple queries

**Example**:

```typescript
// domains/performance/services/index.ts
const getMemberPerformanceExtremes = async (memberId: string) => {
  const memberPerformance =
    await QUERIES_PERFORMANCE.queryPerformanceOfAllMemberTournaments(memberId);

  if (!memberPerformance.length) {
    return { worstPerformance: null, bestPerformance: null };
  }

  const worstPerformance = minBy(memberPerformance, p => Number(p.points));
  const bestPerformance = maxBy(memberPerformance, p => Number(p.points));

  return { worstPerformance, bestPerformance };
};

export const SERVICES_PERFORMANCE = {
  getMemberPerformanceExtremes,
};
```

### 3. API Layer (`api/index.ts`)

**Purpose**: HTTP concerns, request/response handling

**Responsibilities**:

- Express route handlers
- Request/response formatting
- HTTP status codes
- Input validation
- Calling services for business logic

**Example**:

```typescript
// domains/performance/api/index.ts
const getPerformanceExtremes = async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const performance = await SERVICES_PERFORMANCE.getMemberPerformanceExtremes(memberId);
  return res.json(performance);
};

export const API_PERFORMANCE = {
  getPerformanceExtremes,
};
```

## Naming Conventions

### Consistent Export Naming

- **API Layer**: `API_{DOMAIN}` (e.g., `API_TOURNAMENT`, `API_MATCH`)
- **Service Layer**: `SERVICES_{DOMAIN}` (e.g., `SERVICES_TOURNAMENT`, `SERVICES_PERFORMANCE`)
- **Query Layer**: `QUERIES_{DOMAIN}` (e.g., `QUERIES_TOURNAMENT`, `QUERIES_PERFORMANCE`)

### Database Conventions

- **Table Names**: `T_` prefix (e.g., `T_Tournament`, `T_Match`, `T_Guess`)
- **Database Types**:
  - `DB_Insert{Entity}` for insert operations
  - `DB_Update{Entity}` for update operations
  - `DB_Select{Entity}` for select operations

### TypeScript Types

```typescript
// Domain typing example
export type TournamentRegistration = {
  tournamentId: string;
  playerId: string;
  division?: string;
};

export type RegistrationResult = {
  success: boolean;
  registrationId?: string;
  error?: string;
};
```

## Service Architecture Patterns

### Service Integration Points

Services can interact with:

- **Queries**: Database operations
- **Other Services**: Cross-domain business logic
- **Utils**: Shared functionality
- **External APIs**: Third-party integrations

### Service Method Pattern

```typescript
const SERVICES_TOURNAMENT = {
  async registerPlayerForTournament(
    registration: TournamentRegistration
  ): Promise<RegistrationResult> {
    try {
      // 1. Input validation
      if (!validateRegistration(registration)) {
        return { success: false, error: 'Invalid registration data' };
      }

      // 2. Call another service for cross-domain logic
      const playerEligible = await SERVICES_PLAYER.checkEligibility(
        registration.playerId,
        registration.tournamentId
      );

      if (!playerEligible) {
        return { success: false, error: 'Player not eligible' };
      }

      // 3. Use queries for database operations
      const tournamentFull = await QUERIES_TOURNAMENT.checkTournamentCapacity(
        registration.tournamentId
      );

      if (tournamentFull) {
        return { success: false, error: 'Tournament at capacity' };
      }

      // 4. Save data
      const registrationId = await QUERIES_TOURNAMENT.createRegistration(registration);

      return { success: true, registrationId };
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  },
};
```

## Database Schema Architecture

### Schema Organization

Database schemas are defined per domain and aggregated:

- **Domain schemas**: `src/domains/{domain}/schema/index.ts`
- **Aggregated schema**: `src/services/database/schema.ts`
- **Migrations**: `supabase/migrations/`

### Schema Patterns

All tables include:

- **Timestamps**: `createdAt`, `updatedAt` with automatic updates
- **Type inference**: `$inferInsert`, `$inferSelect` for TypeScript
- **Relationships**: Clear foreign key definitions

```typescript
// Example schema
export const T_Tournament = pgTable('tournament', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

## Cross-Domain Communication

### Service-to-Service Calls

Services can call other domain services directly:

```typescript
// Tournament service calling Performance service
const tournamentWithStats = await SERVICES_PERFORMANCE.getTournamentStats(tournamentId);
```

### Route Mounting

Routes can include endpoints from other domains:

```typescript
// Tournament routes include match and guess endpoints
router.use('/tournaments/:tournamentId/matches', matchRoutes);
router.use('/tournaments/:tournamentId/guesses', guessRoutes);
```

## Benefits

### 1. **Separation of Concerns**

- Each layer has a single, clear responsibility
- Changes in one layer don't affect others
- Easy to understand and modify code

### 2. **Maintainability**

- Predictable file structure across domains
- Clear dependencies between layers
- Easy to locate specific functionality

### 3. **Testability**

- Layers can be tested independently
- Easy to mock dependencies
- Clear boundaries for unit tests

### 4. **Scalability**

- New domains follow established patterns
- Cross-domain communication is explicit
- Service boundaries support team scaling

## Best Practices

### ✅ Do This

- **Follow the three-layer pattern** strictly
- **Use consistent naming conventions** across domains
- **Keep database operations in queries layer** only
- **Put business logic in services layer** only
- **Handle HTTP concerns in API layer** only
- **Use cross-domain service calls** for business logic
- **Include timestamps** in all database tables

### ❌ Don't Do This

- Don't put business logic in queries or API layers
- Don't call queries directly from API layer
- Don't mix HTTP concerns with business logic
- Don't bypass service layer for cross-domain calls
- Don't create tables without timestamps

## Example Request Flow

Using tournament registration as an example:

1. **API Layer** receives HTTP request
2. **API Layer** validates request format
3. **API Layer** calls **Service Layer** for business logic
4. **Service Layer** calls **Query Layer** for tournament data
5. **Service Layer** calls **Player Service** for eligibility check
6. **Service Layer** processes business rules
7. **Service Layer** calls **Query Layer** to save registration
8. **API Layer** formats and returns HTTP response

This flow ensures clean separation of concerns and maintainable code.

## Related Documentation

- [Getting Started](../guides/getting-started.md) - Setup and development
- [Database Operations](../guides/database-operations.md) - Database patterns
- [Environment Management](../guides/environment-management.md) - Configuration
- [Testing Guide](../guides/testing.md) - Testing patterns
