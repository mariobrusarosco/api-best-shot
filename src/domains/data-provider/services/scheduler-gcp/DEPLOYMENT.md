# GCP Cloud Scheduler Deployment Guide

This guide helps you deploy the Cloud Functions and Cloud Scheduler to automate match data updates for the demo API at `https://api-best-shot-demo.mariobrusarosco.com`.

## Prerequisites

1. **GCP Project**: You need a Google Cloud Project with billing enabled
2. **gcloud CLI**: Install and authenticate with `gcloud auth login`
3. **Project permissions**: Cloud Functions Admin, Cloud Scheduler Admin, App Engine Admin

## Step 1: Set Your GCP Project

```bash
# Set your project ID
export GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"

# Authenticate with GCP
gcloud auth login
gcloud config set project $GOOGLE_CLOUD_PROJECT_ID
```

## Step 2: Deploy Cloud Functions

From your project root directory:

```bash
# Make deployment script executable
chmod +x src/domains/data-provider/services/scheduler-gcp/deploy.sh

# Run deployment
./src/domains/data-provider/services/scheduler-gcp/deploy.sh
```

This will:
- Enable required GCP APIs (Cloud Functions, Cloud Scheduler, App Engine)
- Create an App Engine app (required for Cloud Scheduler)
- Deploy two Cloud Functions:
  - `scores-standings`: Calls your API to update match scores and standings
  - `knockouts-update`: Calls your API to update knockout tournament data
- Output the function URLs for configuration

## Step 3: Update Production Environment

Add these variables to your production environment (where your API is deployed):

```bash
# From the deployment output
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_REGION="us-central1"
GCP_SCORES_STANDINGS_FUNCTION_URL="https://us-central1-your-project.cloudfunctions.net/scores-standings"
GCP_KNOCKOUTS_UPDATE_FUNCTION_URL="https://us-central1-your-project.cloudfunctions.net/knockouts-update"

# API configuration (already set in production)
API_DOMAIN="https://api-best-shot-demo.mariobrusarosco.com"
API_VERSION="/api/v2"
```

## Step 4: Install Dependencies

In your production environment, install the Cloud Scheduler client:

```bash
yarn add @google-cloud/scheduler
```

## Step 5: Test the System

1. **Test the daily scheduler endpoint:**
```bash
curl -X POST https://api-best-shot-demo.mariobrusarosco.com/api/v2/data-provider/scheduler/daily-setup
```

2. **Check Cloud Scheduler jobs:**
```bash
gcloud scheduler jobs list --location=us-central1
```

## How It Works

1. **Daily Setup**: Call `/api/v2/data-provider/scheduler/daily-setup` to create scheduled jobs for today's matches
2. **Automatic Execution**: Cloud Scheduler triggers Cloud Functions at match end times
3. **Data Updates**: Cloud Functions call your API endpoints to update match data
4. **Job Management**: Jobs are automatically created and can be managed via the API

## Monitoring

- **Cloud Functions logs**: `gcloud functions logs read scores-standings`
- **Cloud Scheduler jobs**: `gcloud scheduler jobs list`
- **API logs**: Check your production server logs

## Cost Estimation

- **Cloud Functions**: ~$0.40 per million requests
- **Cloud Scheduler**: ~$0.10 per job per month
- **Expected cost**: <$10/month for typical match scheduling

## Troubleshooting

1. **Permission errors**: Ensure your service account has the required roles
2. **App Engine errors**: App Engine app must exist in the same region
3. **Function timeouts**: Increase timeout in deployment script if needed
4. **API errors**: Check that your demo API is accessible from GCP

## Architecture

```
Daily Schedule Creation:
[Your API] → [Cloud Scheduler Jobs Created]

Match Data Updates:
[Cloud Scheduler] → [Cloud Function] → [Your API] → [Database Updated]
```