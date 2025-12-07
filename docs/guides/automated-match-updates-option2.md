# Automated Match Updates - Option 2: AWS EventBridge Direct HTTP

## Overview

This document describes **Option 2** for automating match score and standings updates using **AWS EventBridge** to make direct HTTP calls to your Railway API, **without Lambda functions**.

### The Problem We're Solving

We need to automatically update match scores and tournament standings approximately **2 hours after each match starts**, with:
- ✅ Precise timing (exact to the minute)
- ✅ No Lambda deployment complexity
- ✅ Reliable AWS infrastructure
- ❌ Minimal AWS configuration (just EventBridge)

### The Solution

Use **AWS EventBridge Scheduler** to create one-time schedules that **directly call your Railway API via HTTP**, bypassing Lambda entirely.

---

## Core Concept

**Dynamic EventBridge schedules that call Railway API endpoints:**

1. **Daily cron** (Railway or EventBridge) creates EventBridge schedules for today's matches
2. **EventBridge Scheduler** makes direct HTTPS POST requests to Railway at scheduled times
3. **Railway API** updates scores and standings (reusing existing admin logic)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARCHITECTURE OVERVIEW                      │
└─────────────────────────────────────────────────────────────────┘

Daily Trigger (6am UTC)
    ↓
Railway API: Create EventBridge Schedules
    ↓
AWS EventBridge Scheduler
    │
    └─ Schedule 1: Match 1 at 2:30 PM → HTTP POST to Railway
    └─ Schedule 2: Match 2 at 5:00 PM → HTTP POST to Railway
    └─ Schedule 3: Match 3 at 5:00 PM → HTTP POST to Railway
    └─ ... (100 schedules)
    ↓
At scheduled time: EventBridge calls Railway API directly
    ↓
Railway API: Update scores + standings
    ↓
Done (no Lambda code needed!)
```

**Key difference from old approach:**
- ❌ Old: EventBridge → Lambda → Railway API (complex)
- ✅ New: EventBridge → Railway API (simple)

---

## Architecture Components

### 1. AWS EventBridge Scheduler

**Purpose:** Create one-time HTTP schedules

**Features we use:**
- One-time schedules (not recurring)
- Direct HTTP targets (no Lambda!)
- Schedule groups for organization
- IAM roles for permissions

**Cost:** AWS Free Tier includes:
- 14 million invocations/month (more than enough)
- First 1,000 schedules free

### 2. Railway API Endpoints

**New scheduler endpoint:**

```typescript
// File: src/domains/scheduler/routes/internal.ts

router.post('/internal/scheduler/create-schedules',
  InternalMiddleware,
  SchedulerController.createEventBridgeSchedules
);

router.post('/internal/scheduler/update-match',
  InternalMiddleware,
  SchedulerController.updateMatchScores
);

router.post('/internal/scheduler/cleanup-schedules',
  InternalMiddleware,
  SchedulerController.cleanupOldSchedules
);
```

### 3. AWS SDK Integration

**Install AWS SDK:**
```bash
yarn add @aws-sdk/client-scheduler
```

**Environment variables:**
```bash
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
EVENTBRIDGE_ROLE_ARN=arn:aws:iam::123456789:role/EventBridgeSchedulerRole
INTERNAL_SERVICE_TOKEN=your-internal-token
```

---

## How It Works: Step-by-Step Example

### Scenario: 100 Matches on Saturday

#### **6:00 AM - Daily Schedule Creator Runs**

**Trigger:** Railway Cron or EventBridge Rule (daily at 6 AM)

```
Cron Trigger
    ↓
POST /internal/scheduler/create-schedules
    ↓
```

**Today's matches in database:**

```
┌────────┬─────────────────┬──────────┬───────────────────────┐
│ Match  │ Tournament      │ Kickoff  │ Expected End (T+2h)   │
├────────┼─────────────────┼──────────┼───────────────────────┤
│ 1      │ Premier League  │ 12:30 PM │ 2:30 PM               │
│ 2      │ Premier League  │ 3:00 PM  │ 5:00 PM               │
│ 3      │ La Liga         │ 3:00 PM  │ 5:00 PM               │
│ 15     │ Serie A         │ 4:30 PM  │ 6:30 PM               │
│ ...    │ ...             │ ...      │ ...                   │
│ 100    │ Bundesliga      │ 9:00 PM  │ 11:00 PM              │
└────────┴─────────────────┴──────────┴───────────────────────┘
```

**API Logic:**

```typescript
import { SchedulerClient, CreateScheduleCommand } from '@aws-sdk/client-scheduler';

class EventBridgeSchedulerService {
  private client = new SchedulerClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  async createDailySchedules() {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // Get all matches happening today
    const todaysMatches = await db
      .select()
      .from(T_Match)
      .where(
        and(
          gte(T_Match.date, todayStart),
          lte(T_Match.date, todayEnd),
          eq(T_Match.status, 'notstarted')
        )
      );

    console.log(`Found ${todaysMatches.length} matches today`);

    // Create EventBridge schedule for each match
    for (const match of todaysMatches) {
      await this.createMatchUpdateSchedule(match);
    }

    return { created: todaysMatches.length };
  }

  async createMatchUpdateSchedule(match: Match) {
    const kickoffTime = new Date(`${match.date} ${match.time}`);
    const updateTime = new Date(kickoffTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    // Format time for EventBridge: "at(2024-11-30T14:30:00)"
    const scheduleExpression = `at(${updateTime.toISOString().slice(0, 19)})`;

    const command = new CreateScheduleCommand({
      Name: `match-${match.id}-update`,
      GroupName: 'daily-match-updates',

      // One-time schedule at exact time
      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: 'UTC',

      // Exact timing (no flexibility window)
      FlexibleTimeWindow: {
        Mode: 'OFF',
      },

      // Direct HTTP call to Railway API
      Target: {
        Arn: 'arn:aws:scheduler:::aws-sdk:http:invoke',
        RoleArn: process.env.EVENTBRIDGE_ROLE_ARN,

        Input: JSON.stringify({
          Method: 'POST',
          Url: `${process.env.RAILWAY_API_URL}/internal/scheduler/update-match`,
          Headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN,
          },
          Body: JSON.stringify({
            tournamentId: match.tournamentId,
            matchId: match.id,
            roundSlug: match.roundSlug,
          }),
        }),

        RetryPolicy: {
          MaximumRetryAttempts: 2,
          MaximumEventAgeInSeconds: 3600,
        },
      },
    });

    await this.client.send(command);

    console.log(`✅ Created schedule for match ${match.id} at ${updateTime.toISOString()}`);
  }
}
```

**Result: EventBridge now has 100 one-time schedules:**

```
AWS EventBridge Schedules (Group: daily-match-updates)
┌───────────────────┬─────────────────────┬──────────────────────────┐
│ Schedule Name     │ Execution Time      │ Target                   │
├───────────────────┼─────────────────────┼──────────────────────────┤
│ match-1-update    │ 2024-11-30 14:30:00 │ POST Railway API         │
│ match-2-update    │ 2024-11-30 17:00:00 │ POST Railway API         │
│ match-3-update    │ 2024-11-30 17:00:00 │ POST Railway API         │
│ ...               │ ...                 │ ...                      │
│ match-100-update  │ 2024-11-30 23:00:00 │ POST Railway API         │
└───────────────────┴─────────────────────┴──────────────────────────┘
```

---

#### **2:30 PM - First Schedule Executes**

**EventBridge at exactly 2:30:00 PM:**

```
EventBridge Schedule: match-1-update
    ↓
Executes at: 2024-11-30 14:30:00 UTC (exact time!)
    ↓
Makes HTTP POST Request:
    URL: https://api-best-shot-demo.mariobrusarosco.com/internal/scheduler/update-match
    Headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": "your-token"
    }
    Body: {
      "tournamentId": "premier-league",
      "matchId": "match-1",
      "roundSlug": "round-15"
    }
    ↓
Railway API Receives Request
```

**Railway API Handler:**

```typescript
// POST /internal/scheduler/update-match
async function updateMatchScores(req: Request, res: Response) {
  const { tournamentId, matchId, roundSlug } = req.body;

  console.log(`[EventBridge] Updating match ${matchId} in round ${roundSlug}`);

  try {
    // 1. Update match scores for this round
    const matchesResult = await AdminMatchesService.updateMatchesByRound({
      tournamentId,
      roundSlug,
    });

    console.log(`✅ Updated ${matchesResult.length} matches in ${roundSlug}`);

    // 2. Update tournament standings
    const standingsResult = await AdminStandingsService.update({
      tournamentId,
    });

    console.log(`✅ Updated standings for ${tournamentId}`);

    return res.status(200).json({
      success: true,
      message: 'Match scores and standings updated',
      data: {
        matchId,
        roundSlug,
        matchesUpdated: matchesResult.length,
        standingsUpdated: standingsResult.length,
      },
    });

  } catch (error) {
    console.error(`❌ Failed to update match ${matchId}:`, error);

    // EventBridge will retry based on RetryPolicy
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

**After execution:**
- Match 1 scores updated ✅
- Premier League standings updated ✅
- EventBridge schedule auto-deleted (one-time)

---

#### **5:00 PM - Multiple Schedules Execute**

**EventBridge at exactly 5:00:00 PM:**

Multiple schedules trigger simultaneously:

```
┌─────────────────────────────────────────────────────────────┐
│          5:00:00 PM - PARALLEL EXECUTIONS                   │
└─────────────────────────────────────────────────────────────┘

EventBridge Schedule: match-2-update
    ↓
POST /internal/scheduler/update-match
Body: { tournamentId: "premier-league", matchId: "match-2", roundSlug: "round-15" }

                    (parallel)

EventBridge Schedule: match-3-update
    ↓
POST /internal/scheduler/update-match
Body: { tournamentId: "la-liga", matchId: "match-3", roundSlug: "round-10" }

                    (parallel)

EventBridge Schedule: match-15-update
    ↓
POST /internal/scheduler/update-match
Body: { tournamentId: "serie-a", matchId: "match-15", roundSlug: "round-3" }
```

**Railway API handles all 3 requests concurrently:**
- Each request is independent
- Different tournaments = no conflicts
- All complete successfully in ~2-3 seconds each

---

#### **11:00 PM - Last Schedules Execute**

**EventBridge at exactly 11:00:00 PM:**

Final matches of the day get updated automatically.

---

## Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│              6:00 AM DAILY - CREATE EVENTBRIDGE SCHEDULES        │
│              POST /internal/scheduler/create-schedules           │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              Query: Get today's matches from T_Match
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │   CREATE AWS EVENTBRIDGE SCHEDULES    │
         │                                       │
         │  For each match:                      │
         │  1. Calculate: kickoff + 2 hours      │
         │  2. Create EventBridge Schedule:      │
         │     - Name: match-{id}-update         │
         │     - Time: kickoff + 2h (exact)      │
         │     - Target: Railway API HTTP        │
         │     - Payload: {tournamentId, ...}    │
         │  3. One-time schedule (auto-delete)   │
         └───────────────────────────────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │     AWS EVENTBRIDGE SCHEDULER         │
         ├───────────────────────────────────────┤
         │  match-1-update  | 2:30 PM  | PENDING │
         │  match-2-update  | 5:00 PM  | PENDING │
         │  match-3-update  | 5:00 PM  | PENDING │
         │  ...                                   │
         │  match-100-update| 11:00 PM | PENDING │
         └───────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│         AT SCHEDULED TIME - EVENTBRIDGE EXECUTES                 │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              EventBridge makes HTTPS POST to Railway
                             │
              POST https://api-best-shot-demo.mariobrusarosco.com
                   /internal/scheduler/update-match
                             │
              Headers: X-Internal-Token: {secret}
              Body: {
                tournamentId: "...",
                matchId: "...",
                roundSlug: "..."
              }
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │      RAILWAY API HANDLER              │
         │                                       │
         │  1. Validate InternalMiddleware       │
         │  2. Update match scores (Admin API)   │
         │  3. Update standings (Admin API)      │
         │  4. Return 200 OK                     │
         └───────────────────────────────────────┘
                             │
                             ▼
              EventBridge receives 200 OK
                             │
                  ┌──────────┴────────────┐
                  │                       │
                  ▼                       ▼
            Success ✅              Retry (if error)
            Auto-delete             Max 2 retries
            schedule                Then DLQ/fail
                  │
                  ▼
         ┌───────────────────────────────────────┐
         │   AWS EVENTBRIDGE SCHEDULER           │
         ├───────────────────────────────────────┤
         │  match-1-update  | EXECUTED ✅        │
         │  match-2-update  | 5:00 PM  | PENDING │
         │  match-3-update  | 5:00 PM  | PENDING │
         │  ...                                   │
         └───────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│            MIDNIGHT DAILY - CLEANUP OLD SCHEDULES                │
│            POST /internal/scheduler/cleanup-schedules            │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              List all schedules in group "daily-match-updates"
                             │
                             ▼
              Delete schedules from yesterday (already executed)
                             │
                             ▼
                    Keeps AWS EventBridge clean
```

---

## AWS EventBridge Setup

### 1. Create IAM Role

**Role Name:** `EventBridgeSchedulerRole`

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "scheduler.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Permissions Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "scheduler:CreateSchedule",
        "scheduler:DeleteSchedule",
        "scheduler:GetSchedule",
        "scheduler:ListSchedules"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Create Schedule Group

```bash
aws scheduler create-schedule-group \
  --name daily-match-updates \
  --region us-east-1
```

### 3. Environment Variables

Add to Railway:
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
EVENTBRIDGE_ROLE_ARN=arn:aws:iam::123456789:role/EventBridgeSchedulerRole
RAILWAY_API_URL=https://api-best-shot-demo.mariobrusarosco.com
INTERNAL_SERVICE_TOKEN=your-internal-token
```

---

## Implementation Details

### Service Layer

```typescript
// File: src/domains/scheduler/services/eventbridge.ts

import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ListSchedulesCommand
} from '@aws-sdk/client-scheduler';

export class EventBridgeSchedulerService {
  private client: SchedulerClient;
  private roleArn: string;
  private railwayApiUrl: string;
  private internalToken: string;

  constructor() {
    this.client = new SchedulerClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.roleArn = process.env.EVENTBRIDGE_ROLE_ARN!;
    this.railwayApiUrl = process.env.RAILWAY_API_URL!;
    this.internalToken = process.env.INTERNAL_SERVICE_TOKEN!;
  }

  async createMatchUpdateSchedule(match: Match): Promise<void> {
    const kickoffTime = new Date(`${match.date} ${match.time}`);
    const updateTime = new Date(kickoffTime.getTime() + 2 * 60 * 60 * 1000);

    const scheduleName = `match-${match.id}-update`;
    const scheduleExpression = `at(${updateTime.toISOString().slice(0, 19)})`;

    const command = new CreateScheduleCommand({
      Name: scheduleName,
      GroupName: 'daily-match-updates',

      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: 'UTC',

      FlexibleTimeWindow: {
        Mode: 'OFF',
      },

      Target: {
        Arn: 'arn:aws:scheduler:::aws-sdk:http:invoke',
        RoleArn: this.roleArn,

        Input: JSON.stringify({
          Method: 'POST',
          Url: `${this.railwayApiUrl}/internal/scheduler/update-match`,

          Headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': this.internalToken,
          },

          Body: JSON.stringify({
            tournamentId: match.tournamentId,
            matchId: match.id,
            roundSlug: match.roundSlug,
          }),
        }),

        RetryPolicy: {
          MaximumRetryAttempts: 2,
          MaximumEventAgeInSeconds: 3600, // 1 hour
        },
      },
    });

    await this.client.send(command);
  }

  async deleteSchedule(scheduleName: string): Promise<void> {
    const command = new DeleteScheduleCommand({
      Name: scheduleName,
      GroupName: 'daily-match-updates',
    });

    await this.client.send(command);
  }

  async listSchedules(): Promise<string[]> {
    const command = new ListSchedulesCommand({
      GroupName: 'daily-match-updates',
    });

    const response = await this.client.send(command);
    return response.Schedules?.map(s => s.Name!) || [];
  }

  async cleanupOldSchedules(): Promise<number> {
    const schedules = await this.listSchedules();
    let deleted = 0;

    for (const scheduleName of schedules) {
      // Delete schedules from yesterday
      // (They're already executed and auto-deleted, but just in case)
      if (scheduleName.includes('-update')) {
        try {
          await this.deleteSchedule(scheduleName);
          deleted++;
        } catch (error) {
          // Schedule already deleted or doesn't exist
          console.log(`Schedule ${scheduleName} already deleted`);
        }
      }
    }

    return deleted;
  }
}
```

### Controller Layer

```typescript
// File: src/domains/scheduler/controllers/index.ts

export class SchedulerController {
  static async createEventBridgeSchedules(req: Request, res: Response) {
    const service = new EventBridgeSchedulerService();

    try {
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));

      const todaysMatches = await db
        .select()
        .from(T_Match)
        .where(
          and(
            gte(T_Match.date, todayStart),
            lte(T_Match.date, todayEnd),
            eq(T_Match.status, 'notstarted')
          )
        );

      for (const match of todaysMatches) {
        await service.createMatchUpdateSchedule(match);
      }

      return res.status(200).json({
        success: true,
        message: `Created ${todaysMatches.length} EventBridge schedules`,
        count: todaysMatches.length,
      });

    } catch (error) {
      console.error('[EventBridge] Failed to create schedules:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async updateMatchScores(req: Request, res: Response) {
    const { tournamentId, matchId, roundSlug } = req.body;

    try {
      // Update match scores
      await AdminMatchesService.updateMatchesByRound({
        tournamentId,
        roundSlug,
      });

      // Update standings
      await AdminStandingsService.update({
        tournamentId,
      });

      return res.status(200).json({
        success: true,
        message: 'Match scores and standings updated',
        data: { matchId, roundSlug },
      });

    } catch (error) {
      console.error(`[EventBridge] Failed to update match ${matchId}:`, error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async cleanupOldSchedules(req: Request, res: Response) {
    const service = new EventBridgeSchedulerService();

    try {
      const deleted = await service.cleanupOldSchedules();

      return res.status(200).json({
        success: true,
        message: `Cleaned up ${deleted} old schedules`,
        deleted,
      });

    } catch (error) {
      console.error('[EventBridge] Failed to cleanup schedules:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
```

---

## Handling 100 Matches/Day

### Performance Analysis

**Daily operations:**
- 6 AM: Create 100 EventBridge schedules (~30 seconds)
- Throughout day: 100 HTTP calls to Railway (spread over 12 hours)
- Midnight: Cleanup old schedules (~5 seconds)

**Peak scenario:** 15 matches ending at 5:00 PM

```
5:00:00 PM - EventBridge triggers 15 schedules simultaneously
    ↓
15 parallel HTTP POST requests to Railway
    ↓
Railway handles concurrently (each request ~2-3 seconds)
    ↓
All complete within ~5 seconds
```

**AWS EventBridge limits:**
- Max schedules: 1,000 per account (we use ~100/day) ✅
- Max retries: Configurable (we set 2) ✅
- Rate limits: Very high (handles 15 concurrent easily) ✅

**Railway limits:**
- Can handle concurrent requests ✅
- Each request uses existing admin API ✅
- No additional load vs manual admin updates ✅

### Cost Analysis

**AWS Free Tier (permanent):**
- Schedule invocations: 14 million/month FREE
- Our usage: 100/day × 30 days = 3,000/month
- **Cost: $0** (well within free tier)

**After free tier:**
- $1.00 per million invocations
- Our usage: 3,000 invocations/month
- **Cost: ~$0.003/month** (negligible)

---

## Benefits Summary

### ✅ Pros

1. **Exact Timing**
   - Schedules execute at the exact second
   - No 5-minute intervals
   - Perfect for time-sensitive updates

2. **No Lambda Complexity**
   - No Lambda function code
   - No deployment packages
   - No layers to manage
   - No CloudWatch debugging

3. **Reliable AWS Infrastructure**
   - EventBridge is highly reliable
   - Automatic retries on failure
   - Dead Letter Queue for failed events

4. **Simple Architecture**
   - Just EventBridge + Railway API
   - Direct HTTP calls
   - Easy to understand

5. **Cost-Effective**
   - AWS Free Tier covers usage
   - ~$0/month for 100 matches/day

6. **Scalable**
   - Can handle 1,000s of schedules
   - Parallel execution built-in

7. **Visible**
   - AWS Console shows all schedules
   - Railway logs show HTTP requests
   - Easy to monitor

### ⚠️ Cons

1. **AWS Dependency**
   - Requires AWS account
   - Need to manage IAM roles
   - AWS Console access needed

2. **Split Infrastructure**
   - Logic spread between AWS and Railway
   - Two places to monitor (AWS Console + Railway logs)

3. **Setup Complexity**
   - IAM role configuration
   - AWS credentials management
   - More initial setup than Option 1

4. **Debugging Split**
   - Check AWS EventBridge for schedule status
   - Check Railway logs for execution
   - Two failure points to investigate

---

## Comparison: Option 1 vs Option 2

| Aspect                  | Option 1 (Railway Queue)   | Option 2 (EventBridge)     |
|-------------------------|----------------------------|----------------------------|
| **Timing Precision**    | 5-minute intervals         | Exact to the second ✅     |
| **Infrastructure**      | Railway only               | AWS + Railway              |
| **Setup Complexity**    | Low ✅                     | Medium (IAM roles)         |
| **Cost**                | $0 (Railway)               | ~$0 (AWS free tier)        |
| **Debugging**           | Easy (one place) ✅        | Medium (two places)        |
| **Deployment**          | Simple API deploy ✅       | API + AWS config           |
| **Visibility**          | Database queries ✅        | AWS Console               |
| **Reliability**         | Good (Railway)             | Excellent (AWS) ✅         |
| **Scalability**         | Good (100s/day)            | Excellent (1000s/day) ✅   |
| **Local Testing**       | Easy ✅                    | Medium (mock AWS)          |
| **Manual Control**      | Easy (DB updates) ✅       | Medium (AWS Console)       |

---

## When to Choose Option 2

**Choose EventBridge if:**
- ✅ You need **exact timing** (to the second)
- ✅ You're comfortable with **AWS infrastructure**
- ✅ You want **maximum reliability** (AWS SLA)
- ✅ You plan to scale to **1,000+ matches/day**
- ✅ You already have **AWS experience**

**Choose Option 1 if:**
- ✅ You prefer **simplicity** (one platform)
- ✅ **5-minute precision is acceptable**
- ✅ You want **easier debugging**
- ✅ You prefer **database-driven** approach
- ✅ You want to **avoid AWS**

---

## Implementation Checklist

### Phase 1: AWS Setup
- [ ] Create AWS account (if needed)
- [ ] Create IAM role `EventBridgeSchedulerRole`
- [ ] Add trust policy for scheduler.amazonaws.com
- [ ] Add permissions policy for schedule operations
- [ ] Create schedule group `daily-match-updates`
- [ ] Note down ARN for role

### Phase 2: Railway Setup
- [ ] Add AWS environment variables to Railway
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `AWS_REGION`
  - [ ] `EVENTBRIDGE_ROLE_ARN`
  - [ ] `RAILWAY_API_URL`
  - [ ] `INTERNAL_SERVICE_TOKEN`

### Phase 3: Code Implementation
- [ ] Install `@aws-sdk/client-scheduler`
- [ ] Create `EventBridgeSchedulerService`
- [ ] Implement `createMatchUpdateSchedule()`
- [ ] Implement `deleteSchedule()`
- [ ] Implement `cleanupOldSchedules()`
- [ ] Create controller endpoints
- [ ] Add `InternalMiddleware` authentication

### Phase 4: API Endpoints
- [ ] Create `POST /internal/scheduler/create-schedules`
- [ ] Create `POST /internal/scheduler/update-match`
- [ ] Create `POST /internal/scheduler/cleanup-schedules`
- [ ] Test with Postman/curl

### Phase 5: Testing
- [ ] Test schedule creation with sample match
- [ ] Verify schedule appears in AWS Console
- [ ] Wait for scheduled time and verify HTTP call
- [ ] Check Railway logs for execution
- [ ] Test cleanup endpoint
- [ ] Test with multiple concurrent schedules

### Phase 6: Automation
- [ ] Set up Railway cron for daily schedule creation
  - [ ] Schedule: `0 6 * * *`
  - [ ] Command: `curl POST /internal/scheduler/create-schedules`
- [ ] Set up Railway cron for cleanup
  - [ ] Schedule: `0 0 * * *`
  - [ ] Command: `curl POST /internal/scheduler/cleanup-schedules`

### Phase 7: Monitoring
- [ ] Monitor AWS EventBridge metrics
- [ ] Monitor Railway logs
- [ ] Set up alerts for failed executions
- [ ] Test error handling and retries

---

## Troubleshooting

### Issue: EventBridge schedules not executing

**Check:**
1. IAM role has correct permissions
2. Railway API URL is correct
3. `INTERNAL_SERVICE_TOKEN` matches
4. Schedule time is in UTC
5. AWS EventBridge CloudWatch logs

### Issue: Railway returning 401 Unauthorized

**Check:**
1. `X-Internal-Token` header is being sent
2. Token value matches environment variable
3. `InternalMiddleware` is applied to route

### Issue: Schedules not being created

**Check:**
1. AWS credentials are valid
2. IAM role ARN is correct
3. Schedule group exists
4. No AWS rate limiting

### Issue: HTTP timeouts

**Check:**
1. Railway API is healthy
2. Admin services can scrape SofaScore
3. Increase `MaximumEventAgeInSeconds` in retry policy

---

## File Structure

```
src/
├── domains/
│   └── scheduler/
│       ├── routes/
│       │   └── internal.ts           # Scheduler endpoints
│       ├── services/
│       │   └── eventbridge.ts        # AWS EventBridge integration
│       ├── controllers/
│       │   └── index.ts              # HTTP handlers
│       └── types/
│           └── index.ts              # TypeScript types
│
└── domains/
    └── auth/
        └── internal-middleware.ts    # X-Internal-Token auth

package.json                          # Add @aws-sdk/client-scheduler
.env                                  # AWS credentials
```

---

## Conclusion

**Option 2: AWS EventBridge Direct HTTP** is ideal if you:
- Need exact timing precision
- Are comfortable with AWS infrastructure
- Want maximum reliability and scalability

The direct HTTP approach eliminates Lambda complexity while keeping AWS's precision and reliability. Perfect for when timing matters!
