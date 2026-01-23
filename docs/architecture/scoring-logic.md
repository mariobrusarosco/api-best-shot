# Best Shot API - Scoring Logic (runGuessAnalysis)

This document explains how the system analyzes a member's guess against a real-world match result to calculate status and points.

## 1. Guess State Determination
Before calculating points, the system identifies the life-cycle state of the guess.

```text
┌─────────────────────────────────────────────────────────────┐
│                   runGuessAnalysis(guess, match)            │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
   Check: Is Match Status 'not-defined'?  ──► [ PAUSED ]
               │
               ▼
   Check: Are Guesses NULL & Match Started? ──► [ EXPIRED ]
               │
               ▼
   Check: Are Guesses NULL & Match Open? ──► [ NOT_STARTED ]
               │
               ▼
   Check: Are Guesses SET & Match Open? ──► [ WAITING_FOR_GAME ]
               │
               ▼
   Otherwise (Match Finished/Live) ─────────► [ FINALIZED ]
```

## 2. Finalized Guess Calculation
When a match is in progress or finished, the system calculates the actual score.

```text
┌─────────────────────────────────────────────────────────────┐
│                  generateFinalizedGuess()                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Check Individual Team Scores:                           │
│     - Guess Home == Match Home? ──► (CORRECT / 0 pts)       │
│     - Guess Away == Match Away? ──► (CORRECT / 0 pts)       │
│                                                             │
│  2. Calculate Match Outcome:                                │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Determine Prediction: [Home Win | Away Win | Draw]│   │
│     │ Determine Reality:    [Home Win | Away Win | Draw]│   │
│     └───────────────────────────┬───────────────────────┘   │
│                                 │                           │
│               Match? ───────────┴─────► [ YES: 3 points ]   │
│                                       └─────► [ NO:  0 points ]   │
│                                                             │
│  3. Sum Totals:                                             │
│     - Home Points (0) + Away Points (0) + Outcome (3/0)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 3. Scoring Rules Summary

| Component | Logic | Points |
| :--- | :--- | :--- |
| **Match Outcome** | Correctly predicting Win/Loss/Draw | **3** |
| **Exact Home Score** | Home score matches exactly | **0** |
| **Exact Away Score** | Away score matches exactly | **0** |
| **Missing Guess** | Match started without user input | **0** |

## 4. Key Implementation Details
- **Dynamic Calculation**: Points are never saved to the database; they are re-calculated every time the UI requests the score.
- **Outcome Mapping**:
    - `homeScore > awayScore` => `HOME_WIN`
    - `homeScore < awayScore` => `AWAY_WIN`
    - `homeScore == awayScore` => `DRAW`
- **Normalization**: All inputs are passed through `toNumberOrZero` or `toNumberOrNull` to ensure clean comparisons between database strings/numbers.

---

## 5. Critical Analysis & Recommendations (Footnote)

The current scoring logic is technically robust but follows a basic "Outcome-Only" model. Below are areas for potential gameplay enhancement:

### 1. The "Exact Score" Reward
Currently, `POINTS_FOR_TEAM` is hardcoded to **0**. This means predicting a perfect **3-0** result yields the same 3 points as a sloppy **1-0** prediction (as long as the outcome is a win).
*   **Recommendation**: Implement a bonus for exact scores (e.g., +2 points) to reward high-precision predictions.

### 2. Goal Difference / Margin Logic
There is currently no logic to reward users who guess the correct "margin" (e.g., guessing **2-0** when the result is **3-1**). Both are two-goal victories.
*   **Recommendation**: Add a partial bonus for correct goal difference even if the exact score is missed.

### 3. Rule Flexibility
Scoring constants (like the 3 points for outcome) are hardcoded within the service logic. This prevents the system from supporting different scoring rules for different leagues.
*   **Recommendation**: Move scoring constants to a configuration file or a database table linked to the Tournament/League to allow for customized competitive rules.
