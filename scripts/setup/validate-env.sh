#!/bin/sh

# Check if .env exists
if [ ! -f /app/.env ]; then
    echo "❌ No .env file found"
    exit 1
fi

# Required variables to check
REQUIRED_VARS="DB_USER DB_PASSWORD DB_NAME DB_HOST DB_PORT NODE_ENV PORT"

# Optional but recommended variables
RECOMMENDED_VARS="JWT_SECRET MEMBER_PUBLIC_ID_COOKIE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_BUCKET_NAME SENTRY_DSN"

# Function to check if variable is set and not empty
check_var() {
    local VAR_NAME=$1
    local REQUIRED=$2
    local VALUE=""
    
    VALUE=$(grep "^${VAR_NAME}=" /app/.env | cut -d '=' -f2)
    
    if [ -z "$VALUE" ]; then
        if [ "$REQUIRED" = "true" ]; then
            echo "❌ Required variable ${VAR_NAME} is not set"
            return 1
        else
            echo "⚠️  Recommended variable ${VAR_NAME} is not set"
            return 0
        fi
    fi
    return 0
}

# Check required variables
ERRORS=0
echo "🔍 Checking required variables..."
for VAR in $REQUIRED_VARS; do
    if ! check_var "$VAR" "true"; then
        ERRORS=$((ERRORS + 1))
    fi
done

# Check recommended variables
echo "\n🔍 Checking recommended variables..."
for VAR in $RECOMMENDED_VARS; do
    check_var "$VAR" "false"
done

# Exit with error if any required variables are missing
if [ $ERRORS -gt 0 ]; then
    echo "❌ Environment validation failed with ${ERRORS} error(s)"
    exit 1
else
    echo "✅ Environment validation passed"
fi 