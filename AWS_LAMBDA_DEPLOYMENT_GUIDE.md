# AWS Lambda Deployment Guide for Best Shot Scheduler

This guide covers the complete AWS Lambda setup for the Best Shot scheduler system, including layers, functions, and deployment procedures.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Lambda Layers](#lambda-layers)
4. [Lambda Functions](#lambda-functions)
5. [IAM Roles & Permissions](#iam-roles--permissions)
6. [EventBridge Scheduler Setup](#eventbridge-scheduler-setup)
7. [Environment Variables](#environment-variables)
8. [Deployment Procedures](#deployment-procedures)
9. [Testing & Monitoring](#testing--monitoring)
10. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Best Shot scheduler uses AWS Lambda functions triggered by EventBridge Scheduler to update match scores and tournament standings. The architecture includes:

- **2 Lambda Functions**: `caller-scores-and-standings`, `caller-knockouts-update`
- **2 Lambda Layers**: `best-shot-main` (metadata), `sentry` (monitoring)
- **EventBridge Scheduler**: Creates and manages scheduled jobs
- **IAM Roles**: Permissions for Lambda execution and EventBridge scheduling

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

### AWS Credentials Setup
```bash
# Configure AWS CLI with your credentials
aws configure
# AWS Access Key ID: AKIA5FTZC2ASW4UHKD64
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1
# Default output format: json
```

## 📦 Lambda Layers

Lambda layers provide shared code and dependencies for your functions.

### Layer 1: best-shot-main

**Purpose**: Contains metadata configuration for different environments.

**Structure**:
```
src/lambdas/layers/best-shot-main/
├── nodejs.zip
└── nodejs/
    ├── metadata.mjs
    ├── package.json
    └── package-lock.json
```

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

# Note the LayerVersionArn from the response - you'll need it for Lambda functions
```

### Layer 2: sentry

**Purpose**: Contains Sentry monitoring and error tracking dependencies.

**Structure**:
```
src/lambdas/layers/sentry/
├── nodejs.zip
└── nodejs/
    ├── instrument.mjs
    ├── package.json
    └── package-lock.json
```

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

## 🔧 Lambda Functions

### Function 1: caller-scores-and-standings

**Purpose**: Updates match scores and tournament standings after games complete.

**Creating the Function**:
```bash
# Navigate to lambdas directory
cd src/lambdas

# Zip the function code
zip caller-scores-and-standings.zip caller-scores-and-standings.mjs

# Create the Lambda function
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

**Adding Layers to Function**:
```bash
# Get the latest layer versions
MAIN_LAYER_ARN=$(aws lambda list-layer-versions --layer-name best-shot-main --query 'LayerVersions[0].LayerVersionArn' --output text --region us-east-1)
SENTRY_LAYER_ARN=$(aws lambda list-layer-versions --layer-name sentry --query 'LayerVersions[0].LayerVersionArn' --output text --region us-east-1)

# Update function configuration with layers
aws lambda update-function-configuration \
    --function-name caller-scores-and-standings \
    --layers $MAIN_LAYER_ARN $SENTRY_LAYER_ARN \
    --region us-east-1
```

### Function 2: caller-knockouts-update

**Purpose**: Updates knockout/elimination tournament brackets.

**Creating the Function**:
```bash
# Navigate to lambdas directory
cd src/lambdas

# Zip the function code
zip caller-knockouts-update.zip caller-knockouts-update.mjs

# Create the Lambda function
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

# Add layers (using same layer ARNs from above)
aws lambda update-function-configuration \
    --function-name caller-knockouts-update \
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
                "arn:aws:lambda:us-east-1:905418297381:function:caller-scores-and-standings",
                "arn:aws:lambda:us-east-1:905418297381:function:caller-knockouts-update"
            ]
        }
    ]
}
```

**Trust Policy** (allows EventBridge Scheduler to assume this role):
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

## ⏰ EventBridge Scheduler Setup

EventBridge Scheduler is managed by your API, but you can also manage it via CLI:

### List Current Schedules
```bash
# List all schedules
aws scheduler list-schedules --region us-east-1

# List schedules in a specific group
aws scheduler list-schedules \
    --group-name "scores-and-standings-routine" \
    --region us-east-1
```

### Delete a Schedule
```bash
aws scheduler delete-schedule \
    --name "your-schedule-name" \
    --group-name "scores-and-standings-routine" \
    --region us-east-1
```

## 🌍 Environment Variables

### Lambda Function Environment Variables

**Required for all Lambda functions**:
```bash
# Set environment variables for caller-scores-and-standings
aws lambda update-function-configuration \
    --function-name caller-scores-and-standings \
    --environment Variables='{
        "INTERNAL_SERVICE_TOKEN":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MjUxNjIzOTAyMn0.dSUMFqVYh9uIZ-XiBcMFi9iyMms7cyYpwlLa9MjhHNw",
        "DATA_PROVIDER_COOKIE_PRODUCTION":"your-production-cookie",
        "DATA_PROVIDER_COOKIE_DEMO":"your-demo-cookie",
        "SENTRY_DSN":"https://99725970cd0e2e7f72a680239f535935@o4506356341276672.ingest.us.sentry.io/4508562415157248"
    }' \
    --region us-east-1

# Set environment variables for caller-knockouts-update
aws lambda update-function-configuration \
    --function-name caller-knockouts-update \
    --environment Variables='{
        "INTERNAL_SERVICE_TOKEN":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MjUxNjIzOTAyMn0.dSUMFqVYh9uIZ-XiBcMFi9iyMms7cyYpwlLa9MjhHNw",
        "DATA_PROVIDER_COOKIE_PRODUCTION":"your-production-cookie",
        "DATA_PROVIDER_COOKIE_DEMO":"your-demo-cookie",
        "SENTRY_DSN":"https://99725970cd0e2e7f72a680239f535935@o4506356341276672.ingest.us.sentry.io/4508562415157248"
    }' \
    --region us-east-1
```

## 🚀 Deployment Procedures

### Initial Deployment (First Time)

1. **Create IAM Role** (if not exists):
```bash
# Create role with trust policy
aws iam create-role \
    --role-name root-scheduler \
    --assume-role-policy-document file://trust-policy.json \
    --region us-east-1

# Attach policies
aws iam attach-role-policy \
    --role-name root-scheduler \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    --region us-east-1
```

2. **Deploy Layers** (follow layer creation steps above)

3. **Deploy Functions** (follow function creation steps above)

4. **Set Environment Variables** (follow environment setup above)

### Updating Existing Functions

**Update Function Code**:
```bash
# Update caller-scores-and-standings
cd src/lambdas
zip caller-scores-and-standings.zip caller-scores-and-standings.mjs

aws lambda update-function-code \
    --function-name caller-scores-and-standings \
    --zip-file fileb://caller-scores-and-standings.zip \
    --region us-east-1

# Update caller-knockouts-update
zip caller-knockouts-update.zip caller-knockouts-update.mjs

aws lambda update-function-code \
    --function-name caller-knockouts-update \
    --zip-file fileb://caller-knockouts-update.zip \
    --region us-east-1
```

**Update Layers**:
```bash
# Update layer (creates new version)
aws lambda publish-layer-version \
    --layer-name best-shot-main \
    --zip-file fileb://nodejs.zip \
    --compatible-runtimes nodejs18.x nodejs20.x \
    --region us-east-1

# Get new layer ARN and update functions
MAIN_LAYER_ARN=$(aws lambda list-layer-versions --layer-name best-shot-main --query 'LayerVersions[0].LayerVersionArn' --output text --region us-east-1)

aws lambda update-function-configuration \
    --function-name caller-scores-and-standings \
    --layers $MAIN_LAYER_ARN $SENTRY_LAYER_ARN \
    --region us-east-1
```

## 🧪 Testing & Monitoring

### Manual Testing

**Test Function Directly**:
```bash
# Test caller-scores-and-standings
aws lambda invoke \
    --function-name caller-scores-and-standings \
    --payload '{
        "standingsUrl": "http://localhost:9090/api/v2/data-provider/tournaments/test-123/standings",
        "roundUrl": "http://localhost:9090/api/v2/data-provider/tournaments/test-123/matches/round-1",
        "targetEnv": "demo"
    }' \
    --region us-east-1 \
    response.json

# Check response
cat response.json
```

### Monitoring

**View Logs**:
```bash
# View recent logs
aws logs describe-log-groups \
    --log-group-name-prefix "/aws/lambda/caller-scores-and-standings" \
    --region us-east-1

# Get specific log stream
aws logs describe-log-streams \
    --log-group-name "/aws/lambda/caller-scores-and-standings" \
    --region us-east-1

# View log events
aws logs get-log-events \
    --log-group-name "/aws/lambda/caller-scores-and-standings" \
    --log-stream-name "2024/08/09/[\$LATEST]abc123" \
    --region us-east-1
```

### CloudWatch Metrics

Check function performance in AWS Console:
- **Invocations**: Number of times function was called
- **Duration**: Execution time
- **Errors**: Function failures
- **Throttles**: Rate limiting events

## 🔧 Troubleshooting

### Common Issues

1. **"Role does not exist" Error**:
   - Check IAM role ARN: `arn:aws:iam::905418297381:role/root-scheduler`
   - Verify role has correct trust policy

2. **"Module not found" Error**:
   - Check layer versions are attached to function
   - Verify layer zip structure (`nodejs/` directory required)

3. **"Timeout" Error**:
   - Increase function timeout (max 15 minutes)
   - Check API endpoint availability

4. **"Permission denied" Error**:
   - Verify IAM role permissions
   - Check EventBridge Scheduler permissions

### Debug Commands

```bash
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

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [EventBridge Scheduler Documentation](https://docs.aws.amazon.com/scheduler/)
- [AWS CLI Lambda Commands](https://docs.aws.amazon.com/cli/latest/reference/lambda/)

---

**Last Updated**: $(date)  
**Version**: 2.0 (Internal Token Authentication)  
**Author**: Senior Engineer Documentation