# Data Pipeline Architecture - Discussion Tracker

## Purpose
This document tracks our architectural discussion about the new data pipeline. We'll address each topic one at a time, documenting decisions as we go.

---

## Discussion Topics

### ✅ Completed

**Topic 1: Lambda Removal Context**
- Removed because: Too complex for simple HTTP calls
- Platform: Railway

**Topic 2: Background Worker Strategy**
- **Decision**: Periodic check (Option B)
- **Scale targets**: 10,000 active users, 20 tournaments/league max
- **Goal**: Build for enterprise scale, learn scalable patterns

**Topic 3: Infrastructure - Budget & Cost Constraints**
- **CRITICAL CONSTRAINT**: $10/month MAX for ALL infrastructure
- **Preference**: Free or pay-as-you-go
- **Decision**: ✅ Use pg-boss (PostgreSQL-based queue)
- **Cost**: $0 extra (uses existing database)
- **Migration path**: Build abstraction layer → easy switch to Redis later (~2 hours)
- **Why**: Fits budget, teaches queue patterns, handles 10k users scale

**Topic 4: Match Update Strategy**
- **Decision**: ✅ Polling approach (not individual scheduled jobs)
- **Frequency**: 10 minutes initially (can optimize to 5 min later if needed)
- **Why chosen**: Simpler, self-healing, cost-effective, maintainable
- **Schema change needed**: Add `last_checked_at` column to matches table
- **UI Decision**: Drop "Scheduled Jobs" page - not needed with polling (can query matches dynamically if needed)

**Topic 5: Error Handling & Retry Strategy**
- **Decision**: ✅ Add immediate retries with exponential backoff
- **Retry logic**: 3 attempts per round (30s, 60s, 120s delays)
- **After retries fail**: Log to Sentry, mark round as failed, continue to next round
- **Polling as backup**: Failed rounds will be retried on next poll (10 min later)
- **Why**: Web scraping is flaky, immediate retries catch 90% of transient network issues

---

**Topic 6: Database Schema Changes**
- **Decision**: ✅ Two schema changes needed
- **Match table**: Add `last_checked_at TIMESTAMP` column
- **League tournament table**: Add `participants_scores_status TEXT` with check constraint
- **Polling query logic**:
  - Find matches with status='open' AND started 2+ hours ago AND (never checked OR last checked 10+ min ago)
  - NOT querying all matches - only ones needing attention
  - Updates `last_checked_at` after each scrape attempt
  - When match ends, status changes to 'ended' → stops being polled

---

**Topic 7: Front-End Integration**
- **Decision**: ✅ Option C - Fetch status once on page load
- **No real-time updates**: User refreshes page to see updated status
- **API needed**: GET `/api/leagues/:id` should include `participants_scores_status` field
- **Why**: Simplest approach, no WebSocket infrastructure, fits budget
- **User experience**: Status shows "syncing" → user refreshes after a minute → sees "up-to-date"

---

### ✅ Planning Complete!

---

### ⏳ Pending Topics

~~All topics discussed!~~

---

## Summary: What We're Building

### Architecture
- **Platform**: Railway with built-in Cron Jobs
- **Job Queue**: pg-boss (PostgreSQL-based, $0 cost)
- **Abstraction Layer**: Queue interface for easy migration to Redis later
- **Budget**: Stays within $10/month constraint

### Two Polling Cron Jobs

**Cron 1: Match Updates (Every 10 minutes)**
- Finds matches: status='open', started 2+ hours ago, not checked in 10 min
- Scrapes SofaScore data
- Retries: 3x with backoff (30s, 60s, 120s)
- Updates `last_checked_at` timestamp
- When match finishes: changes status to 'ended', marks leagues as "outdata"

**Cron 2: Score Calculation (Every 5 minutes)**
- Finds leagues with `participants_scores_status = 'outdata'`
- Marks them as "syncing"
- Calculates user scores for that league
- Updates to "up-to-date"

### Database Changes
1. `match.last_checked_at TIMESTAMP` - Track polling
2. `league_tournament.participants_scores_status TEXT` - Track recalculation state

### Front-End
- Fetch status on page load
- User refreshes to see updates
- No WebSockets needed

---

### Old Pending Topics (For Reference)

#### Topic 2: Background Worker Strategy
**Question**: After marking a league as "outdata", what should trigger the score calculation?

**Options to discuss**:
- Immediate calculation when marked
- Periodic polling (cron job checks for "outdata" leagues)
- On-demand when user accesses front-end
- Other approaches

---

#### Topic 3: Infrastructure Constraints
**Question**: What infrastructure are we working with and what are the constraints?

**Points to clarify**:
- Current hosting platform (Railway? AWS? Self-hosted?)
- Budget constraints
- Preference for managed vs self-hosted services
- Willingness to add new infrastructure (Redis, queues, etc.)

---

#### Topic 4: Match Update Timing
**Question**: How should we calculate when to update match data?

**Points to discuss**:
- The "3+ hours" assumption - is this fixed or flexible?
- Different match types (regular season vs knockout)
- Extra time and penalties handling
- Data provider latency buffer
- Trade-off: accuracy vs complexity

---

#### Topic 5: Scale & Performance Requirements
**Question**: What scale are we designing for?

**Metrics to clarify**:
- Matches per day (typical and peak)
- Number of leagues
- Users per league (average and max)
- Score calculation time sensitivity (5min? 30min? 1hr acceptable?)
- Concurrent users expected

---

#### Topic 6: Error Handling & Reliability
**Question**: How should the system handle failures?

**Scenarios to consider**:
- Match data scraping fails
- Score calculation fails mid-process
- Multiple simultaneous updates to same league
- Data provider (SofaScore) is down
- Recovery strategies

---

#### Topic 7: Front-End Integration
**Question**: How should the front-end get real-time status updates?

**Options to discuss**:
- Polling (client checks status every X seconds)
- WebSockets (server pushes updates)
- Server-Sent Events (SSE)
- Hybrid approach

---

## Decisions Log

### Decision 1: Lambda Removal
**Status**: ✅ Answered
**Question**: Why were Lambdas removed on Jan 10, 2026?
**Answer**:
- All of it was too complex for what it did
- Lambdas just called one HTTP endpoint (seemed like overkill)
- EventBridge couldn't directly call external endpoints, forced to use Lambda as intermediary
- Failed job schedules hard to debug - CloudWatch logs were confusing and poor

**Implications**:
- Need simpler architecture for scheduled HTTP calls
- Better observability/debugging required
- Prefer solutions that don't require multiple AWS services just to hit an endpoint
- **Platform: Railway** - Has built-in Cron Jobs feature (much simpler than Lambda + EventBridge)

---

## Notes & Insights

### Architecture Principles Established
1. **Abstraction Layer Pattern**: Always abstract third-party dependencies for easy migration
2. **Budget-Aware Design**: Choose solutions that fit constraints without sacrificing learning
3. **Migration Path**: Design for change from day 1
4. **Scale Appropriately**: Don't over-engineer for scale you don't have yet

### Key Files Created
- `/docs/plans/queue-migration-strategy.md` - Migration guide for pg-boss → BullMQ
- `/docs/plans/match-update-strategy-comparison.md` - Polling vs Scheduled Jobs analysis
- `/docs/plans/data-pipeline-implementation-roadmap.md` - **6-phase implementation plan**

---

**Last Updated**: January 17, 2026
**Status**: In Progress - Starting Topic 1
