# How to Create Data Provider Services and Executions

This guide explains the patterns and architecture for implementing data provider services across all domains (tournaments, standings, matches, teams, rounds, etc.). Data provider services handle external data fetching, transformation, and database operations with comprehensive tracking and reporting.

## Overview

Data provider services follow a consistent architecture pattern that includes:

- **Execution Tracking**: Lifecycle management and monitoring
- **Detailed Reporting**: Operation-level logging and S3 report generation
- **Error Handling**: Comprehensive error capture and notification
- **Resource Management**: Proper cleanup of external resources (scrapers, etc.)
- **Consistency**: Standardized patterns across all data types

## Core Architecture Components

### 1. Service Class Structure

Every data provider service follows this structure:

```typescript
export class [Entity]DataProviderService {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(payload: Create[Entity]Input) { /* creation logic */ }
  public async update(payload: Create[Entity]Input) { /* update logic */ }

  // Private methods for internal operations
  private validateInput() { /* validation */ }
  private fetchData() { /* external data fetching */ }
  private mapData() { /* data transformation */ }
  private createOnDatabase() { /* database operations */ }
  private updateOnDatabase() { /* database operations */ }
}
```

### 2. Execution Tracking

The `DataProviderExecution` class tracks the entire operation lifecycle:

```typescript
this.execution = new DataProviderExecution({
  requestId: this.requestId,
  tournamentId: payload.tournamentId,
  operationType: DataProviderExecutionOperationType.[ENTITY]_CREATE,
});
```

### 3. Operation Reporting

The `DataProviderReport` class logs detailed operation steps:

```typescript
this.reporter.addOperation(category, operation, status, metadata);
```

**Categories**: `initialization`, `scraping`, `transformation`, `database`
**Statuses**: `started`, `completed`, `failed`

## Step-by-Step Implementation Guide

### Step 1: Define Operation Types

First, add your new operation types to the enum:

```typescript
// src/domains/data-provider/typing.ts
export enum DataProviderExecutionOperationType {
  // Existing operations...
  MATCHES_CREATE = 'matches_create',
  MATCHES_UPDATE = 'matches_update',
  TEAMS_CREATE = 'teams_create',
  TEAMS_UPDATE = 'teams_update',
  ROUNDS_CREATE = 'rounds_create',
  ROUNDS_UPDATE = 'rounds_update',
}
```

### Step 2: Create Input Types

Define the input interface for your service:

```typescript
// src/domains/data-provider/services/[entity].ts
export interface Create[Entity]Input {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
  // Add entity-specific properties
}
```

### Step 3: Implement Service Class

Create your service following the established pattern:

```typescript
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { DataProviderReport } from '@/domains/data-provider/services/report';
import { DataProviderExecutionOperationType } from '@/domains/data-provider/typing';

export class [Entity]DataProviderService {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(payload: Create[Entity]Input) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.[ENTITY]_CREATE,
    });

    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateInput(payload);

      // ------ FETCH DATA ------
      const fetchedData = await this.fetchData(payload.baseUrl);

      // ------ MAP DATA ------
      const mappedData = await this.mapData(fetchedData, payload.tournamentId);

      // ------ CREATE IN DATABASE ------
      const createdData = await this.createOnDatabase(mappedData);

      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();

      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();

      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          [entity]Count: createdData.length,
          ...reportSummaryResult,
        },
      });

      return createdData;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      const reportSummaryResult = this.reporter.getSummary();

      // ------ MARK EXECUTION AS FAILED ------
      await this.execution?.failure({
        reportFileKey: reportUploadResult.s3Key,
        reportFileUrl: reportUploadResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          ...reportSummaryResult,
        },
      });

      throw error;
    }
  }
}
```

### Step 4: Implement Private Methods

#### Validation Method

```typescript
private validateInput(payload: Create[Entity]Input) {
  this.reporter.addOperation('initialization', 'validate_input', 'started');

  if (!payload.tournamentId) {
    this.reporter.addOperation('initialization', 'validate_input', 'failed', {
      error: 'Tournament ID is null',
    });
    throw new Error('Tournament ID is null');
  }

  // Add other validations specific to your entity

  this.reporter.addOperation('initialization', 'validate_input', 'completed');
}
```

#### Data Fetching Method

```typescript
private async fetchData(baseUrl: string) {
  this.reporter.addOperation('scraping', 'fetch_[entity]', 'started');

  const url = `${baseUrl}/[entity-endpoint]`;
  await this.scraper.goto(url);
  const rawContent = await this.scraper.getPageContent();

  if (!rawContent?.[entity] || rawContent?.[entity]?.length === 0) {
    this.reporter.addOperation('scraping', 'fetch_[entity]', 'completed', {
      note: 'No [entity] data found',
    });
    return [];
  }

  this.reporter.addOperation('scraping', 'fetch_[entity]', 'completed', {
    [entity]Count: rawContent.[entity].length,
  });

  return rawContent;
}
```

#### Data Mapping Method

```typescript
private async mapData(fetchedData: any, tournamentId: string) {
  this.reporter.addOperation('transformation', 'map_[entity]', 'started');

  const mappedData = fetchedData.[entity].map((item: any) => ({
    // Map external data structure to internal schema
    externalId: safeString(item.id),
    tournamentId: tournamentId,
    // Add other field mappings
    provider: 'sofascore',
  }));

  if (mappedData.length === 0) {
    this.reporter.addOperation('transformation', 'map_[entity]', 'failed', {
      error: 'No [entity] data found',
    });
    throw new Error('No [entity] data found');
  }

  this.reporter.addOperation('transformation', 'map_[entity]', 'completed', {
    [entity]Count: mappedData.length,
  });

  return mappedData;
}
```

#### Database Operations

```typescript
public async createOnDatabase([entity]: DB_Insert[Entity][]) {
  this.reporter.addOperation('database', 'create_[entity]', 'started', {
    [entity]Count: [entity].length,
  });

  try {
    const query = await db.insert(T_[Entity]).values([entity]).returning();

    this.reporter.addOperation('database', 'create_[entity]', 'completed', {
      created[Entity]Count: query.length,
    });

    return query;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.reporter.addOperation('database', 'create_[entity]', 'failed', {
      error: errorMessage,
    });
    Profiling.error({
      error: errorMessage,
      data: { error: errorMessage },
      source: '[Entity]DataProviderService.createOnDatabase',
    });
    throw error;
  }
}
```

### Step 5: Create Admin Service

Create the corresponding admin service to expose the data provider:

```typescript
// src/domains/admin/services/[entity].ts
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { [Entity]DataProviderService } from '@/domains/data-provider/services/[entity]';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class Admin[Entity]Service {
  static async create[Entity](req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      const tournamentId = req.params.tournamentId;
      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new [Entity]DataProviderService(scraper, requestId);

      const payload = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const [entity] = await dataProviderService.init(payload);

      return res.status(201).json({
        success: true,
        data: { [entity] },
        message: `[Entity] created successfully`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_[ENTITY]_create',
        error,
        data: {
          requestId,
          operation: 'admin_[entity]_creation',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
        Profiling.log({
          msg: '[CLEANUP] Playwright resources cleaned up successfully',
          data: { requestId, source: 'admin_service' },
          source: 'ADMIN_SERVICE_[ENTITY]_create',
        });
      }
    }
  }
}

export { Admin[Entity]Service };
```

### Step 6: Add Routes

Add routes to expose your admin service:

```typescript
// src/domains/admin/routes/v2.ts
import { Admin[Entity]Service } from '../services/[entity]';

// Add to existing routes
router.post('/tournaments/:tournamentId/[entity]', Admin[Entity]Service.create[Entity]);
router.put('/tournaments/:tournamentId/[entity]', Admin[Entity]Service.update[Entity]);
```

## Best Practices

### 1. Error Handling

- Always generate reports even on failure
- Use structured error logging with context
- Provide meaningful error messages

### 2. Resource Management

- Always clean up scrapers in `finally` blocks
- Use proper dependency injection patterns
- Initialize execution tracking early

### 3. Reporting

- Log all major operation steps
- Include relevant metadata in reports
- Use consistent operation categories

### 4. Data Validation

- Validate inputs early and fail fast
- Use `safeString` and other utilities for data sanitization
- Check for empty results and handle gracefully

### 5. Database Operations

- Use proper transaction handling where needed
- Implement both create and update operations
- Handle unique constraint violations appropriately

## Examples

### Matches Data Provider Service

```typescript
export interface CreateMatchesInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
  roundId?: string; // Optional for specific round
}

export class MatchesDataProviderService {
  // Follow the standard pattern above
  // Specific considerations:
  // - Handle live vs completed matches
  // - Update scores for existing matches
  // - Handle fixture data vs result data
}
```

### Teams Data Provider Service

```typescript
export interface CreateTeamsInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
}

export class TeamsDataProviderService {
  // Follow the standard pattern above
  // Specific considerations:
  // - Upload team logos via scraper.uploadAsset()
  // - Handle team metadata (country, etc.)
  // - Link teams to existing tournaments
}
```

This architecture ensures consistency, maintainability, and comprehensive monitoring across all data provider services.
