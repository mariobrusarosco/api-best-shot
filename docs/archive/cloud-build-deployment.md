# Cloud Build Deployment Guide

## **Google Cloud Build + Cloud Run Architecture**

This guide explains how we use Cloud Build to deploy containerized applications to Google Cloud Run, including secret management and environment configuration.

---

## **Overview: CI/CD Flow**

```
GitHub Actions          Google Cloud Build         Google Cloud Run
┌─────────────┐        ┌──────────────┐          ┌─────────────┐
│   Trigger   │ ──────►│ Build & Push │ ────────►│   Deploy    │
│  Workflow   │        │    Image     │          │   Service   │
└─────────────┘        └──────────────┘          └─────────────┘
                              │                          │
                              ▼                          ▼
                       Container Registry         Running App + Secrets
```

---

## **Cloud Build Configuration Structure**

### **Basic Anatomy**

```yaml
# cloudbuild.yaml
steps: # Sequential build/deploy steps
  - name: 'gcr.io/...' # Docker image to run
    args: [...] # Command arguments
    id: 'step-id' # Optional step identifier
    waitFor: [...] # Dependencies on other steps

options: # Build configuration
  machineType: '...' # Build machine size
  logging: '...' # Logging configuration

timeout: '1200s' # Total build timeout
```

---

## **Deployment Architecture**

### **Multi-Environment Setup**

```
┌─────────────────────────────────────────────────────────┐
│                  Google Cloud Project                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  Cloud Run  │    │  Cloud Run  │    │  Cloud Run  │ │
│  │    Demo     │    │   Staging   │    │ Production  │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                   │                   │        │
│  ┌──────▼───────────────────▼───────────────────▼─────┐ │
│  │              Secret Manager                         │ │
│  │  • db-connection-demo                              │ │
│  │  • db-connection-staging                           │ │
│  │  • jwt-secret (shared)                             │ │
│  │  • sentry-dsn (shared)                             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## **Secret Management Strategy**

### **IMPORTANT: Manual Secret Creation Only**

We **NEVER** create or update secrets via Cloud Build. All secrets are created manually in Google Cloud Console to prevent accidental overwrites.

### **Secret Reference Pattern**

```yaml
# SAFE: Only reference existing secrets
- '--update-secrets=DB_STRING_CONNECTION=db-connection-staging:latest'
- '--update-secrets=JWT_SECRET=jwt-secret:latest'
# DANGEROUS: Never do this in Cloud Build
# - 'secrets create db-connection ...'  # NO!
# - 'secrets versions add ...'          # NO!
```

### **Secret Organization**

```
Secret Manager Structure:
├── Environment-Specific Secrets
│   ├── db-connection-demo         # Demo Supabase URL
│   ├── db-connection-staging      # Staging Supabase URL
│   └── db-connection-production   # Production Supabase URL
│
└── Shared Secrets (across environments)
    ├── jwt-secret                 # JWT signing key
    ├── sentry-dsn                 # Error tracking
    ├── aws-access-key             # AWS credentials
    ├── aws-secret-key             # AWS credentials
    └── internal-service-token     # Internal API auth
```

---

## **Cloud Run Deployment Options**

### **Resource Configuration**

```yaml
# Memory and CPU allocation
- '--memory=4Gi' # 4GB RAM
- '--cpu=2' # 2 vCPUs

# Scaling configuration
- '--max-instances=5' # Maximum containers
- '--min-instances=0' # Scale to zero (cost savings)

# Timeout and port
- '--timeout=900s' # Request timeout (15 min)
- '--port=8080' # Container port
```

### **Environment-Specific Settings**

| Setting           | Demo | Staging | Production |
| ----------------- | ---- | ------- | ---------- |
| **Memory**        | 4Gi  | 4Gi     | 4-8Gi      |
| **CPU**           | 2    | 2       | 2-4        |
| **Max Instances** | 10   | 5       | 20         |
| **Min Instances** | 0    | 0       | 1          |
| **Timeout**       | 900s | 900s    | 900s       |

---

## **Environment Variables vs Secrets**

### **Decision Tree**

```
Is it sensitive data?
├── YES ──► Use Secret Manager
│   └── Examples: passwords, API keys, tokens
│
└── NO ──► Use Environment Variables
    └── Examples: NODE_ENV, PORT, feature flags
```

### **Implementation**

```yaml
# Secrets (from Secret Manager)
- '--update-secrets=DB_STRING_CONNECTION=db-connection-staging:latest'
- '--update-secrets=JWT_SECRET=jwt-secret:latest'

# Environment Variables (non-sensitive)
- '--update-env-vars=NODE_ENV=staging'
- '--update-env-vars=PORT=8080'
- '--update-env-vars=API_VERSION=v2'
```

---

## **Build Process Visualization**

### **Step-by-Step Deployment**

```
1. GitHub Actions triggers Cloud Build
   │
   ├─► 2. Cloud Build receives image and config
   │   │
   │   ├─► 3. Deploy to Cloud Run
   │   │   ├── Pull Docker image
   │   │   ├── Attach secrets from Secret Manager
   │   │   ├── Set environment variables
   │   │   └── Start container
   │   │
   │   └─► 4. Add deployment labels
   │       └── Track commit, branch, timestamp
   │
   └─► 5. Service is live!
```

### **Timeline Example**

```
┌────────────────────────────────────────────────────────┐
│ Total Deployment Time: ~3-5 minutes                    │
├────────────────────────────────────────────────────────┤
│ GitHub Actions (1 min)  │ Cloud Build + Deploy (2-4 min)│
│ • Trigger build         │ • Pull image                  │
│ • Set substitutions     │ • Configure service           │
│ • Call Cloud Build      │ • Apply secrets               │
│                         │ • Rolling update              │
│                         │ • Health checks               │
└────────────────────────────────────────────────────────┘
```

---

## **Deployment Labels and Tracking**

### **Label Strategy**

```yaml
- '--update-labels=environment=staging,commit=${SHORT_SHA},branch=${BRANCH_NAME},deployed=${_DEPLOY_TIME}'
```

### **Benefits**

```
Service Labels:
├── environment: staging     # Quick environment identification
├── commit: abc123          # Git commit SHA
├── branch: main            # Source branch
└── deployed: 2024-03-15    # Deployment timestamp

Uses:
• Filtering in Cloud Console
• Cost attribution
• Deployment history
• Debugging/rollback
```

---

## **Common Patterns**

### **1. Blue-Green Deployment**

```yaml
# Deploy to new revision without traffic
- '--no-traffic'

# Later, shift traffic
- 'gcloud run services update-traffic api-best-shot-staging --to-latest'
```

### **2. Gradual Rollout**

```yaml
# Split traffic between revisions
- '--traffic=latest=10' # 10% to new version
```

### **3. Rollback Strategy**

```bash
# Quick rollback to previous revision
gcloud run services update-traffic api-best-shot-staging \
  --to-revisions=api-best-shot-staging-00001-abc=100
```

---

## **Troubleshooting Guide**

### **Common Issues**

#### **1. Secret Not Found**

```
ERROR: Secret [db-connection-staging] not found
```

**Solution**: Create the secret manually in Google Cloud Console first

#### **2. Insufficient Permissions**

```
ERROR: Cloud Run Admin role required
```

**Solution**: Grant proper IAM roles to the service account

#### **3. Container Fails to Start**

```
ERROR: Container failed to start
```

**Debug Steps**:

1. Check Cloud Run logs
2. Verify environment variables
3. Test container locally
4. Check health endpoint

### **Debugging Commands**

```bash
# View service details
gcloud run services describe api-best-shot-staging --region=us-central1

# Check recent revisions
gcloud run revisions list --service=api-best-shot-staging

# View logs
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=api-best-shot-staging" --limit=50
```

---

## **Best Practices**

### **1. Resource Sizing**

- **Start conservative**: Begin with lower resources, scale up based on metrics
- **Use autoscaling**: Let Cloud Run handle traffic spikes
- **Set min instances to 0** for non-production to save costs

### **2. Secret Management**

- **Never hardcode secrets** in cloudbuild.yaml
- **Use Secret Manager** for all sensitive data
- **Version secrets** with `:latest` for easy updates
- **Create secrets manually** to prevent accidents

### **3. Deployment Safety**

- **Test in staging first** before production
- **Use health checks** to verify deployments
- **Label deployments** for easy tracking
- **Keep timeout generous** (900s) for large containers

### **4. Cost Optimization**

```yaml
# Staging/Demo environments
- '--min-instances=0' # Scale to zero
- '--max-instances=5' # Limit scaling

# Production (when ready)
- '--min-instances=1' # Always warm
- '--max-instances=20' # Handle traffic
```

---

## **Summary**

Cloud Build provides a powerful, secure way to deploy to Cloud Run:

- ✅ **Automated deployments** triggered by GitHub Actions
- ✅ **Secure secret management** via Secret Manager (manual creation)
- ✅ **Environment isolation** with separate services
- ✅ **Cost-effective** with autoscaling and scale-to-zero
- ✅ **Easy rollbacks** with revision management

The key is maintaining clear separation between CI/CD automation and sensitive secret management, ensuring safe and reliable deployments.
