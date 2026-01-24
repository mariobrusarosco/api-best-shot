# Scoreboard System Design - Requirements & Analysis

This document tracks the requirements, constraints, and open questions for the new Scoreboard feature.

## 1. Core Requirements Analysis

### 1.1 Update Frequency ("Liveness")

**Question:** Do scores update instantly after a goal (Live) or only after the match ends (Eventual)?

- **Implication:** "Live" requires high-throughput write architecture. "Post-Match" allows for background processing.
- **Status:**
  [ANSWER]
  Scores update only after a match ends. We already have the "scheduler" feature in place. YOU MUST TAKE A LOOK AT IT, TO UNDERSTAND HOW IT WORKS.

### 1.2 Infrastructure Constraints

**Question:** Are we limited to PostgreSQL, or can we introduce Redis (Sorted Sets)?

- **Implication:** Redis is industry-standard for leaderboards (O(log(N)) rank retrieval). PostgreSQL requires careful indexing and potentially denormalization for scale.
- **Status:**

[ANSWER]
We definitely can introduce more infrastructure for this. We can use Redis for this for instance.

### 1.3 Rank Precision

**Question:** Does a user ranked #12,405 need to see "Rank: #12,405", or is "Outside Top 100" acceptable?

- **Implication:** Exact counts for low-rank users are expensive (`COUNT(*)`). Approximations or tiers save significant DB load.
- **Status:**
  [ANSWER]
  Yes. And we can constrain the number of users of a league. To 10000 user max.

### 1.4 Scale & Cardinality

**Question:** What are the target metrics?

- Max Global Users: No Global users
- Max Users in Private League: 10000
- Max Users in Global League: No Global League
- **Implication:** Affects the choice between "On-Read" calculation vs. "Pre-Calculation".

### 1.5 Feature Scope: Rank Movement

**Question:** Do we need to display movement (e.g., "▲ 3 places")?

- **Implication:** Requires storing historical snapshots or previous states. "On-Read" calculation makes this nearly impossible to do efficiently.
- **Status:** Yes we do

## 2. Technical Doubts & Risks

- **Write Amplification:** If a user is in 5 leagues, one match result triggers 5 updates.

[ANSWER] it would be nice if we could design the system in a way we calculate the rank of a user on a tournament. What are your thoughts?

- **Pagination Performance:** Deep pagination (`OFFSET 5000`) in SQL is slow.
- **Concurrency:** Handling score updates while users are actively reading the board.

## 3. Decisions Log

- _No final decisions made yet._
