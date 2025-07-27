#!/bin/bash

# Deployment verification script
PROJECT_ID="api-best-shot-demo"

echo "🔍 Verifying Cloud Run deployment prerequisites..."

# Check if secrets exist with version 1
secrets=(
    "JWT_SECRET"
    "MEMBER_PUBLIC_ID_COOKIE" 
    "ACCESS_CONTROL_ALLOW_ORIGIN"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_BUCKET_NAME"
    "AWS_CLOUDFRONT_URL"
    "SENTRY_DSN"
    "ADMIN_TOKEN"
)

for secret in "${secrets[@]}"; do
    if gcloud secrets versions describe 1 --secret="$secret" &>/dev/null; then
        echo "✅ Secret $secret version 1 exists"
    else
        echo "❌ Secret $secret version 1 NOT found"
        echo "   Create it: echo 'your-value' | gcloud secrets create $secret --data-file=-"
    fi
done

# Check service account permissions
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "🔐 Checking IAM permissions for $SA_EMAIL..."

required_roles=(
    "roles/run.admin"
    "roles/secretmanager.secretAccessor"
    "roles/iam.serviceAccountUser"
    "roles/storage.admin"
)

for role in "${required_roles[@]}"; do
    if gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:serviceAccount:$SA_EMAIL AND bindings.role:$role" | grep -q "$role"; then
        echo "✅ $role assigned"
    else
        echo "❌ $role NOT assigned"
        echo "   Fix: gcloud projects add-iam-policy-binding $PROJECT_ID --member='serviceAccount:$SA_EMAIL' --role='$role'"
    fi
done

echo ""
echo "🚀 Once all checks pass, your deployment will succeed!"