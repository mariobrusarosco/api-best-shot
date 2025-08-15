# Environment Variable Management - FIXED VERSION

## 🚨 **STOP - Read This Before ANY Environment Changes**

**RULE #1: NEVER trust anyone (including Claude) giving you gcloud commands without following this process first.**

## 📋 **The ONLY Safe Process**

### **STEP 1: ALWAYS Check Current State First**

```bash
# See exactly what variables exist now
gcloud run services describe api-best-shot-demo \
  --region=us-central1 \
  --format="table(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"

# Create a backup file
gcloud run services describe api-best-shot-demo \
  --region=us-central1 \
  --format="export" > backup-env-$(date +%Y%m%d-%H%M%S).yaml
```

### **STEP 2: ONE Variable at a Time**

```bash
# Add/Update ONE variable only
gcloud run services update api-best-shot-demo \
  --region=us-central1 \
  --update-env-vars="VARIABLE_NAME=value"

# Check it worked - compare before/after
gcloud run services describe api-best-shot-demo \
  --region=us-central1 \
  --format="table(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"
```

### **STEP 3: Remove Variables Safely**

```bash
# Remove ONE variable only
gcloud run services update api-best-shot-demo \
  --region=us-central1 \
  --remove-env-vars="OLD_VARIABLE_NAME"
```

## ⛔ **NEVER DO THESE COMMANDS**

```bash
# NEVER use --set-env-vars (replaces ALL variables)
gcloud run services update --set-env-vars="..."

# NEVER use multiple variables in one command without checking first
gcloud run services update --update-env-vars="VAR1=a,VAR2=b,VAR3=c"

# NEVER run commands from anyone without backing up first
```

## 🎯 **Required Environment Variables (Reference Only)**

**Use this list to verify what SHOULD exist, not to set them all at once.**

### Demo Environment Should Have:

- NODE_ENV=demo
- PORT=8080
- API_VERSION=/v2
- API_DOMAIN=https://api-best-shot-demo.mariobrusarosco.com/api
- JWT_SECRET=[your-demo-secret]
- MEMBER_PUBLIC_ID_COOKIE=best-shot-auth
- ACCESS_CONTROL_ALLOW_ORIGIN=https://best-shot-demo.mariobrusarosco.com
- INTERNAL_SERVICE_TOKEN=[your-internal-token]
- AWS_ACCESS_KEY_ID=AKIA5FTZC2ASW4UHKD64
- AWS_SECRET_ACCESS_KEY=[your-aws-secret]
- AWS_BUCKET_NAME=assets.mariobrusarosco.com
- AWS_CLOUDFRONT_URL=dk57aekjop3j1.cloudfront.net
- AWS_REGION=us-east-1
- DATA_PROVIDER_COOKIE_PRODUCTION=[your-prod-cookie]
- DATA_PROVIDER_COOKIE_DEMO=[your-demo-cookie]
- SENTRY_DSN=[your-sentry-dsn]
- DB_STRING_CONNECTION=[your-db-connection]

## 🚨 **Emergency Recovery**

### If You Accidentally Deleted Variables:

```bash
# Restore from backup file
kubectl apply -f backup-env-YYYYMMDD-HHMMSS.yaml

# OR manually add back missing variables ONE BY ONE using the list above
```

## 🔧 **Safe Workflow for Changes**

### When Adding New Variables:

1. **Backup current state** (Step 1 above)
2. **Add ONE variable** (Step 2 above)
3. **Verify it worked**
4. **Test the application**
5. **Repeat for next variable**

### When Updating Existing Variables:

1. **Backup current state**
2. **Update ONE variable**
3. **Verify it worked**
4. **Test the application**

### When Removing Old Variables:

1. **Backup current state**
2. **Remove ONE variable** (Step 3 above)
3. **Verify it worked**
4. **Test the application**

## 🎓 **Engineering Best Practices**

### Trust but Verify:

- Always check current state before changes
- Always backup before changes
- Always verify after changes
- Always test the application

### Incremental Changes:

- One variable at a time
- Small, reversible changes
- Clear understanding of what each change does

### Never Trust Bulk Commands:

- No matter who gives them to you
- Even if they look "safe"
- Even if you're in a hurry

---

**Remember: Your deployment is more important than speed. Take the time to do it right.**
