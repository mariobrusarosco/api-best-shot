# AWS Lambda Deployment Guide for Best Shot Scheduler

This comprehensive guide covers both automated and manual AWS Lambda deployment processes for the Best Shot tournament automation system.

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Architecture Overview](#-architecture-overview)
3. [Prerequisites](#-prerequisites)
4. [Automated Deployment (GitHub Actions)](#-automated-deployment-github-actions)
5. [Manual Deployment](#-manual-deployment)
6. [Lambda Functions](#-lambda-functions)
7. [Lambda Layers](#-lambda-layers)
8. [IAM Roles & Permissions](#-iam-roles--permissions)
9. [Environment Variables](#-environment-variables)
10. [Testing & Monitoring](#-testing--monitoring)
11. [Troubleshooting](#-troubleshooting)
12. [Best Practices](#-best-practices)

## 🚀 Quick Start

### Automated Deployment (Recommended)
The project includes automated Lambda deployments via GitHub Actions that trigger on:
- Push to `main` or `feat/aws-scheduler` branches
- Changes to files in `src/lambdas/`
- Manual workflow dispatch

### Manual Deployment (Local)
```bash
# Deploy all functions and layers
./scripts/deploy-lambdas.sh

# Deploy specific function only
./scripts/deploy-lambdas.sh caller-scores-and-standings

# Deploy only layers
./scripts/deploy-lambdas.sh --layers-only

# Deploy only functions (skip layers)
./scripts/deploy-lambdas.sh --functions-only
```

## 🏗️ Architecture Overview

The Best Shot scheduler uses AWS Lambda functions triggered by EventBridge Scheduler to update match scores and tournament standings.

### Components
- **3 Lambda Functions**: `caller-daily-routine`, `caller-scores-and-standings`, `caller-knockouts-update`
- **2 Lambda Layers**: `best-shot-main` (metadata), `sentry` (monitoring)
- **EventBridge Scheduler**: Creates and manages scheduled jobs
- **IAM Roles**: Permissions for Lambda execution and EventBridge scheduling

### File Structure
```
src/lambdas/
├── caller-daily-routine.mjs           # Daily scheduler function
├── caller-scores-and-standings.mjs    # Match scores & standings function
├── caller-knockouts-update.mjs        # Knockout function
└── layers/
    ├── best-shot-main/
    │   └── nodejs.zip                  # Metadata configuration
    └── sentry/
        └── nodejs.zip                  # Monitoring layer
```

## 🔧 Prerequisites

### Required Tools
```bash
# AWS CLI (configured with your credentials)
aws --version

# Node.js and npm (for dependencies)
node --version
npm --version

# Zip utility for packaging
zip --version
```

### 1. AWS Credentials Setup
```bash
# Configure AWS CLI with your credentials
aws configure
# AWS Access Key ID: AKIA5FTZC2ASW4UHKD64
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1
# Default output format: json

# OR set environment variables:
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
```

### 2. GitHub Secrets (for CI/CD)
Add these secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key

**To add secrets:**
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the AWS credentials

## 🔄 Automated Deployment (GitHub Actions)

### Workflow Features
- **Smart change detection**: Only deploys functions/layers that changed
- **Matrix deployment**: Parallel deployment of multiple functions  
- **Environment support**: Deploy to demo or production
- **Layer management**: Automatic layer versioning and updates
- **Testing**: Verifies deployment success
- **Summary reports**: Clear deployment status

### Workflow Triggers
```yaml
# Automatic triggers
on:
  push:
    branches: [main, feat/aws-scheduler]
    paths: ['src/lambdas/**']

# Manual trigger
workflow_dispatch:
  inputs:
    environment:
      type: choice
      options: [demo, production]
```

### Manual Workflow Execution
1. Go to your GitHub repo → Actions tab
2. Select "Deploy AWS Lambda Functions" workflow
3. Click "Run workflow"
4. Choose environment (demo/production)
5. Click "Run workflow"

### Deployment Process
1. **Layer Deployment**: Detects changes in `src/lambdas/layers/` and publishes new versions
2. **Function Deployment**: Updates function code and attaches latest layer versions
3. **Change Detection**: Only deploys what changed
   ```yaml
   # Example: Only caller-scores-and-standings changed
   ✅ caller-scores-and-standings: Deploy
   ⏭️ caller-knockouts-update: Skip
   ⏭️ layers: Skip
   ```

## 🛠️ Manual Deployment

### Creating Lambda Functions

> ⚠️ **CRITICAL**: Always ensure the `--handler` parameter matches the filename exactly (without .mjs extension). Using `index.handler` will cause "Cannot find module" errors.

#### Function 1: caller-daily-routine
```bash
cd src/lambdas
zip caller-daily-routine.zip caller-daily-routine.mjs

aws lambda create-function \
    --function-name caller-daily-routine \
    --runtime nodejs20.x \
    --role arn:aws:iam::905418297381:role/root-scheduler \
    --handler caller-daily-routine.handler \
    --zip-file fileb://caller-daily-routine.zip \
    --description "Creates daily match schedules at 00:01 UTC" \
    --timeout 30 \
    --memory-size 256 \
    --region us-east-1
```

#### Function 2: caller-scores-and-standings
```bash
cd src/lambdas
zip caller-scores-and-standings.zip caller-scores-and-standings.mjs

aws lambda create-function \
    --function-name caller-scores-and-standings \
    --runtime nodejs20.x \
    --role arn:aws:iam::905418297381:role/root-scheduler \
    --handler caller-scores-and-standings.handler \
    --zip-file fileb://caller-scores-and-standings.zip \
    --description "Updates match scores and tournament standings" \
    --timeout 30 \
    --memory-size 256 \
    --region us-east-1
```

#### Function 3: caller-knockouts-update
```bash
cd src/lambdas
zip caller-knockouts-update.zip caller-knockouts-update.mjs

aws lambda create-function \
    --function-name caller-knockouts-update \
    --runtime nodejs20.x \
    --role arn:aws:iam::905418297381:role/root-scheduler \
    --handler caller-knockouts-update.handler \
    --zip-file fileb://caller-knockouts-update.zip \
    --description "Updates knockout tournament brackets" \
    --timeout 30 \
    --memory-size 256 \
    --region us-east-1
```

### Quick Function Update (Testing)
```bash
# Quick update for testing
cd src/lambdas
zip caller-scores-and-standings.zip caller-scores-and-standings.mjs

aws lambda update-function-code \
  --function-name caller-scores-and-standings \
  --zip-file fileb://caller-scores-and-standings.zip \
  --region us-east-1
```

## 📦 Lambda Layers

### Layer 1: best-shot-main
**Purpose**: Contains metadata configuration for different environments.

**Creating/Updating the Layer**:
```bash
# Navigate to the layer directory
cd src/lambdas/layers/best-shot-main/nodejs

# Install/update dependencies (if needed)
npm install

# Create the zip file
cd ..
zip -r nodejs.zip nodejs/

# Deploy to AWS (create new version)
aws lambda publish-layer-version \
    --layer-name best-shot-main \
    --description "Best Shot main layer with metadata and utilities" \
    --zip-file fileb://nodejs.zip \
    --compatible-runtimes nodejs18.x nodejs20.x \
    --region us-east-1
```

### Layer 2: sentry
**Purpose**: Contains Sentry monitoring and error tracking dependencies.

**Creating/Updating the Layer**:
```bash
# Navigate to the layer directory
cd src/lambdas/layers/sentry/nodejs

# Install/update dependencies
npm install

# Create the zip file
cd ..
zip -r nodejs.zip nodejs/

# Deploy to AWS
aws lambda publish-layer-version \
    --layer-name sentry \
    --description "Sentry monitoring layer for error tracking" \
    --zip-file fileb://nodejs.zip \
    --compatible-runtimes nodejs18.x nodejs20.x \
    --region us-east-1
```

### Adding Layers to Functions
```bash
# Get the latest layer versions
MAIN_LAYER_ARN=$(aws lambda list-layer-versions --layer-name best-shot-main --query 'LayerVersions[0].LayerVersionArn' --output text --region us-east-1)
SENTRY_LAYER_ARN=$(aws lambda list-layer-versions --layer-name sentry --query 'LayerVersions[0].LayerVersionArn' --output text --region us-east-1)

# Update function configuration with layers (repeat for all functions)
aws lambda update-function-configuration \
    --function-name caller-scores-and-standings \
    --layers $MAIN_LAYER_ARN $SENTRY_LAYER_ARN \
    --region us-east-1
```

## 🔐 IAM Roles & Permissions

### Required Role: root-scheduler
**ARN**: `arn:aws:iam::905418297381:role/root-scheduler`

**Required Permissions**:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:us-east-1:905418297381:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "lambda:InvokeFunction"
            ],
            "Resource": [
                "arn:aws:lambda:us-east-1:905418297381:function:caller-daily-routine",
                "arn:aws:lambda:us-east-1:905418297381:function:caller-scores-and-standings",
                "arn:aws:lambda:us-east-1:905418297381:function:caller-knockouts-update"
            ]
        }
    ]
}
```

**Trust Policy**:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": [
                    "lambda.amazonaws.com",
                    "scheduler.amazonaws.com"
                ]
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

## 🌍 Environment Variables

### Required Environment Variables for All Functions
```bash
# Set environment variables for all functions
aws lambda update-function-configuration \
    --function-name FUNCTION_NAME \
    --environment Variables='{
        "INTERNAL_SERVICE_TOKEN":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MjUxNjIzOTAyMn0.dSUMFqVYh9uIZ-XiBcMFi9iyMms7cyYpwlLa9MjhHNw",
        "DATA_PROVIDER_COOKIE_PRODUCTION":"your-production-cookie",
        "DATA_PROVIDER_COOKIE_DEMO":"your-demo-cookie",
        "SENTRY_DSN":"https://99725970cd0e2e7f72a680239f535935@o4506356341276672.ingest.us.sentry.io/4508562415157248"
    }' \
    --region us-east-1
```

## 🧪 Testing & Monitoring

### Manual Testing
```bash
# Test caller-scores-and-standings
aws lambda invoke \
    --function-name caller-scores-and-standings \
    --payload '{
        "standingsUrl": "http://localhost:9090/api/v2/data-provider/tournaments/test-123/standings",
        "roundUrl": "http://localhost:9090/api/v2/data-provider/tournaments/test-123/matches/round-1",
        "targetEnv": "demo",
        "tournamentId": "test-123",
        "roundSlug": "round-1"
    }' \
    --region us-east-1 \
    response.json

# Check response
cat response.json
```

### View Deployment Logs
- **GitHub Actions**: Go to repo → Actions → Select workflow run
- **AWS Console**: Lambda → Functions → Select function → Monitoring

### Check Function Status
```bash
aws lambda get-function-configuration \
  --function-name caller-scores-and-standings \
  --region us-east-1
```

### View Function Logs
```bash
# List log streams
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/caller-scores-and-standings" \
  --region us-east-1

# View log events
aws logs get-log-events \
  --log-group-name "/aws/lambda/caller-scores-and-standings" \
  --log-stream-name "STREAM_NAME" \
  --region us-east-1
```

### EventBridge Scheduler Management
```bash
# List all schedules
aws scheduler list-schedules --region us-east-1

# List schedules in a specific group
aws scheduler list-schedules \
    --group-name "scores-and-standings-routine" \
    --region us-east-1

# Delete a schedule
aws scheduler delete-schedule \
    --name "your-schedule-name" \
    --group-name "scores-and-standings-routine" \
    --region us-east-1
```

## 🚨 Troubleshooting

### ⚠️ CRITICAL: Handler Configuration Issue

**THE MOST COMMON AND CRITICAL ERROR** is incorrect handler configuration. This will completely break all Lambda functions.

#### The Problem
Lambda functions were failing with `Cannot find module 'index'` errors because handlers were configured as `index.handler` instead of the actual filename.

#### Correct Handler Configuration
**ALWAYS** ensure the handler matches the actual filename:

```bash
# ✅ CORRECT - Handler matches filename
--handler caller-daily-routine.handler           # For caller-daily-routine.mjs
--handler caller-scores-and-standings.handler    # For caller-scores-and-standings.mjs  
--handler caller-knockouts-update.handler        # For caller-knockouts-update.mjs

# ❌ WRONG - This will cause "Cannot find module" errors
--handler index.handler                           # DON'T USE THIS
```

#### How to Fix Handler Issues
```bash
# Check current handler configuration
aws lambda get-function-configuration \
    --function-name caller-scores-and-standings \
    --query 'Handler' \
    --output text \
    --region us-east-1

# Fix incorrect handler (if it shows "index.handler")
aws lambda update-function-configuration \
    --function-name caller-scores-and-standings \
    --handler caller-scores-and-standings.handler \
    --region us-east-1

# Verify all functions have correct handlers
for func in caller-daily-routine caller-scores-and-standings caller-knockouts-update; do
    echo "Function: $func"
    aws lambda get-function-configuration \
        --function-name $func \
        --query 'Handler' \
        --output text \
        --region us-east-1
    echo "Should be: $func.handler"
    echo "---"
done
```

#### Prevention
- **ALWAYS** double-check handler configuration when creating functions
- **NEVER** use generic handlers like `index.handler` 
- **VERIFY** handler matches filename exactly (without .mjs extension)

### Common Issues

1. **"Function not found" Error**
   ```bash
   # Verify function exists
   aws lambda list-functions --region us-east-1 | grep caller-scores
   ```

2. **"Role does not exist" Error**
   - Check IAM role ARN: `arn:aws:iam::905418297381:role/root-scheduler`
   - Verify role has correct trust policy

3. **"Module not found" Error**
   - Check layer versions are attached to function
   - Verify layer zip structure (`nodejs/` directory required)

4. **"Access Denied" Error**
   - Check AWS credentials are valid
   - Verify IAM permissions for Lambda operations

5. **"Timeout" Error**
   - Increase function timeout (max 15 minutes)
   - Check API endpoint availability

6. **"Layer not found" Error**
   ```bash
   # List available layers
   aws lambda list-layers --region us-east-1
   ```

7. **GitHub Actions Failing**
   - Check AWS secrets are properly set
   - Verify branch/path filters in workflow
   - Check AWS account limits

### Debug Commands
```bash
# Check current AWS account
aws sts get-caller-identity

# List all Lambda functions
aws lambda list-functions --region us-east-1

# List layer versions
aws lambda list-layer-versions --layer-name best-shot-main --region us-east-1

# Get function details
aws lambda get-function --function-name caller-scores-and-standings --region us-east-1

# Get function configuration
aws lambda get-function-configuration \
    --function-name caller-scores-and-standings \
    --region us-east-1

# List function layers
aws lambda get-function \
    --function-name caller-scores-and-standings \
    --query 'Configuration.Layers' \
    --region us-east-1

# Check EventBridge schedules
aws scheduler list-schedules \
    --max-results 50 \
    --region us-east-1
```

## 📝 Best Practices

### 1. Development Workflow
```
Local Changes → Test Locally → Commit → Push → Auto Deploy
```

### 2. Branch Strategy
- `main`: Production deployments
- `feat/*`: Feature branches (deploy to demo)
- Always test in demo before merging to main

### 3. Layer Updates
- Update layers when dependencies change
- Test layer compatibility before deploying
- Keep layer sizes minimal

### 4. Environment Variables
- Use GitHub environments for different stages
- Store secrets securely in GitHub Secrets
- Never commit credentials to code

### 5. Local Development
```bash
# Install dependencies for layers
cd src/lambdas/layers/best-shot-main/nodejs
npm install

cd ../sentry/nodejs  
npm install
```

### 6. Monitoring
- Use Sentry for structured logging and error tracking
- Monitor CloudWatch metrics for performance
- Set up alerts for function failures

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [EventBridge Scheduler Documentation](https://docs.aws.amazon.com/scheduler/)
- [AWS CLI Lambda Commands](https://docs.aws.amazon.com/cli/latest/reference/lambda/)
- [Environment Management Guide](../ENVIRONMENT_MANAGEMENT.md)

---

**Last Updated**: August 2025  
**Version**: 2.1 (Merged comprehensive guide)  
**Author**: Senior Engineer Documentation