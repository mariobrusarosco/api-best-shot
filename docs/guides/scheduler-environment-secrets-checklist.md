# Scheduler Environment and Secrets Checklist

Status: Active  
Scope: Staging, Demo, Production

## 1) Purpose

Use this checklist before enabling scheduler deployment in CI/CD.

Current constraint:

1. Scheduler imports `/Users/mariobrusarosco/coding/api-best-shot/src/config/env.ts`.
2. Env validation is shared with API.
3. Scheduler therefore requires the same runtime env vars currently required by API.

## 2) GitHub Actions Secrets (per environment)

Required for current deploy workflows:

1. `RAILWAY_TOKEN_STAGING`
2. `RAILWAY_TOKEN_DEMO`
3. `RAILWAY_TOKEN_PROD`
4. `DB_STRING_CONNECTION_STAGING`
5. `DB_STRING_CONNECTION_DEMO`
6. `DB_STRING_CONNECTION_PRODUCTION`
7. `SENTRY_AUTH_TOKEN` (build step)
8. `SLACK_DEPLOYMENTS_WEBHOOK` (notification step)

## 3) Railway Service Setup

Required service names:

1. API service: `api-best-shot`
2. Scheduler service: `api-best-shot-scheduler`

Required start commands:

1. API: `node dist/src/apps/api/index.js`
2. Scheduler: `node dist/src/apps/scheduler/index.js`

## 4) Scheduler Runtime Env Vars (currently required)

These must be present in scheduler service environment because validation is shared today:

1. `NODE_ENV`
2. `DB_STRING_CONNECTION`
3. `PORT` (or rely on default)
4. `API_VERSION` (or rely on default)
5. `API_DOMAIN`
6. `JWT_SECRET`
7. `MEMBER_PUBLIC_ID_COOKIE`
8. `ACCESS_CONTROL_ALLOW_ORIGIN`
9. `AWS_ACCESS_KEY_ID`
10. `AWS_SECRET_ACCESS_KEY`
11. `AWS_ACCOUNT_ID`
12. `AWS_BUCKET_NAME`
13. `AWS_CLOUDFRONT_URL`
14. `AWS_REGION` (or rely on default)
15. `SENTRY_DSN`
16. `INTERNAL_SERVICE_TOKEN`

## 5) Deployment Order Contract

For each environment, deployment must follow:

1. Deploy API service.
2. Run DB migrations once.
3. Deploy scheduler service.

## 6) Pre-Deploy Checklist

1. [ ] `api-best-shot-scheduler` service exists.
2. [ ] Scheduler start command is `node dist/src/apps/scheduler/index.js`.
3. [ ] All scheduler env vars in section 4 are set.
4. [ ] GitHub environment secrets in section 2 are present.
5. [ ] Workflow concurrency guard is enabled for this environment.
