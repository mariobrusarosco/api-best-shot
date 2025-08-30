# Data Provider Best Practices

Based on the successful implementation of standings and tournaments data providers, this guide outlines the established patterns and best practices for implementing robust data provider services with complete observability.

## Architecture Pattern

### 1. Service Layer Pattern
Create a dedicated service class that follows this structure:

```typescript
// Example: TeamDataProviderService.ts
export class TeamDataProviderService {
  private scraper: BaseScraper;
  public report: DataProviderReport;

  constructor(report: DataProviderReport) {
    this.report = report;
    this.scraper = new BaseScraper();
  }

  static async create(report: DataProviderReport) {
    return new TeamDataProviderService(report);
  }
}
```

**Key Points:**
- Service owns the scraper and report instances
- Static factory method for consistent initialization
- Report is public for API layer access

### 2. Operation Tracking with Proper Error Handling

Use the Operation class methods correctly:
- ✅ `op.success(data)` for successful operations
- ✅ `op.fail(error)` for failed operations
- ❌ NOT `op.start()` or `op.complete()`

```typescript
private async fetchTeams(tournamentId: string) {
  const op = this.report.createOperation('scraping', 'fetch_teams');
  try {
    const teams = await this.scraper.fetchTeamsFromAPI(tournamentId);
    op.success({ teamsCount: teams.length });
    return teams;
  } catch (error) {
    const errorMessage = (error as Error).message;
    op.fail({ error: errorMessage });
    throw error;
  }
}
```

**Operation Types:**
- `scraping` - External data fetching
- `transformation` - Data mapping/processing
- `database` - Database operations

### 3. Graceful Failure with Complete Reporting

**CRITICAL:** Always complete the reporting flow, even on failures:

```typescript
public async createTeams(tournament: Tournament, teamIds: string[]) {
  try {
    // Main business logic
    const teams = await this.fetchTeams(tournament.id);
    const processedTeams = await this.processTeamLogos(teams);
    const result = await this.saveToDatabase(processedTeams);

    // Success flow
    await this.report.uploadToS3();
    await this.report.saveOnDatabase();
    
    const slackMessage = this.createSuccessMessage(result);
    await this.report.sendNotification(slackMessage);
    
    await this.scraper.close();
    return result;
    
  } catch (error) {
    // ALWAYS complete reporting on failure
    await this.scraper.close();
    
    // Set tournament info if not already set
    if (!this.report.tournament) {
      this.report.setTournament({
        label: tournament.label,
        id: tournament.id || '00000000-0000-0000-0000-000000000000',
        provider: 'sofascore'
      });
    }
    
    // ALWAYS save report and notify on failure
    await this.report.uploadToS3();
    await this.report.saveOnDatabase();
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const slackMessage = this.createErrorMessage(tournament, errorMessage);
    await this.report.sendNotification(slackMessage);
    
    Profiling.error({
      source: 'DATA_PROVIDER_V2_TEAM_create',
      error: error instanceof Error ? error : new Error(errorMessage),
    });
    
    throw error;
  }
}
```

### 4. Minimal API Layer

Keep the API endpoint thin - only validation and delegation:

```typescript
// admin/api/teams.ts
export const API_ADMIN_TEAMS = {
  async createTeams(req: Request, res: Response) {
    // #1 Start Reporter
    const reporter = new DataProviderReport('create_teams');
    // #2 Start Provider
    const provider = await TeamDataProviderService.create(reporter);
    
    try {
      // #3 Validate Input
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required'
        });
      }
      
      // #4 Get Tournament and set on reporter
      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found'
        });
      }
      
      provider.report.setTournament({
        label: tournament.label,
        id: tournament.id,
        provider: 'sofascore'
      });
      
      // #5 Delegate to Service
      await provider.createTeams(tournament, req.body.teamIds);
      
      return res.status(201).json({
        success: true,
        message: 'Teams created successfully',
        data: { reportUrl: reporter.reportUrl }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create teams',
        error: (error as Error).message
      });
    }
  }
}
```

### 5. Asset Validation

Always validate external assets aren't fallback/dummy values:

```typescript
private async fetchTeamLogos(teams: Team[]): Promise<Team[]> {
  const op = this.report.createOperation('scraping', 'fetch_team_logos');
  const results = [];
  
  for (const team of teams) {
    const s3Key = await this.scraper.uploadAsset({
      logoUrl: this.getTeamLogoUrl(team.id),
      filename: `team-${team.id}`
    });
    
    // Validate we got real asset, not dummy
    if (s3Key.startsWith('dummy-path/')) {
      op.fail({ 
        error: `Failed to fetch logo for team ${team.name}`,
        teamId: team.id,
        attemptedUrl: this.getTeamLogoUrl(team.id)
      });
      throw new Error(`Failed to fetch team logos`);
    }
    
    results.push({
      ...team,
      logo: this.scraper.getCloudFrontUrl(s3Key)
    });
  }
  
  op.success({ processedTeams: results.length });
  return results;
}
```

### 6. Database Operations Pattern

Track database operations with meaningful data:

```typescript
private async saveTeamsToDatabase(teams: TeamInput[]): Promise<Team[]> {
  const op = this.report.createOperation('database', 'create_teams');
  
  try {
    const result = await QUERIES_TEAM.bulkCreateTeams(teams);
    
    op.success({ 
      createdCount: result.length,
      teamIds: result.map(t => t.id)
    });
    
    return result;
  } catch (error) {
    const errorMessage = (error as Error).message;
    op.fail({ error: errorMessage });
    
    Profiling.error({
      error: errorMessage,
      data: { error: errorMessage },
      source: 'DATA_PROVIDER_V2_TEAM_database'
    });
    
    throw error;
  }
}
```

### 7. Consistent Slack Notifications

#### Success Messages
```typescript
private createSuccessMessage(teams: Team[]): SlackMessage {
  return {
    text: `⚽ Teams Created`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚽ TEAMS CREATED'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tournament:* ${this.report.tournament?.label}`
          },
          {
            type: 'mrkdwn',
            text: `*Teams Created:* ${teams.length}`
          },
          {
            type: 'mrkdwn',
            text: `*Operations:* ${this.report.summary.successfulOperations}/${this.report.summary.totalOperations} successful`
          },
          {
            type: 'mrkdwn',
            text: `*Provider:* SofaScore`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Report: <${this.report.reportUrl}|View Full Report>`
          }
        ]
      }
    ]
  };
}
```

#### Error Messages
```typescript
private createErrorMessage(tournament: Tournament, errorMessage: string): SlackMessage {
  return {
    text: `❌ Team Creation Failed`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ TEAM CREATION FAILED'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tournament:* ${tournament.label}`
          },
          {
            type: 'mrkdwn',
            text: `*Error:* ${errorMessage}`
          },
          {
            type: 'mrkdwn',
            text: `*Operations:* ${this.report.summary.failedOperations} failed, ${this.report.summary.successfulOperations} successful`
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Report: <${this.report.reportUrl}|View Full Report>`
          }
        ]
      }
    ]
  };
}
```

## Key Principles

### 1. Always Complete Reporting Flow
- Even on errors, upload report to S3 and save to database
- Send notifications with error details
- Use null UUID (`00000000-0000-0000-0000-000000000000`) for failed operations

### 2. Track Operations Granularly
- Each network call gets its own operation
- Include meaningful data in success/failure tracking
- Use consistent operation types: `scraping`, `transformation`, `database`

### 3. Validate External Data
- Check for dummy/fallback values in assets
- Mark operations as failed if external resources unavailable
- Don't proceed with invalid data

### 4. Keep API Layer Thin
- Business logic belongs in service layer
- API only handles validation and delegation
- Always return report URL for traceability

### 5. Ensure Observability
- Every operation produces a report with detailed information
- Reports are saved to S3 and database
- Slack notifications provide immediate feedback
- All errors are logged with context

### 6. Use Consistent Error Handling
- Same pattern across all data providers
- Graceful degradation with complete reporting
- Proper error propagation to API layer

## File Structure

```
src/domains/data-provider/
├── services/
│   ├── standings.ts      ✅ Reference implementation
│   ├── tournaments.ts    ✅ Reference implementation  
│   └── teams.ts         📝 Follow the same pattern
├── api/
└── routes/

src/domains/admin/
├── api/
│   ├── standings.ts     ✅ Reference implementation
│   ├── tournaments.ts   ✅ Reference implementation
│   └── teams.ts        📝 Follow the same pattern
└── routes/
    └── v2.ts           📝 Add team routes
```

This pattern ensures consistency, maintainability, and full observability across all data provider operations.