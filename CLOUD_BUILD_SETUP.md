# Cloud Build Setup Instructions

## Step 1: Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Step 2: Set Up GitHub Connection

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers) in Google Cloud Console
2. Click **"Connect Repository"**
3. Select **GitHub** as source
4. Authenticate with GitHub and select your repository: `api-best-shot`
5. Click **"Connect"**

## Step 3: Create Build Trigger

1. Click **"Create Trigger"**
2. Configure:
   - **Name**: `deploy-to-cloud-run`
   - **Event**: Push to a branch
   - **Source**: Select your connected repository
   - **Branch**: `^main$`
   - **Configuration**: Cloud Build configuration file (yaml or json)
   - **Cloud Build configuration file location**: `/cloudbuild.yaml`
3. Click **"Create"**

## Step 4: Grant Cloud Build Permissions

```bash
PROJECT_ID="api-best-shot-demo"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Cloud Run Admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"

# Service Account User
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Secret Manager Access
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Step 5: Test the Pipeline

1. Push any commit to the `main` branch
2. Go to [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
3. Watch your build execute automatically

## Benefits of This Approach

✅ **Native Google integration** - no third-party dependencies  
✅ **Reliable secret handling** - built-in Secret Manager integration  
✅ **Enterprise-grade** - what Google uses internally  
✅ **Better IAM** - runs with proper Google service accounts  
✅ **Faster builds** - optimized for Google Cloud services

## Cleanup

You can now delete the `.github/workflows/` directory since Cloud Build handles CI/CD.
