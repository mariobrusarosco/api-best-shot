# 🌍 Environment Variables Guide

A comprehensive guide to managing environment variables across different environments in the API Best Shot project.

## 📊 **Environment Variables Overview**

```mermaid
graph TB
    subgraph "Environment Variables Types"
        A[🌐 Public Variables] --> A1[API_VERSION]
        A --> A2[API_DOMAIN]
        A --> A3[NODE_ENV]
        A --> A4[PORT]
        
        B[🔐 Secret Variables] --> B1[JWT_SECRET]
        B --> B2[DB_STRING_CONNECTION]
        B --> B3[AWS_ACCESS_KEY_ID]
        B --> B4[SENTRY_DSN]
    end
    
    style A fill:#e3f2fd
    style B fill:#ffebee
```

## 🔍 **Variable Categories**

### **🌐 Public Variables** (Safe to expose)
| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NODE_ENV` | **Required** | Environment mode | `development`, `demo`, `staging`, `production` |
| `API_VERSION` | **Required** | API version prefix | `/v2` |
| `API_DOMAIN` | **Required** | Domain for API calls | `api-best-shot-staging.run.app` |
| `PORT` | **Optional** | Server port | `8080` (default: `9090`) |
| `AWS_REGION` | **Optional** | AWS region | `us-east-1` |
| `MEMBER_PUBLIC_ID_COOKIE` | **Required** | Cookie name for member IDs | `member_public_id` |
| `ACCESS_CONTROL_ALLOW_ORIGIN` | **Required** | CORS allowed origins | `https://bestshot.com` |
| `AWS_ACCOUNT_ID` | **Required** | AWS account identifier | `415034926128` |
| `AWS_BUCKET_NAME` | **Required** | S3 bucket for assets | `bestshot-assets-staging` |
| `AWS_CLOUDFRONT_URL` | **Required** | CDN URL for assets | `https://bestshot-cdn.cloudfront.net` |

### **🔐 Secret Variables** (Never expose)
| Variable | Type | Description | Storage |
|----------|------|-------------|---------|
| `JWT_SECRET` | **Required** | JWT signing key | Secret Manager |
| `DB_STRING_CONNECTION` | **Required** | Database connection string | Secret Manager |
| `AWS_ACCESS_KEY_ID` | **Required** | AWS access key | Secret Manager |
| `AWS_SECRET_ACCESS_KEY` | **Required** | AWS secret key | Secret Manager |
| `SENTRY_DSN` | **Required** | Sentry error tracking | Secret Manager |
| `INTERNAL_SERVICE_TOKEN` | **Required** | Internal API authentication | Secret Manager |

## 🏗️ **Environment Architecture**

```mermaid
graph LR
    subgraph "Development"
        DEV[💻 Local Dev] --> DOTENV[.env files]
        DOTENV --> DEVAPP[Your App]
    end
    
    subgraph "Staging/Production"
        STAGING[🚀 Cloud Run] --> SM[🔐 Secret Manager]
        SM --> STAGINGAPP[Deployed App]
        
        ENV[📄 Environment Variables] --> STAGINGAPP
    end
    
    subgraph "CI/CD"
        GH[📦 GitHub Actions] --> SM
        GH --> ENV
    end
    
    style SM fill:#c8e6c9
    style DOTENV fill:#fff3e0
```

## 📁 **Local Development Setup**

### **1. Environment Files Structure**
```
├── .env                    # Default (development)
├── .env.demo              # Demo environment  
├── .env.production        # Production environment
├── .env.example           # Template (committed to git)
└── .gitignore            # Excludes .env files
```

### **2. Setting Up Local Environment**

#### **Step 1: Copy the template**
```bash
cp .env.example .env
```

#### **Step 2: Fill in your values**
```bash
# .env file
NODE_ENV=development
PORT=9090
API_VERSION=/v2
API_DOMAIN=localhost:9090
AWS_REGION=us-east-1
MEMBER_PUBLIC_ID_COOKIE=member_public_id
ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:3000
AWS_ACCOUNT_ID=415034926128
AWS_BUCKET_NAME=bestshot-assets-dev
AWS_CLOUDFRONT_URL=https://bestshot-cdn.cloudfront.net

# Secrets (get from team lead)
JWT_SECRET=your-super-secret-jwt-key-here
DB_STRING_CONNECTION=postgresql://user:pass@localhost:5432/dbname
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
INTERNAL_SERVICE_TOKEN=your-internal-service-token
```

#### **Step 3: Verify configuration**
```bash
yarn dev
# Should see: "Server running on port 9090 in development mode"
```

### **3. Environment Loading Flow**

```mermaid
graph TD
    A[App Starts] --> B{ENV_PATH set?}
    B -->|Yes| C[Load from ENV_PATH]
    B -->|No| D[Load from .env]
    
    C --> E[Validate with Zod]
    D --> E
    
    E --> F{Validation Pass?}
    F -->|Yes| G[✅ App Continues]
    F -->|No| H[❌ App Exits]
    
    style G fill:#c8e6c9
    style H fill:#ffcdd2
```

## 🚀 **Staging & Production**

### **Google Secret Manager Integration**

```mermaid
graph TB
    subgraph "Secret Manager"
        SM1[🔐 jwt-secret]
        SM2[🔐 db-connection-staging]
        SM3[🔐 aws-access-key]
        SM4[🔐 sentry-dsn]
    end
    
    subgraph "Cloud Run"
        CR[Container] --> ENV1[JWT_SECRET]
        CR --> ENV2[DB_STRING_CONNECTION]
        CR --> ENV3[AWS_ACCESS_KEY_ID]
        CR --> ENV4[SENTRY_DSN]
    end
    
    SM1 --> ENV1
    SM2 --> ENV2
    SM3 --> ENV3
    SM4 --> ENV4
    
    subgraph "GitHub Actions"
        GH[Workflow] --> PUB[Public Env Vars]
        GH --> SEC[Secret References]
    end
    
    PUB --> CR
    SEC --> SM1
    SEC --> SM2
    
    style SM1 fill:#ffcdd2
    style SM2 fill:#ffcdd2
    style SM3 fill:#ffcdd2
    style SM4 fill:#ffcdd2
```

### **Environment Configuration by Stage**

| Environment | Public Vars Source | Secrets Source | Database |
|-------------|-------------------|----------------|----------|
| **Development** | `.env` file | `.env` file | Local PostgreSQL |
| **Staging** | GitHub Actions | Secret Manager | Cloud SQL |
| **Production** | GitHub Actions | Secret Manager | Cloud SQL |

## 🔧 **Management Commands**

### **Local Development**
```bash
# Start with default .env
yarn dev

# Start with specific env file
ENV_PATH=.env.demo yarn dev

# Check environment validation
yarn compile
```

### **Secret Manager Operations**
```bash
# Create a new secret
echo -n "your-secret-value" | gcloud secrets create my-secret --data-file=-

# Update existing secret
echo -n "new-secret-value" | gcloud secrets versions add my-secret --data-file=-

# View secret (if you have access)
gcloud secrets versions access latest --secret="my-secret"

# List all secrets
gcloud secrets list
```

## 🛡️ **Security Best Practices**

### **✅ DO:**
- Use Secret Manager for all sensitive data
- Keep `.env` files in `.gitignore`
- Use different secrets per environment
- Rotate secrets regularly
- Use least-privilege access

### **❌ DON'T:**
- Commit secrets to git
- Share secrets in Slack/email
- Use the same secret across environments
- Log secret values
- Store secrets in plain text

## 🚨 **Environment Validation**

Your app validates environment variables at startup using **Zod schemas**:

```typescript
// src/config/env.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'demo', 'production']),
  API_DOMAIN: z.string().min(1, 'API domain is required'),
  JWT_SECRET: z.string().min(1, 'JWT secret is required'),
  // ... more validations
});
```

### **Validation Flow**

```
App Startup
     ↓
Load Environment Variables
     ↓
Validate with Zod Schema
     ↓
┌─────────────┬─────────────┐
│ ✅ Valid    │ ❌ Invalid  │
│ Continue    │ Exit(1)     │
└─────────────┴─────────────┘
```

## 🔍 **Troubleshooting**

### **Common Issues:**

#### **"Environment Validation Failed"**
```bash
# Check your .env file has all required variables
cat .env

# Verify against the schema in src/config/env.ts
# Missing: API_DOMAIN, JWT_SECRET are common culprits
```

#### **"Cannot connect to database"**
```bash
# Check DB_STRING_CONNECTION format
# Should be: postgresql://user:pass@host:port/dbname

# For local development:
DB_STRING_CONNECTION=postgresql://bestshot_user:your_password@localhost:5432/bestshot_db
```

#### **"Secret not found" in Cloud Run**
```bash
# Verify secret exists in Secret Manager
gcloud secrets list

# Check service account has secretmanager.secretAccessor role
gcloud projects get-iam-policy PROJECT_ID
```

## 📝 **Quick Reference**

### **Environment Switching**
```bash
# Development (default)
yarn dev

# Demo environment
ENV_PATH=.env.demo yarn dev

# Production environment  
ENV_PATH=.env.production yarn dev
```

### **Required Variables Checklist**

#### **🌐 Public Variables:**
- ✅ `NODE_ENV` - Environment mode (`development`, `demo`, `staging`, `production`)
- ✅ `API_DOMAIN` - Your domain
- ✅ `MEMBER_PUBLIC_ID_COOKIE` - Cookie name for member IDs
- ✅ `ACCESS_CONTROL_ALLOW_ORIGIN` - CORS allowed origins
- ✅ `AWS_ACCOUNT_ID` - AWS account identifier
- ✅ `AWS_BUCKET_NAME` - S3 bucket for assets
- ✅ `AWS_CLOUDFRONT_URL` - CDN URL for assets

#### **🔐 Secret Variables:**
- ✅ `JWT_SECRET` - JWT signing key
- ✅ `DB_STRING_CONNECTION` - Database connection string
- ✅ `AWS_ACCESS_KEY_ID` - AWS access key
- ✅ `AWS_SECRET_ACCESS_KEY` - AWS secret key
- ✅ `SENTRY_DSN` - Sentry error tracking
- ✅ `INTERNAL_SERVICE_TOKEN` - Internal API authentication

### **Optional Variables**
- `PORT` - Server port (default: 9090)
- `API_VERSION` - API prefix (default: /v2)
- `AWS_REGION` - AWS region (default: us-east-1)

---

## 🎯 **Next Steps**

1. **For new developers:** Copy `.env.example` to `.env` and fill in values
2. **For deployment:** Ensure all secrets are in Secret Manager
3. **For troubleshooting:** Check validation logs and compare with this guide

**Questions?** Check the [troubleshooting section](#troubleshooting) or ask the team! 🚀