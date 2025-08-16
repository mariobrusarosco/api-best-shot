# Environment Setup Guide - Manual Secret Configuration

## **Step-by-Step Secret Setup for Staging Environment**

This guide walks you through manually creating secrets in Google Cloud Console for the staging environment. This manual approach ensures complete control and prevents accidental overwrites.

---

## **Prerequisites**

Before starting, ensure you have:

- ✅ Created the staging project in Google Cloud
- ✅ Access to Google Cloud Console
- ✅ Your Supabase staging project credentials
- ✅ Existing demo environment secrets to reference

---

## **Required Secrets List**

You need to create these 6 secrets in Google Secret Manager:

1. **`db-connection-staging`** - Supabase staging database URL
2. **`jwt-secret`** - JWT signing secret (can reuse from demo)
3. **`sentry-dsn`** - Sentry error tracking URL (can reuse from demo)
4. **`aws-access-key`** - AWS access key ID (can reuse from demo)
5. **`aws-secret-key`** - AWS secret access key (can reuse from demo)
6. **`internal-service-token`** - Internal API token (can reuse from demo)

---

## **Step 1: Access Secret Manager**

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Select your project (e.g., `api-best-shot-main` or your project name)
3. Navigate to **Security** → **Secret Manager**
4. If first time, click **"Enable API"**

---

## **Step 2: Create Database Connection Secret**

This is the most important secret - your Supabase staging connection string.

### **Create `db-connection-staging`**:

1. Click **"+ CREATE SECRET"**
2. Fill in:
   - **Name**: `db-connection-staging`
   - **Secret value**: Your Supabase staging connection string
     ```
     postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
   - **Regions**: Leave as "Automatic" for replication
3. Click **"CREATE SECRET"**

### **Where to find Supabase connection string**:

1. Go to your Supabase dashboard
2. Select your staging project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI mode)
5. Make sure to use the **pooler** connection for better performance

---

## **Step 3: Create Shared Secrets**

These secrets can be the same across demo and staging environments.

### **Create `jwt-secret`**:

1. Click **"+ CREATE SECRET"**
2. Fill in:
   - **Name**: `jwt-secret`
   - **Secret value**: Your JWT signing secret (32+ characters)
   - If you need a new one:
     ```bash
     openssl rand -base64 32
     ```
3. Click **"CREATE SECRET"**

### **Create `sentry-dsn`**:

1. Click **"+ CREATE SECRET"**
2. Fill in:
   - **Name**: `sentry-dsn`
   - **Secret value**: Your Sentry DSN
     ```
     https://[key]@[organization].ingest.sentry.io/[project-id]
     ```
3. Click **"CREATE SECRET"**

### **Create `aws-access-key`**:

1. Click **"+ CREATE SECRET"**
2. Fill in:
   - **Name**: `aws-access-key`
   - **Secret value**: Your AWS access key ID
     ```
     AKIA...
     ```
3. Click **"CREATE SECRET"**

### **Create `aws-secret-key`**:

1. Click **"+ CREATE SECRET"**
2. Fill in:
   - **Name**: `aws-secret-key`
   - **Secret value**: Your AWS secret access key
3. Click **"CREATE SECRET"**

### **Create `internal-service-token`**:

1. Click **"+ CREATE SECRET"**
2. Fill in:
   - **Name**: `internal-service-token`
   - **Secret value**: Your internal API token
   - If you need a new one:
     ```bash
     openssl rand -hex 32
     ```
3. Click **"CREATE SECRET"**

---

## **Step 4: Grant Cloud Run Access**

After creating all secrets, you need to grant Cloud Run permission to access them.

### **Option A: Via Console (Easier)**

1. For each secret:
   - Click on the secret name
   - Go to **"PERMISSIONS"** tab
   - Click **"GRANT ACCESS"**
   - Add member: `[PROJECT-NUMBER]-compute@developer.gserviceaccount.com`
   - Role: **Secret Manager Secret Accessor**
   - Click **"SAVE"**

### **Option B: Via CLI (If you prefer)**

```bash
# Get your project number
PROJECT_ID="your-project-id"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Grant access to all secrets
for secret in db-connection-staging jwt-secret sentry-dsn aws-access-key aws-secret-key internal-service-token; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## **Step 5: Verify Your Setup**

### **Run the validation script** (we'll create this):

```bash
./scripts/validate-secrets.sh
```

### **Manual verification**:

1. Go to Secret Manager in Console
2. You should see all 6 secrets listed:
   ```
   ✓ aws-access-key
   ✓ aws-secret-key
   ✓ db-connection-staging
   ✓ internal-service-token
   ✓ jwt-secret
   ✓ sentry-dsn
   ```

---

## **Step 6: GitHub Repository Secrets**

You also need to add one secret to your GitHub repository for deployments:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add:
   - **Name**: `DB_STRING_CONNECTION_STAGING`
   - **Value**: Same as `db-connection-staging` secret value
5. Click **"Add secret"**

This is used for database migrations in the CI/CD pipeline.

---

## **Important Notes**

### **Security Best Practices**:

- ✅ Never commit secrets to code
- ✅ Use strong, unique values for each environment
- ✅ Rotate secrets periodically
- ✅ Limit access to Secret Manager

### **Naming Convention**:

- Environment-specific: `{name}-{environment}` (e.g., `db-connection-staging`)
- Shared secrets: `{name}` (e.g., `jwt-secret`)

### **What NOT to do**:

- ❌ Don't use Cloud Build to create/update secrets
- ❌ Don't use the same database connection for demo/staging
- ❌ Don't share these values in logs or error messages

---

## **Troubleshooting**

### **"Permission Denied" when deploying**:

- Ensure Cloud Run service account has Secret Manager Secret Accessor role
- Check the secret exists and has the correct name

### **"Secret not found"**:

- Verify secret name matches exactly (case-sensitive)
- Ensure you're in the correct project

### **Database connection fails**:

- Verify Supabase connection string is correct
- Check if you're using the pooler endpoint
- Ensure your Supabase project is active

---

## **Next Steps**

Once all secrets are created and verified:

1. ✅ Run the validation script
2. ✅ Test a deployment to staging
3. ✅ Verify the application connects to Supabase staging
4. ✅ Check Sentry is receiving events

---

## **Quick Reference**

| Secret Name              | Purpose        | Shared? | Example Format              |
| ------------------------ | -------------- | ------- | --------------------------- |
| `db-connection-staging`  | Supabase URL   | No      | `postgresql://...`          |
| `jwt-secret`             | JWT signing    | Yes     | 32+ char string             |
| `sentry-dsn`             | Error tracking | Yes     | `https://...@sentry.io/...` |
| `aws-access-key`         | AWS access     | Yes     | `AKIA...`                   |
| `aws-secret-key`         | AWS secret     | Yes     | 40 char string              |
| `internal-service-token` | Internal auth  | Yes     | 64 char hex string          |

Remember: Take your time, double-check values, and never rush secret configuration!
