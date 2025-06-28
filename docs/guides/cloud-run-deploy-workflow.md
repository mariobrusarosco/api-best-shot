# Cloud Run Deploy Workflow Guide

## Overview

This guide explains how to:

- Monitor your Cloud Run deployments triggered by GitHub Actions
- Add and manage environment variables for your Cloud Run service via the deployment workflow

---

## 🎓 Monitoring Cloud Run Deployments

### Why Monitor Deployments?

- **Visibility:** Know when and why deployments succeed or fail
- **Debugging:** Quickly identify and resolve issues
- **Auditability:** Track who deployed what and when

### How to Monitor

#### 1. **GitHub Actions UI**

- Go to your repository → **Actions** tab
- Click on the latest run of your `Deploy to Cloud Run` workflow
- Review logs for each step (checkout, auth, build, push, deploy)
- **Failures** are highlighted; click to expand for error details

#### 2. **Cloud Run Console**

- Go to [Google Cloud Console → Cloud Run](https://console.cloud.google.com/run)
- Select your service (e.g., `api-best-shot-demo`)
- Click on **Revisions** to see deployment history
- Click on a revision to view logs, environment, and traffic allocation

#### 3. **Cloud Logging**

- In Cloud Run, click **Logs** to view real-time and historical logs
- Filter by severity (INFO, ERROR, etc.)
- Use logs to debug startup issues, request errors, and more

#### 4. **Notifications (Optional)**

- You can add steps in your workflow to notify Slack, email, or other channels on deploy success/failure

---

## 🎓 Managing Environment Variables via Workflow

### Why Set Environment Variables in Cloud Run?

- **Configuration:** Control app behavior without code changes
- **Secrets:** Store API keys, DB credentials, etc. securely
- **Environment Separation:** Use different values for dev, staging, prod

### How to Add Environment Variables in the Workflow

#### 1. **Edit the Deploy Step in Your Workflow**

Add the `env_vars` input to the `google-github-actions/deploy-cloudrun@v2` step:

```yaml
- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2
  with:
    service: api-best-shot-demo
    image: gcr.io/api-best-shot-demo/api-best-shot-demo:${{ github.sha }}
    region: us-central1
    env_vars: |
      NODE_ENV=production
      API_VERSION=v1
      JWT_SECRET=${{ secrets.JWT_SECRET }}
      DB_STRING_CONNECTION=${{ secrets.DB_STRING_CONNECTION }}
      # Add more as needed
```

- **Tip:** Use `${{ secrets.YOUR_SECRET }}` for sensitive values.
- **Multi-line:** Each variable on a new line.

#### 2. **Best Practices**

- **Never hardcode secrets** in the workflow file; always use GitHub Secrets.
- **Document required variables** in your README or a dedicated config guide.
- **Review Cloud Run console** after deploy to confirm variables are set.

#### 3. **Updating Variables**

- Edit the workflow and push changes, or manually update in the Cloud Run console for one-off changes.

---

## 🎯 Example: Full Deploy Step with Env Vars

```yaml
- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2
  with:
    service: api-best-shot-demo
    image: gcr.io/api-best-shot-demo/api-best-shot-demo:${{ github.sha }}
    region: us-central1
    env_vars: |
      NODE_ENV=production
      API_VERSION=v1
      JWT_SECRET=${{ secrets.JWT_SECRET }}
      DB_STRING_CONNECTION=${{ secrets.DB_STRING_CONNECTION }}
      AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY=${{ secrets.AWS_SECRET_ACCESS_KEY }}
      AWS_BUCKET_NAME=${{ secrets.AWS_BUCKET_NAME }}
      AWS_CLOUDFRONT_URL=${{ secrets.AWS_CLOUDFRONT_URL }}
      SENTRY_DSN=${{ secrets.SENTRY_DSN }}
      ADMIN_TOKEN=${{ secrets.ADMIN_TOKEN }}
```

---

## 🌊 Data Flow: How Variables Get to Your App

1. **Workflow triggers deploy**
2. **Env vars are set** in the deploy step
3. **Cloud Run revision is created** with these variables
4. **Your app reads them** via `process.env` at runtime

---

## 🔗 Related Guides

- [Google Container Registry Guide](./google-container-registry.md)
- [Environment Configuration](./environment-configuration.md)
- [Playwright Production Guide](./playwright-production.md)

---

## 🛡️ Production Tips

- **Rotate secrets** regularly
- **Use least privilege** for service accounts
- **Monitor logs** for unauthorized access or errors
- **Automate notifications** for failed deploys

---

## ✅ Summary

- Monitor deploys via GitHub Actions and Cloud Run console
- Add/update environment variables in your workflow for safe, repeatable config
- Use GitHub Secrets for all sensitive values

Happy deploying! 🚀
