# Cloud Build Trigger Fix

## Problem Found
Your trigger `429cafa9-3418-4861-80f7-8ab849275caf` is using **automatic Cloud Run deployment** instead of your `cloudbuild.yaml` file.

This means:
- ❌ No secrets are being set
- ❌ No environment variables configured  
- ❌ No memory/timeout optimizations
- ❌ Uses Artifact Registry instead of Container Registry

## Solution: Update via Console

1. **Go to Cloud Build Triggers**: https://console.cloud.google.com/cloud-build/triggers
2. **Find your trigger**: `rmgpgab-api-best-shot-demo-us-central1-mariobrusarosco-api-bmiu`
3. **Click "Edit"**
4. **Change Configuration**:
   - **Type**: Cloud Build configuration file (yaml or json)
   - **Location**: Repository 
   - **Cloud Build configuration file location**: `/cloudbuild.yaml`
5. **Save**

## Alternative: CLI Commands
```bash
# Delete old trigger
gcloud builds triggers delete 429cafa9-3418-4861-80f7-8ab849275caf

# Create new trigger pointing to cloudbuild.yaml
gcloud builds triggers create github \
  --repo-name=api-best-shot \
  --repo-owner=mariobrusarosco \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml \
  --name=api-best-shot-demo-trigger
```

## Verification
After fixing, the next deployment will:
✅ Use your Dockerfile with Playwright
✅ Set all environment variables and secrets
✅ Apply memory/timeout optimizations
✅ Push to Container Registry (gcr.io) as expected