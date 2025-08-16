# GitHub Secrets Setup Guide

## **Required GitHub Repository Secrets**

This guide shows all secrets required for the CI/CD pipeline to function properly.

**⚠️ IMPORTANT**: Before following this guide, check your GitHub repository's existing secrets first!

---

## **📋 Required Secrets Overview**

The CI/CD pipeline requires exactly **3 secrets** in your GitHub repository:

1. `GCP_SA_KEY` - Google Cloud Service Account key
2. `DB_STRING_CONNECTION_DEMO` - Demo database connection string
3. `DB_STRING_CONNECTION_STAGING` - Staging database connection string

---

## **🔍 First: Check Existing Secrets**

Before adding secrets, verify what you already have:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Check which of these 3 secrets already exist:
   - `GCP_SA_KEY`
   - `DB_STRING_CONNECTION_DEMO`
   - `DB_STRING_CONNECTION_STAGING`

**Only add the secrets you're missing!**

---

## **🛠️ How to Add Missing Secrets**

For each secret you're missing, follow these steps:

### **Step 1: Access GitHub Secrets**

1. Go to your GitHub repository
2. Click **Settings** (repository settings, not account)
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**

### **Step 2: Add the Missing Secret**

#### **If missing: `GCP_SA_KEY`**

- **Name**: `GCP_SA_KEY`
- **Value**: Google Cloud Service Account JSON key
- **How to get**:
  1. Go to Google Cloud Console
  2. Navigate to **IAM & Admin** → **Service Accounts**
  3. Find your existing service account or create a new one
  4. Click **Actions** → **Create Key** → **JSON**
  5. Download the JSON file and copy its entire content
- Click **Add secret**

#### **If missing: `DB_STRING_CONNECTION_DEMO`**

- **Name**: `DB_STRING_CONNECTION_DEMO`
- **Value**: Your Supabase demo database connection string
- **How to get**:
  1. Go to your Supabase dashboard
  2. Select your **demo** project
  3. Navigate to **Settings** → **Database**
  4. Copy the **Connection string** (use Transaction pooler)
- Click **Add secret**

#### **If missing: `DB_STRING_CONNECTION_STAGING`**

- **Name**: `DB_STRING_CONNECTION_STAGING`
- **Value**: Your Supabase staging database connection string
  ```
  postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
  ```
- **How to get**:
  1. Go to your Supabase dashboard
  2. Select your **staging** project
  3. Navigate to **Settings** → **Database**
  4. Copy the **Connection string** (use Transaction pooler)
- Click **Add secret**

---

## **✅ Verification**

After adding any missing secrets, verify you have all 3 required secrets:

```
Repository Secrets (3 required)
├── DB_STRING_CONNECTION_DEMO
├── DB_STRING_CONNECTION_STAGING
└── GCP_SA_KEY
```

**All 3 must be present for the CI/CD pipeline to work correctly.**

---

## **Important Notes**

### **Why Only 3 Secrets?**

- **Google Cloud secrets** (jwt-secret, sentry-dsn, etc.) are stored in Google Secret Manager
- **GitHub only needs** database connections for migrations + GCP authentication
- **Cloud Run** pulls other secrets directly from Secret Manager

### **Secret Usage**

| Secret                         | Used By             | Purpose                      |
| ------------------------------ | ------------------- | ---------------------------- |
| `GCP_SA_KEY`                   | All workflows       | Authenticate to Google Cloud |
| `DB_STRING_CONNECTION_DEMO`    | Demo deployments    | Run migrations on demo DB    |
| `DB_STRING_CONNECTION_STAGING` | Staging deployments | Run migrations on staging DB |

### **Security Best Practices**

- ✅ Never commit these values to code
- ✅ Use different database connections for each environment
- ✅ Rotate secrets periodically
- ✅ Limit repository access to trusted developers

---

## **Testing Your Setup**

Once you've added the secret, you can test by:

1. Creating a pull request (tests demo deployment)
2. Merging to main branch (tests staging deployment)
3. Checking the Actions tab for successful runs

---

## **📝 Quick Summary**

**Required Setup:**

1. **Check existing secrets** in your GitHub repository first
2. **Add only the missing secrets** from the required list of 3
3. **Verify all 3 secrets are present** before running CI/CD

**The 3 required secrets:**

- `GCP_SA_KEY` - Google Cloud authentication
- `DB_STRING_CONNECTION_DEMO` - Demo database migrations
- `DB_STRING_CONNECTION_STAGING` - Staging database migrations

**Important**: All other application secrets (jwt-secret, sentry-dsn, aws keys, etc.) are managed in Google Cloud Secret Manager, not GitHub. 🎉
