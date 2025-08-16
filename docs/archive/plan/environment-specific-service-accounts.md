# Environment-Specific Service Accounts Architecture

## **What Changed and Why**

### **🔥 The Problem We Solved**

**Before**: Single `GCP_SA_KEY` secret used for all environments

- GitHub Actions used one service account for both demo and staging
- Cross-project permission issues causing 403 Forbidden errors
- Security risk: one compromised key affects all environments

**After**: Environment-specific service accounts with proper isolation

- `GCP_SA_KEY_DEMO` for demo environment
- `GCP_SA_KEY_STAGING` for staging environment
- Better security: each environment isolated
- Proper permissions: each service account has minimal required access

---

## **🏗️ New Architecture**

### **Service Account Structure**

```
api-best-shot-demo (Project)
└── github-actions-demo@api-best-shot-demo.iam.gserviceaccount.com
    ├── Permissions in demo project:
    │   ├── roles/run.admin (deploy to Cloud Run)
    │   ├── roles/storage.admin (push/pull GCR images)
    │   └── roles/iam.serviceAccountUser (impersonate service accounts)
    └── Cross-project permissions:
        └── roles/storage.admin in staging project (for build job)

api-best-shot-staging (Project)
└── github-actions-staging@api-best-shot-staging.iam.gserviceaccount.com
    └── Permissions in staging project:
        ├── roles/run.admin (deploy to Cloud Run)
        ├── roles/storage.admin (push/pull GCR images)
        └── roles/iam.serviceAccountUser (impersonate service accounts)
```

### **GitHub Secrets**

```
Repository Secrets (4 required)
├── GCP_SA_KEY_DEMO ..................... Demo service account JSON key
├── GCP_SA_KEY_STAGING .................. Staging service account JSON key
├── DB_STRING_CONNECTION_DEMO ........... Demo database connection
└── DB_STRING_CONNECTION_STAGING ........ Staging database connection
```

---

## **🔄 Workflow Changes**

### **Build Process**

**Before:**

```yaml
# Single build job using generic service account
build-images:
  - Authenticate with GCP_SA_KEY
  - Build and push to both demo and staging registries
  - Often failed with 403 Forbidden on staging registry
```

**After:**

```yaml
# Build job uses demo service account (with cross-project access)
build-images:
  - Authenticate with GCP_SA_KEY_DEMO
  - Build and push to both demo and staging registries
  - Demo service account has explicit permission to staging registry
  - No more 403 Forbidden errors
```

### **Deployment Process**

**Before:**

```yaml
# All deployments used same service account
deploy-demo: uses GCP_SA_KEY
deploy-staging: uses GCP_SA_KEY
```

**After:**

```yaml
# Each deployment uses environment-specific service account
deploy-demo: uses GCP_SA_KEY_DEMO
deploy-staging: uses GCP_SA_KEY_STAGING
```

---

## **🔐 Security Improvements**

### **1. Environment Isolation**

- **Demo compromised**: Only affects demo environment
- **Staging compromised**: Only affects staging environment
- **Blast radius**: Reduced from "all environments" to "single environment"

### **2. Principle of Least Privilege**

- Each service account has **only** the permissions needed for its environment
- No unnecessary cross-project access (except build job)
- Clear audit trail per environment

### **3. Secret Rotation**

- Can rotate demo and staging keys **independently**
- No need to coordinate across environments
- Easier to track which environments are affected

---

## **📋 Migration Checklist**

If you're updating from the old single-key approach:

### **✅ Completed**

- [x] Created environment-specific service accounts
- [x] Generated separate JSON keys
- [x] Added `GCP_SA_KEY_DEMO` and `GCP_SA_KEY_STAGING` to GitHub
- [x] Updated GitHub Actions workflow
- [x] Granted cross-project permissions for build job
- [x] Updated documentation

### **🧹 Optional Cleanup**

- [ ] Remove old `GCP_SA_KEY` secret from GitHub (if it exists)
- [ ] Delete old service account (if no longer needed)
- [ ] Verify no hardcoded references to old key

---

## **🚀 Benefits Achieved**

### **1. Reliability**

- ✅ **No more 403 Forbidden errors** during staging builds
- ✅ **Clear error messages** when something goes wrong
- ✅ **Predictable deployments** across environments

### **2. Security**

- ✅ **Environment isolation** prevents cross-contamination
- ✅ **Minimal permissions** reduce attack surface
- ✅ **Independent key rotation** improves security posture

### **3. Maintainability**

- ✅ **Clear documentation** of which key does what
- ✅ **Easy troubleshooting** with environment-specific logs
- ✅ **Scalable approach** for adding production environment later

---

## **🔧 Troubleshooting**

### **403 Forbidden during build**

- Check: Does demo service account have `storage.admin` in staging project?
- Verify: Are you using `GCP_SA_KEY_DEMO` in the build job?

### **Deployment fails with "unauthorized"**

- Check: Are you using the correct key for the environment?
  - Demo: `GCP_SA_KEY_DEMO`
  - Staging: `GCP_SA_KEY_STAGING`
- Verify: Does the service account have `run.admin` in the target project?

### **Secret not found**

- Check: Are all 4 secrets present in GitHub repository settings?
- Verify: Secret names match exactly (case-sensitive)

---

## **🏆 Production Ready**

This architecture is **production-ready** and follows Google Cloud best practices:

- ✅ **Environment isolation** with separate service accounts
- ✅ **Least privilege** access controls
- ✅ **Audit trail** with environment-specific actions
- ✅ **Scalable** for adding more environments
- ✅ **Secure** key management practices

When you're ready to add production:

1. Create `api-best-shot-production` project
2. Create `github-actions-production` service account
3. Add `GCP_SA_KEY_PRODUCTION` secret
4. Update workflow for production deployments

The foundation is solid! 🎉
