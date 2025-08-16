# Docker Build Optimization Guide

## **Multi-Layer Caching Strategy for Faster Builds**

This guide explains how our optimized Dockerfile reduces build times from 4-6 minutes to 1-3 minutes using Docker's layer caching mechanism.

---

## **Understanding Docker Layer Caching**

Docker builds images in layers. Each instruction in a Dockerfile creates a new layer. When rebuilding, Docker can reuse unchanged layers, skipping expensive operations.

### **Key Principle**: Separate what changes frequently from what changes rarely

```
┌─────────────────────────────────┐
│   Rarely Changes (Cache Hit)    │ ← Dependencies (node_modules)
├─────────────────────────────────┤
│   Often Changes (Cache Miss)    │ ← Source Code (src/)
└─────────────────────────────────┘
```

---

## **Our 4-Stage Build Strategy**

### **Visual Overview**

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Dependencies    │ ──► │     Builder      │ ──► │ Production Deps  │ ──► │   Production     │
│     Stage        │     │      Stage       │     │      Stage       │     │     Stage        │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ • package.json   │     │ • Uses cached    │     │ • package.json   │     │ • Prod deps only │
│ • yarn.lock      │     │   dependencies   │     │ • yarn.lock      │     │ • Built app      │
│ • yarn install   │     │ • Source code    │     │ • Production     │     │ • Minimal size   │
│   (ALL deps)     │     │ • yarn build     │     │   deps only      │     │ • Ready to run   │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
     ~2-3 min                  ~30-60s                   ~1-2 min                  ~10s
   (if changed)              (if changed)              (if changed)               (always)
```

---

## **Stage-by-Stage Breakdown**

### **Stage 1: Dependencies (Cached Layer)**

```dockerfile
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS dependencies
WORKDIR /app

# Only copy package files (cache key)
COPY package.json yarn.lock .yarnrc.yml ./

# Expensive operation - but cached!
RUN yarn install --immutable --frozen-lockfile
```

**When this rebuilds**: Only when `package.json` or `yarn.lock` changes
**Time saved**: ~2-3 minutes when dependencies haven't changed

### **Stage 2: Builder (Uses Cached Dependencies)**

```dockerfile
FROM dependencies AS builder

# Copy source code
COPY . .

# Build using pre-installed dependencies
RUN yarn build
```

**When this rebuilds**: When any source file changes
**Time saved**: Skips dependency installation entirely

### **Stage 3: Production Dependencies**

```dockerfile
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS prod-deps
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

# Only production dependencies (smaller)
RUN NODE_ENV=production yarn install --immutable --frozen-lockfile
```

**Purpose**: Smaller final image (no dev dependencies)
**Benefit**: ~30-40% smaller production image

### **Stage 4: Production Runtime**

```dockerfile
FROM mcr.microsoft.com/playwright:v1.54.1-jammy AS production

# Copy only what's needed
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Runtime configuration...
```

**Final image contains**: Only production deps + built app
**Size reduction**: From ~1.2GB to ~800MB

---

## **Build Time Comparison**

### **Before Optimization (Linear Build)**

```
Start ──► Copy All ──► Install Deps ──► Build ──► Done
           (5s)         (2-3 min)      (1-2 min)

Total: 4-6 minutes (every time)
```

### **After Optimization (Cached Build)**

#### **Scenario 1: Only Source Code Changed** (Most Common)

```
Start ──► Use Cached Deps ──► Copy Source ──► Build ──► Done
              (instant)          (5s)       (30-60s)

Total: 1-2 minutes
```

#### **Scenario 2: Dependencies Changed**

```
Start ──► Rebuild Deps ──► Copy Source ──► Build ──► Done
           (2-3 min)         (5s)       (30-60s)

Total: 3-4 minutes (same as before, but rare)
```

#### **Scenario 3: Nothing Changed**

```
Start ──► Use Cached Image ──► Done
              (instant)

Total: ~30 seconds (just push existing image)
```

---

## **Cache Efficiency in CI/CD**

### **GitHub Actions Cache Integration**

```yaml
# In CI/CD pipeline
- name: Build with cache
  run: |
    docker buildx build \
      --cache-from type=registry,ref=gcr.io/$PROJECT/cache:deps \
      --cache-from type=registry,ref=gcr.io/$PROJECT/cache:builder \
      --cache-to type=registry,ref=gcr.io/$PROJECT/cache:deps,mode=max \
      -t gcr.io/$PROJECT/app:$SHA \
      --push .
```

### **Cache Hit Rates**

```
┌─────────────────────────────────────┐
│         Build Frequency             │
├─────────────────────────────────────┤
│ Source changes only:      ~80%      │ ← 1-2 min builds
│ Dependency changes:       ~15%      │ ← 3-4 min builds
│ Dockerfile changes:       ~5%       │ ← 4-5 min builds
└─────────────────────────────────────┘
```

---

## **Best Practices**

### **1. Order Matters**

Place instructions that change less frequently earlier in the Dockerfile:

```dockerfile
# Good: Static files first
COPY package.json yarn.lock ./
RUN yarn install
COPY . .

# Bad: Everything at once
COPY . .
RUN yarn install
```

### **2. Minimize Layer Invalidation**

```dockerfile
# Good: Specific files
COPY package.json yarn.lock .yarnrc.yml ./

# Bad: Wildcards that might include changing files
COPY package* ./
```

### **3. Combine Commands When Appropriate**

```dockerfile
# Good: Single layer for related operations
RUN yarn install --immutable --frozen-lockfile && \
    yarn cache clean --all

# Less optimal: Multiple layers
RUN yarn install --immutable --frozen-lockfile
RUN yarn cache clean --all
```

---

## **Monitoring Build Performance**

### **Docker Build Output**

```bash
=> CACHED [dependencies 2/4] COPY package.json yarn.lock     0.0s
=> CACHED [dependencies 3/4] RUN yarn install --immutable    0.0s
=> [builder 2/2] COPY . .                                    2.1s
=> [builder 3/3] RUN yarn build                             45.2s
```

**CACHED** = Layer reused (instant)
**Time shown** = Layer rebuilt

### **CI/CD Metrics to Track**

- Average build time per deployment
- Cache hit rate (% of CACHED layers)
- Image size over time
- Dependency update frequency

---

## **Troubleshooting**

### **Cache Not Working?**

1. **Check if package files changed**:

   ```bash
   git diff HEAD~1 -- package.json yarn.lock
   ```

2. **Verify cache mount in CI**:

   ```bash
   docker buildx build --cache-from type=registry,ref=...
   ```

3. **Clear cache if corrupted**:
   ```bash
   docker builder prune --all
   ```

### **Build Still Slow?**

1. **Analyze build times**:

   ```bash
   docker build --progress=plain .
   ```

2. **Check for large files**:

   ```bash
   du -sh node_modules/* | sort -h | tail -20
   ```

3. **Consider .dockerignore**:
   ```
   # .dockerignore
   node_modules
   .git
   dist
   *.log
   ```

---

## **Summary**

Our multi-stage Dockerfile optimization provides:

- ✅ **80% faster builds** for typical source-only changes
- ✅ **40% smaller** production images
- ✅ **Predictable performance** with clear cache boundaries
- ✅ **Cost savings** from reduced build minutes in CI/CD

The key is separating dependencies (rare changes) from source code (frequent changes), allowing Docker to cache the expensive dependency installation step.
