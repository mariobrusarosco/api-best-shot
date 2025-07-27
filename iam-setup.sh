#!/bin/bash

# Service account setup for Cloud Run deployment
PROJECT_ID="api-best-shot-demo"
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Setting up IAM permissions for Cloud Run deployment..."

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser"

# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"

# Grant Container Registry/Artifact Registry access
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.admin"

echo "IAM setup complete!"
echo "Verify secrets exist with version 1:"
echo "gcloud secrets versions list JWT_SECRET"
echo "gcloud secrets versions list AWS_SECRET_ACCESS_KEY"