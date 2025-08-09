# Lambda Deployment Guide

This guide covers the automated deployment process for AWS Lambda functions in the Best Shot project.

## 🚀 Quick Start

### Automated Deployment (GitHub Actions)
The project includes automated Lambda deployments that trigger on:
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

## 📋 Prerequisites

### 1. AWS Credentials Setup
Your AWS CLI must be configured with valid credentials:
```bash
aws configure
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

## 🏗️ Architecture

### Lambda Functions
- **caller-scores-and-standings**: Updates match scores and tournament standings
- **caller-knockouts-update**: Updates knockout tournament brackets

### Lambda Layers
- **best-shot-main**: Metadata configuration and utilities
- **sentry**: Monitoring and error tracking

### File Structure
```
src/lambdas/
├── caller-scores-and-standings.mjs    # Main function
├── caller-knockouts-update.mjs        # Knockout function
└── layers/
    ├── best-shot-main/
    │   └── nodejs.zip                  # Pre-built layer
    └── sentry/
        └── nodejs.zip                  # Pre-built layer
```

## 🔄 GitHub Actions Workflow

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

## 📁 Deployment Process

### 1. Layer Deployment
- Detects changes in `src/lambdas/layers/`
- Publishes new layer versions
- Updates layer ARNs

### 2. Function Deployment  
- Detects changes in function files
- Creates deployment packages (zip files)
- Updates function code
- Attaches latest layer versions
- Waits for function to be active
- Runs verification tests

### 3. Change Detection
The workflow intelligently detects what needs to be deployed:
```yaml
# Example: Only caller-scores-and-standings changed
✅ caller-scores-and-standings: Deploy
⏭️ caller-knockouts-update: Skip
⏭️ layers: Skip
```

## 🛠️ Local Development

### Testing Functions Locally
```bash
# Install dependencies for layers
cd src/lambdas/layers/best-shot-main/nodejs
npm install

cd ../sentry/nodejs  
npm install
```

### Manual Function Update (Quick)
```bash
# Quick update for testing
cd src/lambdas
zip caller-scores-and-standings.zip caller-scores-and-standings.mjs

aws lambda update-function-code \
  --function-name caller-scores-and-standings \
  --zip-file fileb://caller-scores-and-standings.zip \
  --region us-east-1
```

## 🔍 Monitoring & Debugging

### View Deployment Logs
- GitHub Actions: Go to repo → Actions → Select workflow run
- AWS Console: Lambda → Functions → Select function → Monitoring

### Check Function Status
```bash
aws lambda get-function-configuration \
  --function-name caller-scores-and-standings \
  --region us-east-1
```

### View Function Logs
```bash
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/caller-scores-and-standings" \
  --region us-east-1

aws logs get-log-events \
  --log-group-name "/aws/lambda/caller-scores-and-standings" \
  --log-stream-name "STREAM_NAME" \
  --region us-east-1
```

## 🚨 Troubleshooting

### Common Issues

1. **"Function not found" Error**
   ```bash
   # Verify function exists
   aws lambda list-functions --region us-east-1 | grep caller-scores
   ```

2. **"Access Denied" Error**
   - Check AWS credentials are valid
   - Verify IAM permissions for Lambda operations

3. **"Layer not found" Error**
   ```bash
   # List available layers
   aws lambda list-layers --region us-east-1
   ```

4. **GitHub Actions Failing**
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

## 🔗 Related Documentation

- [AWS Lambda Deployment Guide](./AWS_LAMBDA_DEPLOYMENT_GUIDE.md)
- [Environment Management](./ENVIRONMENT_MANAGEMENT.md)
- [Main Project README](./README.md)

---

**Last Updated**: $(date)  
**Version**: 1.0  
**Author**: Senior Engineer Documentation