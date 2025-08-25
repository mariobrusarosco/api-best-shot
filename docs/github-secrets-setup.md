# GitHub Secrets Setup Guide

This document lists all the GitHub secrets required for the CI/CD pipeline to work correctly.

## Required GitHub Secrets

### Railway Configuration
| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `RAILWAY_TOKEN` | Railway API token for deployments | Railway Dashboard → Account Settings → Tokens → Create New Token |
| `RAILWAY_PROJECT_ID` | Railway project ID (used for all environments) | Railway Dashboard → Your Project → Settings → Project ID |

### Database Configuration
| Secret Name | Description | Where to Find |
|------------|-------------|---------------|
| `DEMO_DB_PASSWORD` | Supabase demo database password | Supabase Dashboard → Demo Project → Settings → Database |
| `STAGING_DB_PASSWORD` | Supabase staging database password | Supabase Dashboard → Staging Project → Settings → Database |
| `PROD_DB_PASSWORD` | Supabase production database password | Supabase Dashboard → Production Project → Settings → Database |

### Sentry Configuration
| Secret Name | Description | How to Create |
|------------|-------------|---------------|
| `SENTRY_AUTH_TOKEN_DEMO` | Sentry auth token for demo environment | Sentry.io → Settings → Account → API → Auth Tokens → Create Token (with `project:write`, `release:admin`, `organization:read` scopes) |
| `SENTRY_AUTH_TOKEN_STAGING` | Sentry auth token for staging environment | Same as above, create separate token for staging |
| `SENTRY_AUTH_TOKEN_PROD` | Sentry auth token for production environment | Same as above, create separate token for production |

### Slack Notifications
| Secret Name | Description | How to Create |
|------------|-------------|---------------|
| `SLACK_WEBHOOK_URL_DEMO` | Slack webhook for demo deployments | api.slack.com/apps → Create App → Incoming Webhooks → Add to Workspace |
| `SLACK_WEBHOOK_URL_STAGING` | Slack webhook for staging deployments | Same as above, can use same app or create separate |
| `SLACK_WEBHOOK_URL_PROD` | Slack webhook for production deployments | Same as above, can use same app or create separate |

## How to Add Secrets to GitHub

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Enter the secret name (exactly as listed above)
5. Enter the secret value
6. Click **"Add secret"**

## Verification Checklist

Use this checklist to ensure all secrets are configured:

- [ ] RAILWAY_TOKEN
- [ ] RAILWAY_PROJECT_ID
- [ ] DEMO_DB_PASSWORD
- [ ] STAGING_DB_PASSWORD
- [ ] PROD_DB_PASSWORD
- [ ] SENTRY_AUTH_TOKEN_DEMO
- [ ] SENTRY_AUTH_TOKEN_STAGING
- [ ] SENTRY_AUTH_TOKEN_PROD
- [ ] SLACK_WEBHOOK_URL_DEMO
- [ ] SLACK_WEBHOOK_URL_STAGING
- [ ] SLACK_WEBHOOK_URL_PROD

## Notes

- **Railway Project IDs**: Look like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Sentry Auth Tokens**: Start with `sntrys_` followed by a long string
- **Slack Webhooks**: Look like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
- **Database Passwords**: Usually long alphanumeric strings from Supabase

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Rotate tokens regularly** especially if compromised
3. **Use environment-specific tokens** for better isolation
4. **Limit token scopes** to minimum required permissions
5. **Monitor token usage** in respective dashboards

## Troubleshooting

If deployments are failing:

1. Check GitHub Actions logs for which secret is missing
2. Verify the secret name matches exactly (case-sensitive)
3. Ensure no extra spaces in secret values
4. For Railway: Verify project IDs are correct
5. For Sentry: Ensure token has correct scopes
6. For Slack: Test webhook with curl command first