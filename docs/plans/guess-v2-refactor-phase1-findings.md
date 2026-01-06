# Phase 1 Findings: Guess V2 Refactor - Remove Auto-Create Logic

**Date**: 2026-01-02
**Status**: Complete - Awaiting User Review

---

## Executive Summary

✅ **Safe to proceed with refactor**
- Auto-create logic is isolated to one function
- Only one API endpoint affected
- No tests to update (none exist for this feature)
- Breaking change will affect **both V1 and V2** (they share the same controller)

---

## 1. Route Mounting Discovery

### Endpoints Affected

**Both V1 and V2 use the SAME handler:**

```
V1: GET /api/v1/tournaments/:tournamentId/guess?round=xyz
V2: GET /api/v2/tournaments/:tournamentId/guess?round=xyz
```

### Call Chain

```
Tournament Route (v1.ts:14 / v2.ts:14)
  ↓
API_GUESS.getMemberGuesses (guess/api/index.ts:7)
  ↓
GuessController.getMemberGuesses (guess/controllers/guess-controllers.ts:19)
```

### ⚠️ CRITICAL FINDING

**Both V1 and V2 routes use the exact same controller function.**

Any changes to `GuessController.getMemberGuesses` will affect **BOTH** API versions simultaneously. There is no separate V1/V2 implementation at the controller level.

**Recommendation**:
- Either accept that both versions will change together
- OR create separate V1/V2 controller functions before refactoring

---

## 2. Current Data Flow Analysis

### Request Flow

```typescript
1. Receive: { tournamentId, round, memberId }

2. Query #1: SELECT guesses WHERE tournamentId + round + memberId

3. IF guesses.length === 0:
   a. Query #2: SELECT all matches for round
   b. INSERT N guesses (homeScore: null, awayScore: null)
      - Uses onConflictDoNothing()
      - N = number of matches in round
   c. Query #3: Re-SELECT guesses (same as Query #1)

4. Transform: guesses.map(row => runGuessAnalysis(row.guess, row.match))

5. Return: Array of analyzed guesses
```

### Database Load

| Scenario | Queries | Inserts |
|----------|---------|---------|
| **User has guesses** | 1 SELECT | 0 |
| **No guesses (auto-create)** | 3 SELECTs | N INSERTs (N = matches) |

**Typical Round**: 8-16 matches
**Auto-create cost**: 3 queries + 8-16 inserts

---

## 3. Duplicate Code Analysis

### Current State: Code Duplication

Two nearly identical implementations exist:

#### A. `runGuessAnalysis` (controllers/guess-analysis.ts)
```typescript
// Single guess → single result
export const runGuessAnalysis = (
  guess: DB_SelectGuess,
  match: DB_SelectMatch
) => { /* analysis logic */ }
```

**Used by (13 locations):**
- `guess/controllers/guess-controllers.ts` (line 70, 117)
- `guess/utils.ts` (line 1, 3)
- `guess/services/get-total-points-from-tournament-guesses.ts` (line 1, 3)
- `performance/services/index.ts` (line 5, 21) ⚠️ Mixed usage
- `performance/controller/index.ts` (line 2, 132, 179)
- `performance/database/index.ts` (line 1, 19)
- `tournament/services/index.ts` (line 31, 43, 51)

#### B. `runGuessAnalysis_V2` (services/guess-analysis-v2.ts)
```typescript
// Array of guesses → array of results
export const runGuessAnalysis_V2 = (
  guesses: Array<{guess, match}>
) => guesses.map(row => { /* SAME logic */ })
```

**Used by (3 locations):**
- `guess/services/index.ts` (exported as SERVICES_GUESS_V2)
- `performance/services/index.ts` (line 1, 30, 75) ⚠️ Mixed usage

### Analysis

**Core Logic**: 100% identical (all helper functions duplicated)
- `generateExpiredGuess()`
- `generatePausedGuess()`
- `generateNotStartedGuess()`
- `generateWaitingForGameGuess()`
- `generateFinalizedGuess()`
- `getMatchOutcome()`

**Difference**: V2 is just a wrapper that maps over an array

**Migration Status**: Performance domain is mid-migration (inconsistent usage)

### Recommendation

**Consolidate to single source of truth:**
1. Keep `runGuessAnalysis` (single guess version) in `services/`
2. Export both single and array versions from services
3. Update all 13+ import locations
4. Delete duplicate file

---

## 4. Dependency Analysis

### Direct Callers of Auto-Create Logic

**Only 1 caller:**
- `API_GUESS.getMemberGuesses` (guess/api/index.ts:13)

### Indirect Dependencies

**None found:**
- ✅ No other services call `GuessController.getMemberGuesses`
- ✅ No tests exist for this function
- ✅ No documentation mentions auto-create behavior
- ✅ No comments reference this feature

### Database Pattern Usage

**`onConflictDoNothing` usage:**
- ✅ `guess/controllers/guess-controllers.ts` (auto-create logic)
- ✅ `team/queries/index.ts` (unrelated team operations)

---

## 5. Breaking Change Impact Assessment

### What Will Break

**Frontend Behavior Change:**
```
BEFORE: GET /api/v2/tournaments/123/guess?round=group-1
        → Returns 8 guesses (all with null scores if user never guessed)

AFTER:  GET /api/v2/tournaments/123/guess?round=group-1
        → Returns [] (empty array if user never guessed)
```

### What Will NOT Break

✅ **createGuess** endpoint - unchanged (upsert still works)
✅ **Score calculations** - only depend on existing guesses
✅ **Leaderboards** - filter out null guesses anyway
✅ **Performance domain** - uses separate queries

### Migration Strategy for Frontend

Frontend must now:
1. Fetch matches for round: `GET /tournaments/{id}/matches/{round}`
2. Fetch user guesses: `GET /tournaments/{id}/guess?round={round}`
3. Client-side merge: Create temporary guess objects for matches without guesses
4. When user submits: `POST /guess` (upsert behavior unchanged)

---

## 6. Test Coverage

**Current State:**
- ❌ No unit tests found for `getMemberGuesses`
- ❌ No integration tests for auto-create behavior
- ⚠️ Only 1 test file exists in entire `/src` directory

**Required After Refactor:**
- ✅ Test empty array return when no guesses
- ✅ Test partial guesses (2 out of 8 matches)
- ✅ Test that no database writes occur on GET
- ✅ Test createGuess upsert still works

---

## 7. Recommendations for Phase 2

### Option A: Simple Refactor (Affects Both V1 & V2)

**Pros:**
- Fastest implementation
- Simplest code
- Both versions stay in sync

**Cons:**
- V1 behavior changes (breaking change for both versions)

**Steps:**
1. Remove lines 39-67 from `guess-controllers.ts`
2. Update frontend to handle empty arrays
3. Deploy backend + frontend together

### Option B: Create Separate V2 Controller (V1 Unchanged)

**Pros:**
- V1 maintains backward compatibility
- V2 gets cleaner implementation
- Gradual migration path

**Cons:**
- More code to maintain
- Need to split controller into v1/v2 versions

**Steps:**
1. Create `getMemberGuesses_V2` controller
2. Update V2 route to use new controller
3. Leave V1 using old controller with auto-create

### Recommended Approach

**Option A** - Simple refactor affecting both versions

**Rationale:**
- No evidence of external V1 API consumers
- Frontend is likely the only client
- Simpler codebase = easier maintenance
- Can coordinate backend + frontend deployment

---

## 8. Additional Findings

### Code Quality Issues Found

1. **Incomplete error handling** (guess-controllers.ts:74-79)
   - Function catches error but doesn't return/throw
   - Could result in `undefined` return value

2. **Mixed V1/V2 adoption**
   - Performance domain partially migrated
   - Inconsistent import patterns

3. **No type safety on query params**
   - `round` query param not validated
   - Could be undefined/invalid

### Opportunities for Improvement (Out of Scope)

- Consolidate duplicate analysis code
- Add input validation
- Fix error handling
- Add comprehensive tests
- Document API contracts

---

## Next Steps

**Awaiting User Decision:**

1. **Proceed with Option A** (simple refactor, both versions affected)?
2. **Proceed with Option B** (create separate V2 controller)?
3. **Address code quality issues** while refactoring?
4. **Consolidate duplicate analysis code** as part of this work?

**Phase 1 Complete ✓**

Ready to proceed to Phase 2 upon approval.
