# CI/CD Workflow Guide

## **Complete CI/CD Pipeline with Docker Optimization**

This guide explains our multi-environment CI/CD pipeline that automatically deploys to Demo and Staging environments with optimized Docker builds.

---

## **Pipeline Overview**

```
GitHub Event                    CI/CD Pipeline                         Deployment
┌────────────┐                 ┌─────────────┐                      ┌──────────┐
│    PR      │ ───────────────►│ Quality     │                      │   Demo   │
│  Created   │                 │ Checks      │──►Build──►Deploy────►│  Cloud   │
└────────────┘                 └─────────────┘                      │   Run    │
                                                                     └──────────┘
┌────────────┐                 ┌─────────────┐                      ┌──────────┐
│   Main     │ ───────────────►│ Quality     │                      │ Staging  │
│   Merge    │                 │ Checks      │──►Build──►Deploy────►│  Cloud   │
└────────────┘                 └─────────────┘                      │   Run    │
                                                                     └──────────┘
```

---

## **Workflow Stages Breakdown**

### **Stage 1: Code Quality & Security Checks**

```
┌─────────────────────────────────────────────────────────────┐
│                    Quality Checks (2-3 min)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Lint   │  │  Type   │  │  Tests  │  │  Build  │       │
│  │  Code   │──│ Check   │──│  Run    │──│  Test   │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Security Checks                     │       │
│  │  • Dependency audit (non-blocking)              │       │
│  │  • Secret scanning (future)                     │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### **Stage 2: Docker Build with Caching**

```
┌─────────────────────────────────────────────────────────────┐
│                 Docker Build Process (1-4 min)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Source Changed Only (80% of builds):                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Cache   │  │  Copy    │  │  Build   │  │  Push    │  │
│  │  Deps    │──│  Source  │──│   App    │──│  Image   │  │
│  │ INSTANT  │  │   5s     │  │  30-60s  │  │   20s    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                         Total: 1-2 minutes                   │
│                                                              │
│  Dependencies Changed (20% of builds):                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Install  │  │  Copy    │  │  Build   │  │  Push    │  │
│  │  Deps    │──│  Source  │──│   App    │──│  Image   │  │
│  │  2-3min  │  │   5s     │  │  30-60s  │  │   20s    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                         Total: 3-4 minutes                   │
└─────────────────────────────────────────────────────────────┘
```

### **Stage 3: Environment-Specific Deployment**

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Logic                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  if (Pull Request):                                          │
│    ┌────────────┐     ┌─────────────┐     ┌──────────────┐ │
│    │   Build    │────►│   Deploy    │────►│     Demo     │ │
│    │   Image    │     │   to Demo   │     │ Environment  │ │
│    └────────────┘     └─────────────┘     └──────────────┘ │
│                                                              │
│  if (Main Branch):                                           │
│    ┌────────────┐     ┌─────────────┐     ┌──────────────┐ │
│    │   Build    │────►│  Deploy to  │────►│   Staging    │ │
│    │   Image    │     │   Staging   │     │ Environment  │ │
│    └────────────┘     └─────────────┘     └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## **Docker Caching Strategy**

### **How Docker Buildx Caching Works**

```
Container Registry Cache Storage
┌─────────────────────────────────────────────────────────────┐
│ gcr.io/api-best-shot-demo/                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Cache Layers:                                               │
│  ├── api-best-shot-demo:buildcache-deps                     │
│  │   └── node_modules (2-3 min to build)                    │
│  │                                                           │
│  ├── api-best-shot-demo:buildcache-prod-deps                │
│  │   └── production node_modules (1-2 min to build)         │
│  │                                                           │
│  └── api-best-shot-demo:latest                              │
│      └── Full application image                             │
│                                                              │
│  Build Process:                                              │
│  1. Check cache-deps → Found? Use it : Build new            │
│  2. Check cache-prod-deps → Found? Use it : Build new       │
│  3. Build final image using cached layers                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### **Cache Hit Scenarios**

```
Scenario 1: Only source code changed (Most common - 80%)
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Check     │  │    Use      │  │   Build     │  │    Push     │
│   Cache     │──│   Cached    │──│    App      │──│   Image     │
│   ✓ HIT     │  │    Deps     │  │   30-60s    │  │    20s      │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
                                    Total: ~1-2 minutes

Scenario 2: Dependencies changed (Less common - 20%)
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Check     │  │   Rebuild   │  │   Build     │  │    Push     │
│   Cache     │──│    Deps     │──│    App      │──│   Image     │
│   ✗ MISS    │  │   2-3 min   │  │   30-60s    │  │    20s      │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
                                    Total: ~3-4 minutes
```

---

## **Environment Deployment Flow**

### **Demo Environment (Pull Requests)**

```
Developer Creates PR
        │
        ▼
┌───────────────┐     ┌────────────────┐     ┌─────────────────┐
│ GitHub Event  │────►│ CI/CD Pipeline │────►│ Demo Deployment │
└───────────────┘     └────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                      ┌──────────────┐         ┌──────────────┐
                      │ Image Tagged │         │ Deploy with  │
                      │ pr-123-abc   │         │ Demo Secrets │
                      └──────────────┘         └──────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────┐
                                              │ Test Changes │
                                              │ in Isolation │
                                              └──────────────┘
```

### **Staging Environment (Main Branch)**

```
PR Merged to Main
        │
        ▼
┌───────────────┐     ┌────────────────┐     ┌─────────────────┐
│ GitHub Event  │────►│ CI/CD Pipeline │────►│ Staging Deploy  │
└───────────────┘     └────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                      ┌──────────────┐         ┌──────────────┐
                      │   Run DB     │         │ Deploy with  │
                      │  Migrations  │         │Staging Secret│
                      └──────────────┘         └──────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────┐
                                              │Health Check  │
                                              │ & Validate   │
                                              └──────────────┘
```

---

## **Complete Pipeline Timeline**

```
Pull Request Pipeline (Demo)
┌─────────────────────────────────────────────────────────────────────┐
│ 0min        2min         4min         6min         8min        10min│
├──────┬──────────┬───────────┬──────────┬───────────┬───────────────┤
│ Lint │ Security │   Build   │  Deploy  │  Health   │               │
│ Type │  Checks  │   Docker  │  to Demo │  Check    │     DONE      │
│ Test │          │   Image   │          │           │               │
└──────┴──────────┴───────────┴──────────┴───────────┴───────────────┘
       Quality         Docker        Cloud Run      Verify
       (2-3min)       (1-4min)       (2min)        (1min)

Main Branch Pipeline (Staging)
┌─────────────────────────────────────────────────────────────────────┐
│ 0min        2min         4min         6min         8min        10min│
├──────┬──────────┬───────────┬──────────┬───────────┬───────────────┤
│ Lint │ Security │   Build   │    DB    │  Deploy   │   Health      │
│ Type │  Checks  │   Docker  │ Migrate  │ Staging   │   Check       │
│ Test │          │   Image   │          │           │               │
└──────┴──────────┴───────────┴──────────┴───────────┴───────────────┘
       Quality         Docker      Migration    Cloud Run    Verify
       (2-3min)       (1-4min)      (1min)       (2min)     (1min)
```

---

## **Key Benefits**

### **1. Fast Builds**

- **Before**: 4-6 minutes every build
- **After**: 1-2 minutes for most builds (80% cache hit rate)
- **Savings**: 3-4 minutes per deployment

### **2. Environment Isolation**

```
Demo Environment          Staging Environment
├── Separate database     ├── Separate database
├── Isolated secrets      ├── Production-like data
├── PR-specific builds    ├── Latest main branch
└── Safe testing          └── Pre-production validation
```

### **3. Automatic Deployment**

- **PRs**: Automatically deployed to demo for testing
- **Main merges**: Automatically deployed to staging
- **No manual steps**: Everything is automated

### **4. Cost Efficiency**

- **Docker layer caching**: Reduces build compute time
- **Smart image tagging**: Efficient storage usage
- **Scale to zero**: Staging scales down when not in use

---

## **Troubleshooting**

### **Build Taking Too Long?**

1. Check if `package.json` or `yarn.lock` changed (invalidates cache)
2. Look for "CACHED" in build logs
3. Verify cache layers exist in Container Registry

### **Deployment Failed?**

1. Check GitHub Actions logs for specific error
2. Verify secrets are properly set
3. Check Cloud Build logs in Google Cloud Console

### **Health Check Failing?**

1. Check if database migrations ran successfully
2. Verify environment variables are set correctly
3. Look at Cloud Run logs for startup errors

---

## **Summary**

Our CI/CD pipeline provides:

- ✅ **80% faster builds** with Docker layer caching
- ✅ **Automatic deployments** based on Git events
- ✅ **Environment isolation** (Demo vs Staging)
- ✅ **Built-in health checks** for reliability
- ✅ **Cost-optimized** with smart caching and scaling

The pipeline ensures that every code change is tested, built efficiently, and deployed to the appropriate environment automatically.
