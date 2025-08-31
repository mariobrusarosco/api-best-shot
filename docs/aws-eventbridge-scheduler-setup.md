# AWS EventBridge Scheduler Setup Guide

## Overview

This document explains how to configure AWS EventBridge Scheduler integration for the Best Shot API admin scheduling system. EventBridge Scheduler allows us to create, manage, and execute scheduled tasks (cron jobs) that trigger Lambda functions at specific times.

## Architecture

```
Admin API → EventBridge Scheduler → Lambda Function → API Callback
    ↓              ↓                      ↓             ↓
Database      Schedule Group         AWS Lambda    Tournament Updates
```

## Core Components

### 1. EventBridge Scheduler
- **Service**: Amazon EventBridge Scheduler
- **Purpose**: Creates and manages scheduled tasks with cron expressions
- **Features**: 
  - Flexible scheduling (one-time, recurring, rate-based)
  - Automatic retries and dead letter queues
  - Built-in error handling and monitoring

### 2. Schedule Groups
EventBridge organizes schedules into groups for better management:

- `scores-and-standings-routine` - For tournament standings updates
- `knockouts-update` - For knockout tournament bracket updates
- `daily-update` - For daily routine tasks
- `default` - Fallback group

### 3. Lambda Functions
Target functions that get invoked by the scheduler:

- `caller-scores-and-standings` - Updates match scores and standings
- `caller-knockouts-update` - Updates knockout tournament brackets
- `caller-daily-routine` - Performs daily maintenance tasks

## IAM Configuration

### Required Permissions

#### 1. IAM Role for EventBridge Scheduler (`root-scheduler`)

This role is assumed by EventBridge Scheduler to invoke Lambda functions:

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

**Attached Policies:**
- Custom policy with Lambda invoke permissions
- CloudWatch Logs permissions for monitoring
- SQS permissions for dead letter queue

#### 2. User/Application Permissions (`best-shot-node-client-s3`)

The API application needs these permissions to manage schedules:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PassRoleToScheduler",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::905418297381:role/root-scheduler"
    },
    {
      "Sid": "EventBridgeSchedulerPermissions",
      "Effect": "Allow",
      "Action": [
        "scheduler:CreateSchedule",
        "scheduler:DeleteSchedule",
        "scheduler:GetSchedule",
        "scheduler:ListSchedules",
        "scheduler:UpdateSchedule",
        "scheduler:CreateScheduleGroup",
        "scheduler:DeleteScheduleGroup",
        "scheduler:GetScheduleGroup",
        "scheduler:ListScheduleGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

## Why This Configuration?

### 1. **PassRole Permission**
```json
"Action": "iam:PassRole",
"Resource": "arn:aws:iam::905418297381:role/root-scheduler"
```

**Why needed**: When creating a schedule, EventBridge Scheduler needs to assume a role to invoke Lambda functions. The application must have permission to "pass" this role to the scheduler service.

**Security**: This follows the principle of least privilege - the application can only pass a specific, pre-configured role rather than any role.

### 2. **EventBridge Scheduler Actions**

- `CreateSchedule` - Create new scheduled tasks
- `DeleteSchedule` - Remove completed or cancelled schedules  
- `GetSchedule` - Retrieve schedule details for monitoring
- `ListSchedules` - List all schedules in a group
- `UpdateSchedule` - Modify existing schedules
- Schedule Group actions - Manage organizational containers

### 3. **Lambda Invoke Flow**

1. **API Request** → Admin creates a schedule job
2. **EventBridge Scheduler** → Creates schedule with cron expression
3. **Role Assumption** → Scheduler assumes `root-scheduler` role
4. **Lambda Invocation** → Role permissions allow Lambda function calls
5. **Callback** → Lambda function calls back to API with results

## Setup Process

### Step 1: Create IAM Role for Scheduler

```bash
# Create trust policy
cat > trust-policy.json <<EOF
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
EOF

# Create the role
aws iam create-role \
  --role-name root-scheduler \
  --assume-role-policy-document file://trust-policy.json
```

### Step 2: Create and Attach Permissions Policy

```bash
# Create scheduler permissions policy
aws iam create-policy \
  --policy-name BestShotSchedulerPermissions \
  --policy-document file://scheduler-permissions-policy.json

# Attach to user
aws iam attach-user-policy \
  --user-name best-shot-node-client-s3 \
  --policy-arn arn:aws:iam::905418297381:policy/BestShotSchedulerPermissions
```

### Step 3: Configure Schedule Groups

Schedule groups must exist before creating schedules. They can be created via:
- AWS Console (EventBridge → Scheduler → Schedule groups)
- AWS CLI
- Application code (with proper permissions)

## Common Issues and Solutions

### 1. `ResourceNotFoundException: Schedule group does not exist`

**Problem**: Trying to create a schedule in a non-existent group.

**Solution**: 
- Verify group names match exactly (case-sensitive)
- Create missing schedule groups
- Update code to use correct group names

### 2. `AccessDeniedException: not authorized to perform: iam:PassRole`

**Problem**: Application lacks permission to pass the scheduler role.

**Solution**: Add the `PassRole` permission for the specific scheduler role.

### 3. `AWSCompromisedKeyQuarantineV3` Policy Blocking Actions

**Problem**: AWS detected potentially compromised credentials and attached a quarantine policy that denies all IAM operations.

**Solution**: 
- Remove quarantine policy via AWS Console (root user access required)
- Create new IAM user with fresh credentials
- Review security practices to prevent future compromises

## Monitoring and Debugging

### CloudWatch Metrics
- Schedule execution success/failure rates
- Lambda function invocation metrics
- Error rates and retry attempts

### Application Logs
- Schedule creation/deletion events
- Lambda callback results
- Slack notifications for job status

### Dead Letter Queue
Failed schedule executions are sent to SQS dead letter queue for analysis and potential retry.

## Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=905418297381
AWS_SCHEDULER_ROLE_NAME=root-scheduler

# Slack Notifications
SLACK_WEBHOOK_JOB_SCHEDULE_URL=https://hooks.slack.com/services/...
```

## Security Best Practices

1. **Least Privilege**: Only grant minimum required permissions
2. **Resource-Specific ARNs**: Use specific resource ARNs where possible
3. **Role Separation**: Separate roles for different services/functions
4. **Regular Auditing**: Review IAM permissions periodically
5. **Credential Rotation**: Regularly rotate access keys
6. **Monitoring**: Set up CloudWatch alerts for unusual activity

## Troubleshooting Commands

```bash
# Verify AWS CLI configuration
aws sts get-caller-identity

# List attached user policies
aws iam list-attached-user-policies --user-name best-shot-node-client-s3

# Check schedule groups
aws scheduler list-schedule-groups --region us-east-1

# View specific schedule
aws scheduler get-schedule --name SCHEDULE_ID --group-name GROUP_NAME

# Test Lambda permissions
aws lambda invoke --function-name caller-scores-and-standings test-output.json
```

This configuration enables secure, scalable, and monitored scheduling of tournament data updates through AWS EventBridge Scheduler.