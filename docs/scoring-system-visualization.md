# Best Shot - User Scoring System

## Overview
Users earn points by predicting football match outcomes. The current system awards **3 points for correct match outcome** (Win/Draw/Loss).

---

## Scoring Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER MAKES A GUESS                         │
│                   (Home Score, Away Score)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   Guess Status: NOT_STARTED  │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ Guess Status: WAITING_FOR_   │
          │         GAME_TO_START        │
          └──────────────┬───────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   MATCH IS PLAYED      │
            │  (Actual scores set)   │
            └────────────┬───────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │  Guess Status: FINALIZED     │
          │   (Points calculated)        │
          └──────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │      SCORING CALCULATION           │
        │                                    │
        │  Step 1: Check Home Score Match    │
        │  → Currently: 0 points (any)       │
        │                                    │
        │  Step 2: Check Away Score Match    │
        │  → Currently: 0 points (any)       │
        │                                    │
        │  Step 3: Check Match Outcome       │
        │  → 3 points if correct             │
        │  → 0 points if wrong               │
        │                                    │
        │  Total = 0 + 0 + (0 or 3)          │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   UPDATE PERFORMANCE TABLES        │
        │                                    │
        │  • T_TournamentPerformance         │
        │    (sum of all match points)       │
        │                                    │
        │  • T_LeaguePerformance             │
        │    (sum of all tournaments)        │
        └────────────────────────────────────┘
```

---

## Match Outcome Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATCH OUTCOME DETECTION                      │
└─────────────────────────────────────────────────────────────────┘

User Guess          Actual Result       Outcome Match?    Points
─────────────────────────────────────────────────────────────────
Home > Away    VS   Home > Away         HOME WIN ✓         3
Home > Away    VS   Home < Away         Different ✗        0
Home > Away    VS   Home = Away         Different ✗        0

Home < Away    VS   Home < Away         AWAY WIN ✓         3
Home < Away    VS   Home > Away         Different ✗        0
Home < Away    VS   Home = Away         Different ✗        0

Home = Away    VS   Home = Away         DRAW ✓             3
Home = Away    VS   Home > Away         Different ✗        0
Home = Away    VS   Home < Away         Different ✗        0
```

---

## Scoring Examples

### Example 1: Correct Outcome (Wrong Score)
```
User Prediction:  2-1 (Home Win)
Actual Result:    3-0 (Home Win)

Calculation:
├─ Home Score Match: 2 ≠ 3  → 0 points
├─ Away Score Match: 1 ≠ 0  → 0 points
└─ Outcome Match: WIN = WIN → 3 points

TOTAL: 3 points ✓
```

### Example 2: Exact Score Match
```
User Prediction:  2-1 (Home Win)
Actual Result:    2-1 (Home Win)

Calculation:
├─ Home Score Match: 2 = 2  → 0 points
├─ Away Score Match: 1 = 1  → 0 points
└─ Outcome Match: WIN = WIN → 3 points

TOTAL: 3 points ✓
(Note: Even exact scores only award outcome points currently)
```

### Example 3: Wrong Outcome
```
User Prediction:  2-1 (Home Win)
Actual Result:    0-3 (Away Win)

Calculation:
├─ Home Score Match: 2 ≠ 0  → 0 points
├─ Away Score Match: 1 ≠ 3  → 0 points
└─ Outcome Match: WIN ≠ LOSS → 0 points

TOTAL: 0 points ✗
```

### Example 4: Predicted Draw (Correct)
```
User Prediction:  1-1 (Draw)
Actual Result:    2-2 (Draw)

Calculation:
├─ Home Score Match: 1 ≠ 2  → 0 points
├─ Away Score Match: 1 ≠ 2  → 0 points
└─ Outcome Match: DRAW = DRAW → 3 points

TOTAL: 3 points ✓
```

---

## Points Distribution Table

| Prediction Component       | Correct | Incorrect |
|---------------------------|---------|-----------|
| Home Score                | 0 pts   | 0 pts     |
| Away Score                | 0 pts   | 0 pts     |
| Match Outcome (W/D/L)     | **3 pts**   | 0 pts     |
| **Maximum per Match**     | **3 pts**   | -         |

---

## Performance Tracking

### Tournament Performance
```
┌────────────────────────────────────────────────┐
│        T_TournamentPerformance Table           │
├────────────────────────────────────────────────┤
│  memberId  │  tournamentId  │  points         │
├────────────────────────────────────────────────┤
│  user_123  │  euro_2024     │  45             │
│  user_123  │  copa_2024     │  33             │
│  user_456  │  euro_2024     │  51             │
└────────────────────────────────────────────────┘

Points = Σ(all finalized match guesses in tournament)
```

### League Performance
```
┌────────────────────────────────────────────────┐
│         T_LeaguePerformance Table              │
├────────────────────────────────────────────────┤
│  memberId  │  leagueId      │  points         │
├────────────────────────────────────────────────┤
│  user_123  │  league_001    │  78             │
│  user_456  │  league_001    │  51             │
└────────────────────────────────────────────────┘

Points = Σ(all tournament performances in league)
Example: 78 = 45 (euro_2024) + 33 (copa_2024)
```

---

## Guess Status Lifecycle

```
NOT_STARTED
    │
    │  (Match scheduled)
    ▼
WAITING_FOR_GAME
    │
    │  (Match completed & finalized)
    ├─────────────────┐
    │                 │
    ▼                 ▼
FINALIZED         PAUSED
(Points awarded)  (Match status: not-defined)


EXPIRED
(User didn't guess before match started)
```

---

## Key Implementation Files

### Scoring Logic
- `src/domains/guess/controllers/guess-analysis.ts:163-164,199,230`
- `src/domains/guess/services/guess-analysis-v2.ts:171-172,207,230`
- `src/domains/guess/services/get-total-points-from-tournament-guesses.ts`

### Database Schema
- `src/domains/guess/schema/index.ts` - T_Guess table
- `src/domains/performance/schema/index.ts` - Performance tables
- `src/domains/match/schema/index.ts` - T_Match table

### Performance Updates
- `src/domains/performance/controller/index.ts`
- `src/domains/performance/database/index.ts`

---

## Summary

**Current System:**
- Simple outcome-based scoring (3 points for W/D/L prediction)
- No reward for exact score predictions
- Cumulative points tracked per tournament and league
- Maximum: 3 points per match

**Potential Enhancements:**
- Add points for exact score matches (e.g., +5 bonus)
- Add points for correct individual scores (e.g., +1 each)
- This would make max points per match: 10 (3 outcome + 1 home + 1 away + 5 exact bonus)
