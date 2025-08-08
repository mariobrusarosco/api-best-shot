#!/bin/bash

# GCP Scheduler Deployment Script
# This script helps deploy the Cloud Functions and set up the necessary GCP resources

set -e

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-"your-project-id"}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}

echo "🚀 Deploying GCP Scheduler Resources"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Enable required APIs
echo "📡 Enabling required APIs..."
gcloud services enable cloudfunctions.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID
gcloud services enable appengine.googleapis.com --project=$PROJECT_ID

# Create App Engine app (required for Cloud Scheduler)
echo "🏗️  Creating App Engine app (required for Cloud Scheduler)..."
gcloud app create --region=$REGION --project=$PROJECT_ID || echo "App Engine app already exists"

# Deploy Cloud Functions
echo "☁️  Deploying Cloud Functions..."

cd cloud-functions

# Deploy scores and standings function
echo "Deploying scores-standings function..."
gcloud functions deploy scores-standings \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point scoresStandingsHandler \
  --region=$REGION \
  --project=$PROJECT_ID \
  --source .

# Deploy knockouts update function
echo "Deploying knockouts-update function..."
gcloud functions deploy knockouts-update \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point knockoutsUpdateHandler \
  --region=$REGION \
  --project=$PROJECT_ID \
  --source .

cd ..

# Get function URLs
echo "📋 Getting function URLs..."
SCORES_URL=$(gcloud functions describe scores-standings --region=$REGION --project=$PROJECT_ID --format="value(httpsTrigger.url)")
KNOCKOUTS_URL=$(gcloud functions describe knockouts-update --region=$REGION --project=$PROJECT_ID --format="value(httpsTrigger.url)")

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📝 Add these environment variables to your .env file:"
echo "GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID"
echo "GOOGLE_CLOUD_REGION=$REGION"
echo "GCP_SCORES_STANDINGS_FUNCTION_URL=$SCORES_URL"
echo "GCP_KNOCKOUTS_UPDATE_FUNCTION_URL=$KNOCKOUTS_URL"
echo ""
echo "🔧 Next steps:"
echo "1. Update your .env file with the variables above"
echo "2. Install the @google-cloud/scheduler dependency: yarn add @google-cloud/scheduler"
echo "3. Test the scheduler by calling the API endpoints"