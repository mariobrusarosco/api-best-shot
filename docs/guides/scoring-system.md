# Member Scoring System - Engineering Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Core Components](#core-components)
- [Scoring Algorithm Deep Dive](#scoring-algorithm-deep-dive)
- [Score Calculation Flow](#score-calculation-flow)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Modifying Scoring Rules](#modifying-scoring-rules)
- [Adding New Features](#adding-new-features)
- [Testing](#testing)
- [Debugging](#debugging)
- [Performance Considerations](#performance-considerations)
- [Common Pitfalls](#common-pitfalls)

---

## Overview

The Best Shot API scoring system calculates member points based on their match predictions (guesses). The system uses a simple outcome-based scoring model where members earn points for correctly predicting match results (win/loss/draw), not exact scores.

### Key Characteristics
- **Outcome-based**: Only match outcome matters (3 points)
- **Cached performance**: Points stored in dedicated tables for query performance
- **On-demand updates**: Scores recalculated via API calls or scheduled jobs
- **Stateless analysis**: Each guess independently analyzed
- **Multi-level aggregation**: Tournament → League hierarchy

---

## Architecture

### Domain-Driven Design

The scoring system spans multiple domains:

```
guess/                      # Core prediction logic
├── schema/                 # Guess table definition
├── controllers/
│   └── guess-analysis.ts   # Scoring algorithm (V1)
├── services/
│   └── guess-analysis-v2.ts # Scoring algorithm (V2) - CURRENT
├── queries/                # Database queries for guesses
└── typing.ts               # Guess statuses and types

performance/                # Score aggregation & caching
├── schema/                 # Performance tables
├── services/               # Score calculation & updates
├── queries/                # Performance queries
├── controller/             # API handlers
└── database/               # DB operations

match/                      # Match results
└── schema/                 # Match table with actual scores
```

### Data Flow

```
┌─────────────┐
│ Data Provider│ → Fetch match results from SofaScore
└──────┬──────┘
       ↓
┌─────────────┐
│   Match     │ → Update homeScore, awayScore, status
└──────┬──────┘
       ↓
┌─────────────┐
│   Guess     │ → Member predictions
│  Analysis   │ → Compare guess vs actual
└──────┬──────┘
       ↓
┌─────────────┐
│ Performance │ → Aggregate points by tournament/league
│   Update    │ → Cache in performance tables
└─────────────┘
```

---

## Core Components

### 1. Guess Analysis (V1 & V2)

**Primary File**: `src/domains/guess/controllers/guess-analysis.ts`

**Main Function**: `runGuessAnalysis(guess, match)`
- **Purpose**: Analyzes a single guess against match result
- **Returns**: `IGuessAnalysis` object with status, points breakdown, total

**Location**: Lines 12-27

```typescript
export const runGuessAnalysis = (
  guess: DB_SelectGuess,
  match: DB_SelectMatch
) => {
  // Determines guess state based on match status and timing
  // Returns appropriate analysis object
}
```

### 2. Guess Status States

**File**: `src/domains/guess/typing.ts:21-29`

```typescript
export const GUESS_STATUSES = {
  PAUSED: 'paused',              // Match postponed
  NOT_STARTED: 'not-started',     // No guess submitted yet
  EXPIRED: 'expired',             // Missed deadline
  WAITING_FOR_GAME: 'waiting_for_game', // Guess submitted, match pending
  FINALIZED: 'finalized',         // Match ended, points calculated
  CORRECT: 'correct',             // Individual component correct
  INCORRECT: 'incorrect',         // Individual component incorrect
} as const;
```

### 3. Performance Services

**File**: `src/domains/performance/services/index.ts`

**Key Functions**:

#### `calculatePoints(guesses: GuessWithMatch[]): string`
- **Location**: Lines 20-25
- **Purpose**: Calculate total points from array of guesses
- **Logic**:
  ```typescript
  const parsedGuesses = guesses.map(row =>
    runGuessAnalysis(row.guess, row.match)
  );
  const totalPoints = getTotalPointsFromTournamentGuesses(parsedGuesses);
  return totalPoints?.toString() ?? '0';
  ```

#### `updateMemberPerformance(memberId, tournamentId)`
- **Location**: Lines 73-81
- **Purpose**: Recalculate and update tournament performance
- **Returns**: Updated performance object

#### `updateLeaguePerformance(leagueId)`
- **Location**: Lines 113-166
- **Purpose**: Update all members' performance in a league
- **Process**:
  1. Get all league members
  2. Get all tracked tournaments
  3. Update each member's tournament performances
  4. Aggregate tournament points to league level
  5. Return sorted leaderboard

---

## Scoring Algorithm Deep Dive

### Location
`src/domains/guess/controllers/guess-analysis.ts:156-225`

### Constants

```typescript
const POINTS_FOR_TEAM = 0;           // No points for exact team scores
const POINTS_FOR_MISS = 0;           // No penalty for wrong scores
const POINTS_FOR_MATCH_OUTCOME = 3;  // Points for correct outcome prediction
```

### Score Calculation Logic

**Function**: `generateFinalizedGuess()` (Lines 156-196)

```typescript
const generateFinalizedGuess = (guess, match, options) => {
  // 1. Check individual team scores
  const hasGuessedHome =
    toNumberOrNull(guess.homeScore) === toNumberOrNull(match.homeScore);
  const hasGuessedAway =
    toNumberOrNull(guess.awayScore) === toNumberOrNull(match.awayScore);

  // 2. Get match outcome comparison
  const matchOutcome = getMatchOutcome(guess, match);

  // 3. Calculate points
  const home = {
    status: hasGuessedHome ? CORRECT_GUESS : INCORRECT_GUESS,
    value: toNumberOrNull(guess.homeScore),
    points: hasGuessedHome ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  const away = {
    status: hasGuessedAway ? CORRECT_GUESS : INCORRECT_GUESS,
    value: toNumberOrNull(guess.awayScore),
    points: hasGuessedAway ? POINTS_FOR_TEAM : POINTS_FOR_MISS,
  };

  // 4. Sum total points
  const total = home.points + away.points + matchOutcome.points;

  return { home, away, total, fullMatch: matchOutcome, ... };
};
```

### Match Outcome Determination

**Function**: `getMatchOutcome()` (Lines 198-225)

```typescript
const getMatchOutcome = (guess, match) => {
  const POINTS_FOR_MATCH_OUTCOME = 3;

  // Convert to numbers (null becomes 0)
  const homeGuess = toNumberOrZero(guess.homeScore);
  const homeMatch = toNumberOrZero(match.homeScore);
  const awayGuess = toNumberOrZero(guess.awayScore);
  const awayMatch = toNumberOrZero(match.awayScore);

  // Determine guess prediction
  let guessPrediction;
  if (homeGuess > awayGuess) guessPrediction = { label: 'HOME_WIN' };
  else if (homeGuess < awayGuess) guessPrediction = { label: 'AWAY_WIN' };
  else guessPrediction = { label: 'DRAW' };

  // Determine actual match outcome
  let matchOutcome;
  if (homeMatch > awayMatch) matchOutcome = { label: 'HOME_WIN' };
  else if (homeMatch < awayMatch) matchOutcome = { label: 'AWAY_WIN' };
  else matchOutcome = { label: 'DRAW' };

  // Award points if prediction matches outcome
  return {
    label: matchOutcome.label,
    points: guessPrediction.label === matchOutcome.label
      ? POINTS_FOR_MATCH_OUTCOME
      : 0,
    status: guessPrediction.label === matchOutcome.label
      ? GUESS_STATUSES.CORRECT
      : GUESS_STATUSES.INCORRECT,
  };
};
```

### Examples

#### Example 1: Correct Outcome, Wrong Scores
```
Guess:  Home 2 - Away 1 (predicts HOME_WIN)
Actual: Home 3 - Away 0 (HOME_WIN)

Analysis:
  home.points = 0  (2 ≠ 3, POINTS_FOR_TEAM = 0)
  away.points = 0  (1 ≠ 0, POINTS_FOR_TEAM = 0)
  matchOutcome.points = 3 (HOME_WIN === HOME_WIN)

Total: 3 points ✓
```

#### Example 2: Exact Score Match
```
Guess:  Home 2 - Away 1
Actual: Home 2 - Away 1

Analysis:
  home.points = 0  (2 === 2, but POINTS_FOR_TEAM = 0)
  away.points = 0  (1 === 1, but POINTS_FOR_TEAM = 0)
  matchOutcome.points = 3 (HOME_WIN === HOME_WIN)

Total: 3 points (same as Example 1!)
```

#### Example 3: Wrong Outcome
```
Guess:  Home 2 - Away 1 (predicts HOME_WIN)
Actual: Home 1 - Away 2 (AWAY_WIN)

Analysis:
  home.points = 0
  away.points = 0
  matchOutcome.points = 0 (HOME_WIN ≠ AWAY_WIN)

Total: 0 points ✗
```

---

## Score Calculation Flow

### When a Member Creates/Updates a Guess

**File**: `src/domains/guess/controllers/guess-controllers.ts`

```
1. User submits guess
   POST /api/v2/guesses

2. Validate guess
   - Match exists
   - Match not started (date check)
   - Valid score values

3. Upsert guess to database
   - Composite key: (matchId, memberId)
   - Only one guess per match per member

4. Run analysis
   runGuessAnalysis(guess, match)

5. Return guess with status
   - Usually 'waiting_for_game' if match ongoing
   - Performance tables NOT updated yet
```

### When Match Results are Updated

**Automated Flow** (via AWS Lambda):

```
1. Scheduled job triggers
   AWS Scheduler → Lambda function

2. Data provider fetches results
   SofaScore API scraping

3. Update match table
   UPDATE T_Match SET
     homeScore = X,
     awayScore = Y,
     status = 'ended'

4. Trigger performance update
   Call internal API endpoints
   (Implementation in Lambda, not in this repo)
```

### When Performance is Recalculated

**Manual Trigger** (API endpoint):

```
Tournament Performance Update:
  PATCH /api/v2/tournaments/:tournamentId/performance

  1. Fetch all member guesses for tournament
     QUERIES_GUESS.selectMemberGuessesForTournament()

  2. Run analysis on each guess
     runGuessAnalysis_V2(guesses)

  3. Calculate total points
     getTotalPointsFromTournamentGuesses()

  4. Update performance table
     UPDATE T_TournamentPerformance SET points = X
     WHERE memberId = Y AND tournamentId = Z

  5. Return updated performance
```

```
League Performance Update:
  PATCH /api/v2/leagues/:leagueId/performance

  1. Get all league members
     SELECT * FROM T_LeagueRole WHERE leagueId = X

  2. Get all tracked tournaments
     SELECT * FROM T_LeagueTournament
     WHERE leagueId = X AND status = 'tracked'

  3. For each member:
     a. Update all tournament performances
        updateTournamentsForMember()

     b. Sum tournament points
        totalPoints = Σ(tournament.points)

     c. Update league performance
        UPDATE T_LeaguePerformance SET points = totalPoints
        WHERE memberId = Y AND leagueId = X

  4. Return sorted leaderboard
     ORDER BY points DESC
```

---

## Database Schema

### T_Guess

**File**: `src/domains/guess/schema/index.ts`

```typescript
export const T_Guess = pgTable('guesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull()
    .references(() => T_Member.id),
  matchId: uuid('match_id').notNull()
    .references(() => T_Match.id),
  roundId: text('round_id').notNull(),
  homeScore: numeric('home_score'),  // NULL if not guessed yet
  awayScore: numeric('away_score'),  // NULL if not guessed yet
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  // Composite unique constraint: one guess per match per member
  uniqueGuess: unique().on(table.matchId, table.memberId),
}));
```

**Key Points**:
- Composite primary key: `(matchId, memberId)`
- `homeScore` and `awayScore` can be NULL (not yet guessed)
- `active` flag for soft deletes
- Timestamps for audit trail

### T_Match

**File**: `src/domains/match/schema/index.ts`

```typescript
export const T_Match = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  homeScore: numeric('home_score'),  // Actual result
  awayScore: numeric('away_score'),  // Actual result
  status: text('status'),            // 'open', 'ended', 'not-defined'
  date: timestamp('date'),           // Match start time (UTC)
  // ... other fields (teams, tournament, etc.)
});
```

**Match Status Values**:
- `'open'`: Match scheduled but not finished
- `'ended'`: Match completed, scores final
- `'not-defined'`: Match postponed/cancelled

### T_TournamentPerformance

**File**: `src/domains/performance/schema/index.ts`

```typescript
export const T_TournamentPerformance = pgTable('tournament_performance', {
  memberId: uuid('member_id').notNull()
    .references(() => T_Member.id),
  tournamentId: uuid('tournament_id').notNull()
    .references(() => T_Tournament.id),
  points: numeric('points').default('0'),  // Stored as string
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.memberId, table.tournamentId] }),
}));
```

**Key Points**:
- Composite primary key: `(memberId, tournamentId)`
- `points` stored as numeric string (e.g., "42")
- Acts as cache for expensive calculations
- Updated via PATCH endpoints or scheduled jobs

### T_LeaguePerformance

**File**: `src/domains/performance/schema/index.ts`

```typescript
export const T_LeaguePerformance = pgTable('league_performance', {
  memberId: uuid('member_id').notNull()
    .references(() => T_Member.id),
  leagueId: uuid('league_id').notNull()
    .references(() => T_League.id),
  points: numeric('points').default('0'),  // Sum of tournament points
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.memberId, table.leagueId] }),
}));
```

**Key Points**:
- Composite primary key: `(memberId, leagueId)`
- Aggregates all tournament points for member in league
- Enables fast leaderboard queries

---

## API Endpoints

### Guess Endpoints

#### Create/Update Guess
```
POST /api/v2/guesses
Body: {
  matchId: string,
  home: { score: number },
  away: { score: number }
}

Response: {
  id: string,
  matchId: string,
  home: { status: string, value: number, points: number | null },
  away: { status: string, value: number, points: number | null },
  total: number,
  status: 'waiting_for_game' | 'finalized' | ...
}
```

**Controller**: `src/domains/guess/controllers/guess-controllers.ts`

#### Get Member Guesses
```
GET /api/v2/tournaments/:tournamentId/guesses?round=X

Response: Array of analyzed guesses with points
```

### Performance Endpoints

#### Get Tournament Performance
```
GET /api/v2/tournaments/:tournamentId/performance

Response: {
  details: Array<GuessAnalysis>,  // All guesses analyzed
  points: string,                 // Cached total
  lastUpdated: Date | null
}
```

**Controller**: `src/domains/performance/controller/index.ts:27-66`

#### Update Tournament Performance
```
PATCH /api/v2/tournaments/:tournamentId/performance

Response: {
  points: number,
  updatedAt: Date
}
```

**Controller**: `src/domains/performance/controller/index.ts:152-159`

**Note**: This endpoint recalculates ALL guesses for the member in the tournament.

#### Update League Performance
```
PATCH /api/v2/leagues/:leagueId/performance

Response: {
  leaderBoard: Array<{
    memberName: string,
    points: number,
    lastUpdated: Date
  }>
}
```

**Controller**: `src/domains/league/api/index.ts:21-26`

**Note**: This is an expensive operation - updates ALL members in the league.

---

## Modifying Scoring Rules

### Scenario 1: Award Points for Exact Scores

**Current**: `POINTS_FOR_TEAM = 0` (no points for exact scores)
**Goal**: Award 1 point for each correct team score

**File**: `src/domains/guess/controllers/guess-analysis.ts`

**Change** (Line 163):
```typescript
// Before
const POINTS_FOR_TEAM = 0;

// After
const POINTS_FOR_TEAM = 1;
```

**Result**:
```
Guess:  Home 2 - Away 1
Actual: Home 2 - Away 1

New Scoring:
  home.points = 1 (exact match)
  away.points = 1 (exact match)
  matchOutcome.points = 3
  Total = 5 points
```

**Important**: This change affects ALL guesses retroactively when performance is recalculated.

### Scenario 2: Different Points for Different Outcomes

**Goal**: Award more points for predicting draws (harder to predict)

**File**: `src/domains/guess/controllers/guess-analysis.ts`

**Change** (Lines 198-225):
```typescript
const getMatchOutcome = (guess, match) => {
  // ... existing code ...

  // NEW: Dynamic points based on outcome
  let pointsForOutcome = 3;  // Default
  if (matchOutcome.label === 'DRAW') {
    pointsForOutcome = 5;  // More points for draws
  }

  return {
    label: matchOutcome.label,
    points: guessPrediction.label === matchOutcome.label
      ? pointsForOutcome  // Changed from POINTS_FOR_MATCH_OUTCOME
      : 0,
    status: guessPrediction.label === matchOutcome.label
      ? GUESS_STATUSES.CORRECT
      : GUESS_STATUSES.INCORRECT,
  };
};
```

### Scenario 3: Goal Difference Bonus

**Goal**: Award bonus points for being close to the actual goal difference

**File**: `src/domains/guess/controllers/guess-analysis.ts`

**Change** (Add new function):
```typescript
const calculateGoalDifferenceBonus = (guess, match) => {
  const guessGD = Math.abs(
    toNumberOrZero(guess.homeScore) - toNumberOrZero(guess.awayScore)
  );
  const matchGD = Math.abs(
    toNumberOrZero(match.homeScore) - toNumberOrZero(match.awayScore)
  );

  if (guessGD === matchGD) return 2;  // Exact GD match
  if (Math.abs(guessGD - matchGD) === 1) return 1;  // Off by 1
  return 0;
};
```

**Update** `generateFinalizedGuess()` (Line 183):
```typescript
const gdBonus = calculateGoalDifferenceBonus(guess, match);
const total = home.points + away.points + matchOutcome.points + gdBonus;
```

### Important Considerations

When modifying scoring:

1. **Database Impact**: Performance tables cache old scores
   - Run migration to recalculate all historical scores
   - Or accept that old scores use old rules

2. **Version the Algorithm**: Consider creating `guess-analysis-v3.ts`
   - Allows A/B testing
   - Easier rollback
   - Historical data tracking

3. **Update Tests**: Ensure all tests reflect new scoring
   - `src/domains/guess/controllers/guess-analysis.test.ts`

4. **Document Changes**: Update this guide and add ADR
   - `docs/decisions/ADR-XXX-scoring-changes.md`

---

## Adding New Features

### Feature: Member Statistics

**Goal**: Add wins/losses/draws count to performance

**Step 1**: Update Performance Schema

**File**: `src/domains/performance/schema/index.ts`

```typescript
export const T_TournamentPerformance = pgTable('tournament_performance', {
  memberId: uuid('member_id').notNull(),
  tournamentId: uuid('tournament_id').notNull(),
  points: numeric('points').default('0'),

  // NEW FIELDS
  correctPredictions: integer('correct_predictions').default(0),
  incorrectPredictions: integer('incorrect_predictions').default(0),
  totalGuesses: integer('total_guesses').default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, ...);
```

**Step 2**: Create Migration

```bash
yarn db:generate
# Edit the migration file to add columns
yarn db:migrate
```

**Step 3**: Update Performance Calculation

**File**: `src/domains/performance/services/index.ts`

```typescript
const updateMemberPerformance = async (memberId, tournamentId) => {
  const guesses = await QUERIES_GUESS.selectMemberGuessesForTournament(
    memberId,
    tournamentId
  );
  const parsedGuesses = SERVICES_GUESS_V2.runGuessAnalysis_V2(guesses);
  const points = SERVICES_GUESS_V2.getTotalPointsFromTournamentGuesses(
    parsedGuesses
  );

  // NEW: Calculate statistics
  const stats = parsedGuesses.reduce((acc, guess) => {
    if (guess.status === 'finalized') {
      acc.totalGuesses++;
      if (guess.fullMatch.status === 'correct') {
        acc.correctPredictions++;
      } else {
        acc.incorrectPredictions++;
      }
    }
    return acc;
  }, { correctPredictions: 0, incorrectPredictions: 0, totalGuesses: 0 });

  // Update with new fields
  const updatedPerformance = await QUERIES_PERFORMANCE.tournament
    .updatePerformance(points, memberId, tournamentId, stats);

  return parsePerformance(updatedPerformance);
};
```

**Step 4**: Update Query

**File**: `src/domains/performance/queries/index.ts`

```typescript
const updatePerformance = async (
  points: number,
  memberId: string,
  tournamentId: string,
  stats?: { correctPredictions: number, incorrectPredictions: number, totalGuesses: number }
) => {
  const [result] = await db
    .update(T_TournamentPerformance)
    .set({
      points: points.toString(),
      ...(stats && {
        correctPredictions: stats.correctPredictions,
        incorrectPredictions: stats.incorrectPredictions,
        totalGuesses: stats.totalGuesses,
      }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(T_TournamentPerformance.memberId, memberId),
        eq(T_TournamentPerformance.tournamentId, tournamentId)
      )
    )
    .returning();

  return result;
};
```

**Step 5**: Add Tests

```typescript
describe('Performance Statistics', () => {
  it('should calculate correct predictions count', async () => {
    // Test implementation
  });

  it('should calculate win percentage', async () => {
    // Test implementation
  });
});
```

### Feature: Streak Tracking

**Goal**: Track consecutive correct predictions

**Implementation**: Similar pattern as above, but add:
- `currentStreak: integer`
- `longestStreak: integer`
- Logic to calculate streaks from ordered guesses

---

## Testing

### Unit Tests

**File**: `src/domains/guess/controllers/guess-analysis.test.ts`

**Test Categories**:

1. **Guess Status Tests**
```typescript
describe('Guess Status Determination', () => {
  it('should return PAUSED for postponed matches', () => {
    const guess = createMockGuess({ homeScore: 2, awayScore: 1 });
    const match = createMockMatch({ status: 'not-defined' });

    const result = runGuessAnalysis(guess, match);

    expect(result.status).toBe('paused');
    expect(result.total).toBe(0);
  });

  it('should return EXPIRED for late guesses', () => {
    const guess = createMockGuess({ homeScore: null, awayScore: null });
    const match = createMockMatch({
      status: 'open',
      date: dayjs().subtract(1, 'hour').toDate()  // Match started
    });

    const result = runGuessAnalysis(guess, match);

    expect(result.status).toBe('expired');
  });
});
```

2. **Scoring Logic Tests**
```typescript
describe('Scoring Calculation', () => {
  it('should award 3 points for correct outcome', () => {
    const guess = createMockGuess({ homeScore: 2, awayScore: 1 });
    const match = createMockMatch({
      homeScore: 3,
      awayScore: 0,
      status: 'ended'
    });

    const result = runGuessAnalysis(guess, match);

    expect(result.total).toBe(3);
    expect(result.fullMatch.status).toBe('correct');
  });

  it('should award 0 points for wrong outcome', () => {
    const guess = createMockGuess({ homeScore: 2, awayScore: 1 });
    const match = createMockMatch({
      homeScore: 0,
      awayScore: 3,
      status: 'ended'
    });

    const result = runGuessAnalysis(guess, match);

    expect(result.total).toBe(0);
    expect(result.fullMatch.status).toBe('incorrect');
  });

  it('should handle draws correctly', () => {
    const guess = createMockGuess({ homeScore: 1, awayScore: 1 });
    const match = createMockMatch({
      homeScore: 2,
      awayScore: 2,
      status: 'ended'
    });

    const result = runGuessAnalysis(guess, match);

    expect(result.total).toBe(3);
    expect(result.fullMatch.label).toBe('DRAW');
  });
});
```

3. **Edge Cases**
```typescript
describe('Edge Cases', () => {
  it('should handle null scores in match', () => {
    const guess = createMockGuess({ homeScore: 2, awayScore: 1 });
    const match = createMockMatch({
      homeScore: null,
      awayScore: null,
      status: 'open'
    });

    const result = runGuessAnalysis(guess, match);

    expect(result.status).toBe('waiting_for_game');
    expect(result.total).toBe(0);
  });

  it('should treat null as 0 in finalized matches', () => {
    // Test toNumberOrZero behavior
  });
});
```

### Integration Tests

**Test Performance Update Flow**:

```typescript
describe('Performance Update Integration', () => {
  it('should update tournament performance correctly', async () => {
    // 1. Setup test data
    const member = await createTestMember();
    const tournament = await createTestTournament();
    const matches = await createTestMatches(tournament.id, 5);

    // 2. Create guesses
    await createTestGuesses(member.id, matches, [
      { home: 2, away: 1 },  // Correct
      { home: 1, away: 2 },  // Correct
      { home: 0, away: 0 },  // Wrong
      { home: 3, away: 1 },  // Correct
      { home: 2, away: 2 },  // Wrong
    ]);

    // 3. Update match results
    await updateMatchResults(matches, [
      { home: 3, away: 0 },  // HOME_WIN
      { home: 0, away: 1 },  // AWAY_WIN
      { home: 2, away: 1 },  // HOME_WIN (guessed DRAW)
      { home: 4, away: 0 },  // HOME_WIN
      { home: 1, away: 1 },  // DRAW (guessed DRAW but different scores)
    ]);

    // 4. Trigger performance update
    const result = await updateMemberPerformance(member.id, tournament.id);

    // 5. Assertions
    expect(result.points).toBe(12);  // 4 correct × 3 points
  });
});
```

### Manual Testing

**Test Script**:

```bash
# 1. Create test member and league
curl -X POST http://localhost:9090/api/v2/members \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "nickName": "TestUser"}'

# 2. Create guesses
curl -X POST http://localhost:9090/api/v2/guesses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "matchId": "MATCH_UUID",
    "home": { "score": 2 },
    "away": { "score": 1 }
  }'

# 3. Update match result (admin endpoint)
curl -X PATCH http://localhost:9090/api/v2/matches/MATCH_UUID \
  -H "Content-Type: application/json" \
  -d '{
    "homeScore": 3,
    "awayScore": 0,
    "status": "ended"
  }'

# 4. Recalculate performance
curl -X PATCH http://localhost:9090/api/v2/tournaments/TOURNAMENT_UUID/performance \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Check leaderboard
curl http://localhost:9090/api/v2/leagues/LEAGUE_UUID/performance
```

---

## Debugging

### Common Issues

#### Issue 1: Points Not Updating

**Symptoms**:
- Match ended but member still shows 0 points
- Guess status stuck at 'waiting_for_game'

**Diagnosis**:
```typescript
// Check match status
SELECT id, status, "homeScore", "awayScore"
FROM matches
WHERE id = 'MATCH_UUID';

// Check guess
SELECT * FROM guesses
WHERE "matchId" = 'MATCH_UUID'
  AND "memberId" = 'MEMBER_UUID';

// Check performance cache
SELECT * FROM tournament_performance
WHERE "memberId" = 'MEMBER_UUID'
  AND "tournamentId" = 'TOURNAMENT_UUID';
```

**Solution**:
1. Verify match status is 'ended'
2. Trigger performance update manually:
   ```bash
   curl -X PATCH /api/v2/tournaments/TOURNAMENT_UUID/performance
   ```

#### Issue 2: Incorrect Score Calculation

**Symptoms**: Points don't match expected values

**Debug Steps**:

1. **Enable console logging** (Lines 215-218):
   ```typescript
   console.log(
     { homeGuess, homeMatch, awayGuess, awayMatch, matchOutcome, guessPrediction },
     guessPrediction.label === matchOutcome.label
       ? GUESS_STATUSES.CORRECT
       : GUESS_STATUSES.INCORRECT
   );
   ```

2. **Check logs**:
   ```bash
   yarn dev:logs
   ```

3. **Verify outcome logic**:
   - HOME_WIN: homeScore > awayScore
   - AWAY_WIN: homeScore < awayScore
   - DRAW: homeScore === awayScore

4. **Check null handling**:
   - `toNumberOrZero()` converts null → 0
   - `toNumberOrNull()` preserves null

#### Issue 3: Performance Update Timeout

**Symptoms**: League performance update takes too long or times out

**Cause**: Updating all members in a large league is expensive

**Solutions**:

1. **Add pagination** (for very large leagues)
2. **Use background jobs** (implement queue system)
3. **Optimize queries** (add indexes)

**Temporary Fix**:
```typescript
// Process members in batches
const BATCH_SIZE = 10;
for (let i = 0; i < leagueMembers.length; i += BATCH_SIZE) {
  const batch = leagueMembers.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(member =>
    updateTournamentsForMember(member.memberId, leagueTournaments)
  ));
}
```

### Debugging Tools

#### 1. Drizzle Studio
```bash
yarn db:studio
```
- Visual database browser
- Query editor
- Real-time data inspection

#### 2. Custom Debug Endpoint

**Add to**: `src/domains/performance/api/debug.ts`

```typescript
export const debugGuessAnalysis = async (req, res) => {
  const { guessId } = req.params;

  const guess = await QUERIES_GUESS.getGuessById(guessId);
  const match = await QUERIES_MATCH.getMatchById(guess.matchId);

  const analysis = runGuessAnalysis(guess, match);

  res.json({
    guess: {
      id: guess.id,
      homeScore: guess.homeScore,
      awayScore: guess.awayScore,
    },
    match: {
      id: match.id,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      date: match.date,
    },
    analysis,
    debug: {
      guessPrediction: getOutcomeLabel(guess),
      matchOutcome: getOutcomeLabel(match),
      pointsBreakdown: {
        home: analysis.home.points,
        away: analysis.away.points,
        outcome: analysis.fullMatch.points,
        total: analysis.total,
      },
    },
  });
};
```

#### 3. SQL Debugging Queries

**Get member's full performance details**:
```sql
SELECT
  m.id as member_id,
  m."nickName",
  t.label as tournament,
  COUNT(g.id) as total_guesses,
  COUNT(CASE WHEN ma.status = 'ended' THEN 1 END) as finalized_guesses,
  tp.points as cached_points
FROM members m
LEFT JOIN guesses g ON g."memberId" = m.id
LEFT JOIN matches ma ON ma.id = g."matchId"
LEFT JOIN tournaments t ON t.id = ma."tournamentId"
LEFT JOIN tournament_performance tp ON tp."memberId" = m.id AND tp."tournamentId" = t.id
WHERE m.id = 'MEMBER_UUID'
GROUP BY m.id, m."nickName", t.label, tp.points;
```

**Find discrepancies between cached and calculated points**:
```sql
WITH calculated AS (
  SELECT
    "memberId",
    "tournamentId",
    COUNT(*) * 3 as theoretical_max  -- If all guesses correct
  FROM guesses g
  JOIN matches m ON m.id = g."matchId"
  WHERE m.status = 'ended'
  GROUP BY "memberId", "tournamentId"
)
SELECT
  c."memberId",
  c."tournamentId",
  c.theoretical_max,
  tp.points as cached_points,
  (c.theoretical_max - CAST(tp.points AS INTEGER)) as max_possible_difference
FROM calculated c
JOIN tournament_performance tp ON tp."memberId" = c."memberId"
  AND tp."tournamentId" = c."tournamentId"
WHERE CAST(tp.points AS INTEGER) > c.theoretical_max;  -- Should never happen!
```

---

## Performance Considerations

### Database Indexing

**Current Indexes** (check migrations):

```sql
-- Composite indexes for common queries
CREATE INDEX idx_guesses_member_tournament
ON guesses ("memberId", "tournamentId");

CREATE INDEX idx_guesses_match
ON guesses ("matchId");

CREATE INDEX idx_matches_tournament_status
ON matches ("tournamentId", status);

CREATE INDEX idx_performance_member
ON tournament_performance ("memberId");

CREATE INDEX idx_performance_tournament
ON tournament_performance ("tournamentId");
```

**If Missing**, create via migration:

```bash
yarn db:generate
```

```sql
-- In generated migration file
CREATE INDEX IF NOT EXISTS idx_guesses_member_tournament
ON guesses ("memberId", "tournamentId");
```

### Query Optimization

**Inefficient** (N+1 queries):
```typescript
// BAD: Loops and individual queries
const guesses = await getGuesses(memberId, tournamentId);
for (const guess of guesses) {
  const match = await getMatch(guess.matchId);  // N queries!
  const analysis = runGuessAnalysis(guess, match);
}
```

**Efficient** (JOIN in single query):
```typescript
// GOOD: Single query with join
const guessesWithMatches = await db
  .select()
  .from(T_Guess)
  .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
  .where(
    and(
      eq(T_Guess.memberId, memberId),
      eq(T_Match.tournamentId, tournamentId)
    )
  );
```

**Example**: `src/domains/guess/queries/index.ts`

```typescript
export const selectMemberGuessesForTournament = async (
  tournamentId: string,
  memberId: string
) => {
  return db
    .select({
      guess: T_Guess,
      match: T_Match,
    })
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(
      and(
        eq(T_Guess.memberId, memberId),
        eq(T_Match.tournamentId, tournamentId)
      )
    );
};
```

### Caching Strategy

**Current Approach**: Database caching in performance tables

**Pros**:
- Fast leaderboard queries
- Reduces computation on reads
- Persistent across restarts

**Cons**:
- Stale data if not updated
- Manual update required
- Storage overhead

**Potential Improvements**:

1. **Add Redis Cache** (for high-traffic scenarios):
```typescript
// Pseudo-code
const getCachedPerformance = async (memberId, tournamentId) => {
  const cacheKey = `perf:${memberId}:${tournamentId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Calculate and cache
  const performance = await calculatePerformance(memberId, tournamentId);
  await redis.setex(cacheKey, 3600, JSON.stringify(performance));  // 1 hour

  return performance;
};
```

2. **Event-Driven Updates** (update cache when matches end):
```typescript
// When match status changes to 'ended'
eventBus.emit('match:ended', { matchId });

// Listener
eventBus.on('match:ended', async ({ matchId }) => {
  const affectedGuesses = await getGuessesByMatch(matchId);

  for (const guess of affectedGuesses) {
    await updateMemberPerformance(guess.memberId, guess.tournamentId);
    // Invalidate cache
    await redis.del(`perf:${guess.memberId}:${guess.tournamentId}`);
  }
});
```

### Batch Processing

For bulk updates (e.g., league performance):

```typescript
// Use transactions for atomicity
await db.transaction(async (tx) => {
  for (const member of members) {
    await tx.update(T_LeaguePerformance)
      .set({ points: member.calculatedPoints })
      .where(
        and(
          eq(T_LeaguePerformance.memberId, member.id),
          eq(T_LeaguePerformance.leagueId, leagueId)
        )
      );
  }
});
```

---

## Common Pitfalls

### 1. Forgetting to Update Performance Tables

**Problem**: Match results updated, but member points still show old values

**Cause**: Performance tables are cached, not auto-updated

**Solution**: Always trigger performance update after match updates:
```typescript
// After updating match
await updateMatchScores(matchId, homeScore, awayScore);

// Trigger performance recalculation
await updateAffectedPerformances(matchId);
```

### 2. NULL vs 0 Confusion

**Problem**: Different behavior for `null` and `0` scores

**Code**:
```typescript
toNumberOrNull(null)  // → null
toNumberOrNull(0)     // → 0
toNumberOrZero(null)  // → 0
toNumberOrZero(0)     // → 0
```

**Impact**:
- In `generateFinalizedGuess()`: Uses `toNumberOrNull()` for exact score comparison
- In `getMatchOutcome()`: Uses `toNumberOrZero()` for outcome determination

**Example**:
```typescript
guess.homeScore = 0
match.homeScore = null

toNumberOrNull(0) === toNumberOrNull(null)  // false (0 !== null)
toNumberOrZero(0) === toNumberOrZero(null)  // true (0 === 0)
```

**Best Practice**: Always check match status before analysis
```typescript
if (match.status !== 'ended') {
  // Don't calculate points yet
  return generateWaitingForGameGuess(guess, match);
}
```

### 3. Time Zone Issues

**Problem**: Match date checks fail due to UTC vs local time

**Code** (Lines 14):
```typescript
const hasLostTimewindowToGuess = dayjs()
  .utc()  // ← Important!
  .isSameOrAfter(dayjs.utc(match.date).toDate());
```

**Best Practice**: Always use UTC for comparisons:
```typescript
// CORRECT
dayjs().utc().isSameOrAfter(dayjs.utc(match.date))

// WRONG
dayjs().isSameOrAfter(dayjs(match.date))  // Local time!
```

### 4. Concurrent Updates Race Condition

**Problem**: Multiple simultaneous performance updates overwrite each other

**Scenario**:
```
Time 0: User A triggers update → reads points = 10
Time 1: User B triggers update → reads points = 10
Time 2: User A writes points = 12
Time 3: User B writes points = 15 (overwrites A's update)
Result: Points = 15 (should be cumulative if separate tournaments)
```

**Solution**: Use database transactions and row-level locking:
```typescript
await db.transaction(async (tx) => {
  const [current] = await tx
    .select()
    .from(T_TournamentPerformance)
    .where(
      and(
        eq(T_TournamentPerformance.memberId, memberId),
        eq(T_TournamentPerformance.tournamentId, tournamentId)
      )
    )
    .for('update');  // Row-level lock

  // Calculate new points
  const newPoints = calculatePoints(guesses);

  // Update
  await tx.update(T_TournamentPerformance)
    .set({ points: newPoints.toString() })
    .where(...);
});
```

### 5. String vs Number in Points

**Problem**: Points stored as `numeric` (string) in database

**Code**:
```typescript
// Database stores: "42"
const performance = await getPerformance(memberId, tournamentId);
console.log(performance.points);  // "42" (string!)

// Calculations fail
const total = performance.points + 10;  // "4210" (string concatenation!)
```

**Solution**: Always parse before math operations:
```typescript
const points = parseInt(performance.points ?? '0');
const total = points + 10;  // 52 ✓
```

**Helper** (from `src/domains/performance/services/index.ts:83-90`):
```typescript
const parsePerformance = (performance) => {
  return {
    ...performance,
    points: parseInt(performance?.points ?? '0'),
  };
};
```

### 6. Not Handling Missing Performance Records

**Problem**: First guess by member doesn't have performance record yet

**Code**:
```typescript
// This might return undefined!
const performance = await QUERIES_PERFORMANCE.tournament.getPerformance(
  memberId,
  tournamentId
);

console.log(performance.points);  // TypeError: Cannot read property 'points' of undefined
```

**Solution**: Use upsert or safe defaults:
```typescript
const performance = await getPerformance(memberId, tournamentId);
const points = performance?.points ?? '0';  // Safe default
```

**Better**: Use database upsert (ON CONFLICT):
```sql
INSERT INTO tournament_performance ("memberId", "tournamentId", points)
VALUES ($1, $2, $3)
ON CONFLICT ("memberId", "tournamentId")
DO UPDATE SET points = EXCLUDED.points, "updatedAt" = NOW();
```

---

## Quick Reference

### Key Files

| Component | File Path | Lines |
|-----------|-----------|-------|
| Scoring Algorithm | `src/domains/guess/controllers/guess-analysis.ts` | 156-225 |
| Match Outcome Logic | `src/domains/guess/controllers/guess-analysis.ts` | 198-225 |
| Performance Calculation | `src/domains/performance/services/index.ts` | 20-25, 73-81 |
| League Performance Update | `src/domains/performance/services/index.ts` | 113-166 |
| Guess Schema | `src/domains/guess/schema/index.ts` | Full file |
| Performance Schema | `src/domains/performance/schema/index.ts` | Full file |
| Guess Status Types | `src/domains/guess/typing.ts` | 21-29 |

### Constants

| Constant | Value | Location |
|----------|-------|----------|
| POINTS_FOR_TEAM | 0 | `guess-analysis.ts:163` |
| POINTS_FOR_MATCH_OUTCOME | 3 | `guess-analysis.ts:199` |
| POINTS_FOR_MISS | 0 | `guess-analysis.ts:164` |

### Guess Statuses

| Status | Meaning | Points |
|--------|---------|--------|
| `paused` | Match postponed | 0 |
| `not-started` | No guess yet | 0 |
| `expired` | Missed deadline | 0 |
| `waiting_for_game` | Guess submitted, match pending | 0 |
| `finalized` | Match ended | 0-3 |
| `correct` | Component correct | Varies |
| `incorrect` | Component incorrect | 0 |

### Useful Commands

```bash
# View real-time API logs
yarn dev:logs

# Open database GUI
yarn db:studio

# Run specific test
yarn test src/domains/guess/controllers/guess-analysis.test.ts

# Type check
yarn compile

# Generate migration
yarn db:generate

# Apply migration
yarn db:migrate
```

---

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Database Migrations Guide](./database-migrations.md)
- [AWS Lambda Deployment](./aws-lambda-deployment.md)
- [Data Provider Best Practices](./data-provider-best-practices.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-07 | Initial guide creation | Engineering Team |

---

**For Questions or Updates**: Please create an issue or submit a PR to update this guide.
