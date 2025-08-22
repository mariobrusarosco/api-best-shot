# TypeScript Drizzle ORM Query Errors Fix

## Issue Context

**Date:** $(date)
**File:** `src/domains/data-provider/queries/index.ts`
**Error Type:** TypeScript compilation errors

## Problem Description

The data provider queries file had multiple TypeScript errors related to Drizzle ORM's strict type system. The main issues were:

1. **Property 'where' does not exist** - Error when trying to chain `.where()` methods
2. **Property 'orderBy' is missing** - Error when trying to chain `.orderBy()` methods
3. **Property 'limit' is missing** - Error when trying to chain `.limit()` methods
4. **Property 'offset' is missing** - Error when trying to chain `.offset()` methods
5. **Type mismatch** - Errors about missing properties when reassigning query variables

## Root Cause

The issue was caused by Drizzle ORM's strict type system. When you chain methods like `.where()`, `.orderBy()`, `.limit()`, etc., each method returns a new query object with a different type that omits certain methods. This is a common pattern issue with Drizzle ORM where reassigning query variables breaks the type chain.

## Solution Applied

### Before (Problematic Code)

```typescript
let query = db.select().from(T_DataProviderExecutions);

if (options?.operationType) {
  query = query.where(and(...conditions)); // ❌ Type error
}

query = query.orderBy(desc(T_DataProviderExecutions.startedAt)); // ❌ Type error

if (options?.limit) {
  query = query.limit(options.limit); // ❌ Type error
}
```

### After (Fixed Code)

```typescript
const conditions = [eq(T_DataProviderExecutions.tournamentId, tournamentId)];

if (options?.operationType) {
  conditions.push(eq(T_DataProviderExecutions.operationType, options.operationType));
}

const baseQuery = db
  .select()
  .from(T_DataProviderExecutions)
  .where(and(...conditions))
  .orderBy(desc(T_DataProviderExecutions.startedAt));

if (options?.limit && options?.offset) {
  return await baseQuery.limit(options.limit).offset(options.offset);
} else if (options?.limit) {
  return await baseQuery.limit(options.limit);
} else if (options?.offset) {
  return await baseQuery.offset(options.offset);
}

return await baseQuery;
```

## Key Changes Made

1. **Build conditions array first** - Collect all conditions before building the query
2. **Single query chain** - Build the base query in one chain without reassignment
3. **Conditional execution** - Use if/else blocks to handle optional limit/offset instead of reassigning
4. **Ternary operator for complex conditions** - Use ternary operator for the `getAllExecutions` function to handle the where clause conditionally

## Functions Fixed

1. `getExecutionsByTournament()` - Fixed query building with conditions
2. `getAllExecutions()` - Fixed query building with optional filtering

## Verification

- ✅ TypeScript compilation passes (`npx tsc --noEmit`)
- ✅ Code formatting applied with Prettier
- ✅ All query functionality preserved
- ✅ Type safety maintained

## Lessons Learned

1. **Drizzle ORM Type System** - Drizzle ORM has a very strict type system that prevents method chaining with reassignment
2. **Query Building Pattern** - Always build conditions first, then create the query in a single chain
3. **Conditional Logic** - Use if/else blocks or ternary operators instead of reassigning query variables
4. **Type Safety** - The strict typing actually helps prevent runtime errors, so it's worth working with the type system

## Related Files

- `src/domains/data-provider/queries/index.ts` - Main file with fixes
- `src/domains/data-provider/schema/index.ts` - Schema definitions referenced
