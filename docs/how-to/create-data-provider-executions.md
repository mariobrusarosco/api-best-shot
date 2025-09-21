# How to Create Data Provider Executions

This guide explains the patterns and architecture for implementing data provider executions across all domains (tournaments, standings, matches, rounds, etc.).

## 🏗️ Architecture Overview

The Data Provider execution system follows a consistent pattern across all domains:

1. **Execution Service** - Handles database tracking and Slack notifications
2. **Domain Service** - Implements domain-specific logic (e.g., `TournamentDataProvider`)
3. **Reporting Service** - Tracks detailed operation logs
4. **Scraper Integration** - Handles web scraping and asset uploads

## 📋 Required Components

### 1. Execution Service (`DataProviderExecution`)

**Location**: `/src/domains/data-provider/services/execution.ts`

**Purpose**:

- Automatically creates database records for tracking
- Sends Slack notifications on success/failure
- Manages execution lifecycle

**Usage Pattern**:

```typescript
// Create and start execution tracking
this.execution = new DataProviderExecution({
  requestId: this.requestId,
  tournamentId: '00000000-0000-0000-0000-000000000000', // Placeholder
  operationType: DataProviderExecutionOperationType.TOURNAMENT_CREATE,
});

// Update with actual entity ID after creation
await this.execution?.updateTournamentId(tournament.id);

// Complete successfully
await this.execution?.complete({
  reportFileKey: reportUpload?.s3Key,
  reportFileUrl: reportUpload?.s3Url,
  tournamentLabel: tournament.label,
  summary: {
    /* operation stats */
  },
  duration,
});

// Or handle failure
await this.execution?.failure({
  tournamentLabel: entity.label,
  error: errorMessage,
  summary: {
    /* error details */
  },
  duration,
});
```

### 2. Domain Service Pattern

Each domain (standings, matches, rounds) should follow this structure:

```typescript
export class [Domain]DataProvider {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(payload: Create[Domain]Input) {
    const startTime = Date.now();

    // 1. Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId || '00000000-0000-0000-0000-000000000000',
      operationType: DataProviderExecutionOperationType.[DOMAIN]_CREATE,
    });

    // 2. Initialize reporting
    this.reporter
      .setTournamentInfo({
        label: payload.label,
        tournamentId: payload.tournamentId,
        provider: payload.provider,
      })
      .addOperation('initialization', 'validate_input', 'started');

    // 3. Validation
    if (!payload.requiredField) {
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      await this.execution?.failure({
        duration,
        tournamentLabel: payload.label,
        error: 'Validation failed',
        summary: {
          error: 'Required field missing',
          operationsCount: summary.totalOperations,
          failedOperations: summary.failedOperations,
        },
      });

      await this.reporter.createFileAndUpload();
      throw new Error('[Domain]DataProvider - Validation failed');
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');

    try {
      // 4. Domain-specific operations
      const data = await this.scrapeData(payload);
      const entity = await this.createOnDatabase(data);

      // 5. Update execution with actual entity ID
      await this.execution?.updateTournamentId(entity.id);

      // 6. Generate report
      const reportUpload = await this.reporter.createFileAndUpload();

      // 7. Complete execution
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      await this.execution?.complete({
        reportFileKey: reportUpload?.s3Key,
        reportFileUrl: reportUpload?.s3Url,
        tournamentLabel: entity.label,
        summary: {
          entityId: entity.id,
          entityLabel: entity.label,
          operationsCount: summary.totalOperations,
          successfulOperations: summary.successfulOperations,
          failedOperations: summary.failedOperations,
        },
        duration,
      });

      return entity;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('operation', 'process_data', 'failed', { error: errorMessage });

      const reportResult = await this.reporter.createFileAndUpload();
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      await this.execution?.failure({
        reportFileKey: reportResult.s3Key,
        reportFileUrl: reportResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          operationsCount: summary.totalOperations,
          failedOperations: summary.failedOperations + 1,
        },
        duration,
      });

      throw error;
    }
  }

  // Domain-specific methods
  private async scrapeData(payload: any) { /* Implementation */ }
  private async createOnDatabase(data: any) { /* Implementation */ }
}
```

### 3. Operation Types

**Location**: `/src/domains/data-provider/typing.ts`

Add new operation types for each domain:

```typescript
export enum DataProviderExecutionOperationType {
  TOURNAMENT_CREATE = 'tournament_create',
  TOURNAMENT_UPDATE = 'tournament_update',
  STANDINGS_CREATE = 'standings_create',
  STANDINGS_UPDATE = 'standings_update',
  MATCHES_CREATE = 'matches_create',
  MATCHES_UPDATE = 'matches_update',
  ROUNDS_CREATE = 'rounds_create',
  ROUNDS_UPDATE = 'rounds_update',
}
```

### 4. Reporting Integration

Each operation should use the `DataProviderReport` service:

```typescript
// Initialize reporter
this.reporter = new DataProviderReport(requestId);
this.reporter.setTournamentInfo({
  label: payload.label,
  tournamentId: payload.tournamentId,
  provider: payload.provider,
});

// Track operations
this.reporter.addOperation('scraping', 'fetch_data', 'started');
// ... perform operation ...
this.reporter.addOperation('scraping', 'fetch_data', 'completed', { recordCount: 50 });

// Generate final report
const reportUpload = await this.reporter.createFileAndUpload();
```

## 🔄 Implementation Steps for New Domains

### Step 1: Define Operation Types

Add new operation types to `DataProviderExecutionOperationType` enum.

### Step 2: Create Domain Service

Follow the `[Domain]DataProvider` pattern shown above.

### Step 3: Database Operations

Implement domain-specific database operations:

- `createOnDatabase()`
- `updateOnDatabase()`
- Any domain-specific methods

### Step 4: Scraping Operations

Implement data scraping methods:

- Use `BaseScraper` for web scraping
- Handle asset uploads (images, files)
- Parse and transform data

### Step 5: Integration

Integrate with the main orchestration in `/src/domains/data-provider/services/index.ts`:

```typescript
export class SofaScoreScraper extends BaseScraper {
  public async createTournament(payload: CreateTournamentInput) {
    // ... existing code ...

    // Add new domain services
    const standingsService = new StandingsDataProviderService(scraper, requestId);
    const matchesService = new MatchesDataProviderService(scraper, requestId);
    const roundsService = new RoundsDataProviderService(scraper, requestId);

    // Execute in sequence
    const standings = await standingsService.init(tournament);
    const matches = await matchesService.init(tournament);
    const rounds = await roundsService.init(tournament);

    return { tournament, standings, matches, rounds };
  }
}
```

## 📊 Database Schema

The execution tracking uses the `data_provider_executions` table:

```sql
CREATE TABLE data_provider_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  tournament_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration INTEGER, -- milliseconds
  report_file_url TEXT,
  report_file_key TEXT,
  summary JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 🔔 Slack Notifications

Notifications are automatically handled by the `DataProviderExecution` service using Block Kit:

- **Success**: Green message with operation details
- **Failure**: Red message with error details
- **Context**: Request ID, timestamp, duration
- **Configuration**: Uses `SLACK_JOB_EXECUTIONS_WEBHOOK` environment variable

## 🎯 Best Practices

### 1. Error Handling

- Always wrap operations in try-catch
- Call `execution.failure()` in catch blocks
- Include meaningful error messages
- Generate reports even on failure

### 2. Validation

- Validate inputs early
- Fail fast with clear error messages
- Track validation operations in reports

### 3. Reporting

- Track all major operations
- Include relevant data in operation logs
- Use consistent operation naming

### 4. Performance

- Track operation duration
- Include performance metrics in summaries
- Monitor execution times

### 5. Testing

- Test both success and failure paths
- Verify database records are created
- Check Slack notifications are sent
- Validate report generation

## 🔧 Environment Variables

Required environment variables:

```bash
# Slack webhook for execution notifications
SLACK_JOB_EXECUTIONS_WEBHOOK=https://hooks.slack.com/services/...

# AWS S3 for report storage (optional)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_CLOUDFRONT_URL=...
```

## 📝 Example Implementation

See the complete tournament implementation:

- **Service**: `/src/domains/data-provider/services/tournaments.ts`
- **Execution**: `/src/domains/data-provider/services/execution.ts`
- **Integration**: `/src/domains/data-provider/services/index.ts`

Follow this pattern for standings, matches, rounds, and any future domains.
