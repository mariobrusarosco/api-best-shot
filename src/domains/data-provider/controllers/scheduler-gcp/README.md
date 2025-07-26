# Google Cloud Platform Scheduler

This is the GCP equivalent of the AWS scheduler implementation. It uses Google Cloud Scheduler instead of AWS EventBridge Scheduler and Cloud Functions instead of Lambda functions.

## Key Differences from AWS Implementation

### Services Used
- **AWS**: EventBridge Scheduler + Lambda Functions
- **GCP**: Cloud Scheduler + Cloud Functions

### Cron Format
- **AWS**: Uses AWS-specific cron format with 6 fields: `cron(minute hour day month day-of-week year)`
- **GCP**: Uses standard cron format with 5 fields: `minute hour day month day-of-week`

### Authentication
- **AWS**: Uses IAM roles and ARNs
- **GCP**: Uses service account credentials and project-based resource naming

### Job Naming
- **AWS**: Uses underscores in job names
- **GCP**: Uses hyphens in job names (GCP requirement)

## Environment Variables Required

```env
# GCP Project Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1

# Cloud Function URLs
GCP_SCORES_STANDINGS_FUNCTION_URL=https://your-region-your-project.cloudfunctions.net/scores-standings
GCP_KNOCKOUTS_UPDATE_FUNCTION_URL=https://your-region-your-project.cloudfunctions.net/knockouts-update

# Service Account (optional if running on GCP)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Setup Requirements

1. **Install Dependencies**
   ```bash
   yarn add @google-cloud/scheduler
   ```

2. **Enable APIs**
   - Cloud Scheduler API
   - Cloud Functions API

3. **Create Service Account** (if running outside GCP)
   - Grant `Cloud Scheduler Admin` role
   - Download service account key

4. **Deploy Cloud Functions**
   - Deploy functions for scores-standings and knockouts-update
   - Update environment variables with function URLs

## Usage

The API is identical to the AWS version:

```typescript
import { SchedulerGCPController } from '@/domains/data-provider/controllers/scheduler-gcp';

// Create daily schedules
await SchedulerGCPController.createDailyScoresAndStandingsRoutine();

// Create knockout updates
await SchedulerGCPController.createKnockoutsUpdatesRoutine(tournament);
```

## Cloud Function Targets

The scheduled jobs will make HTTP POST requests to your Cloud Functions with the following payload structure:

### Scores and Standings Function
```json
{
  "standingsUrl": "https://api.domain.com/v1/data-provider/tournaments/123/standings",
  "roundUrl": "https://api.domain.com/v1/data-provider/tournaments/123/matches/round-1",
  "targetEnv": "production"
}
```

### Knockouts Update Function
```json
{
  "knockoutsUpdateUrl": "https://api.domain.com/v1/data-provider/tournaments/123/rounds/knockout-update"
}
```