# Phase 1: Playwright Production Deployment

This document outlines the step-by-step plan for deploying our API with Playwright to Railway.com.

## Tasks

- [ ] Test Docker build locally
- [ ] Configure Railway.com project
- [ ] Deploy application to Railway.com
- [ ] Verify Playwright functionality
- [ ] Set up monitoring

## Detailed Steps

### 1. Test Docker Build Locally

Before deploying to Railway.com, it's essential to test the Docker build locally to ensure Playwright functions correctly:

```bash
# Run the test script
./scripts/test-docker-build.ps1

# Verify the health endpoint
curl http://localhost:9090/health/playwright
```

**Expected outcome**: The health endpoint should return a status of "UP" for both the API and Playwright checks.

### 2. Configure Railway.com Project

1. Log in to Railway.com dashboard
2. Create a new project (or select existing project)
3. Configure environment variables:

   - `NODE_ENV=production`
   - `PORT=9090`
   - All required database connection variables
   - AWS credentials for S3 file storage

4. Configure resources:
   - At least 1GB of RAM
   - 1 CPU minimum
   - Allocate sufficient disk space (minimum 1GB)

### 3. Deploy Application to Railway.com

1. Connect the GitHub repository to Railway:

   ```
   https://github.com/mariobrusarosco/api-best-shot
   ```

2. Push the Docker configuration:

   ```bash
   git push origin main
   ```

3. Initiate the deployment in Railway dashboard or via CLI:

   ```bash
   railway up
   ```

4. Monitor the build logs to ensure Playwright installations succeed

### 4. Verify Playwright Functionality

Once deployed, verify that Playwright is working correctly:

1. Check the health endpoint:

   ```
   https://api-best-shot.mariobrusarosco.com/health/playwright
   ```

2. Test the data provider endpoints:

   ```
   https://api-best-shot.mariobrusarosco.com/api/v1/data-provider/...
   ```

3. Monitor logs for any Playwright-related errors

### 5. Set Up Monitoring

1. Configure Railway.com alerts for:

   - CPU usage > 80%
   - Memory usage > 80%
   - Failed health checks

2. Set up logs monitoring for Playwright-specific errors:
   - Browser launch failures
   - Navigation timeouts
   - Scraping errors

## Success Criteria

- [ ] Playwright health check returns "UP" status in production
- [ ] Data provider API endpoints return expected data
- [ ] Memory usage remains stable over time
- [ ] No browser crash errors in logs

## Rollback Plan

If deployment fails or Playwright doesn't work in production:

1. Roll back to the previous version via Railway dashboard
2. Check container logs to identify the specific issue
3. Fix locally and redeploy

## Resources

- [Railway.com Documentation](https://docs.railway.app/)
- [Playwright Docker Deployment Guide](docs/guides/playwright-production.md)
- [Architecture Decision Record](docs/decisions/playwright-production-deployment.md)
