#!/bin/sh

# Default values for development environment
DEFAULT_DB_USER="dev_user"
DEFAULT_DB_PASSWORD="dev_pass"
DEFAULT_DB_NAME="bestshot_dev"
DEFAULT_DB_HOST="postgres"
DEFAULT_DB_PORT="5432"
DEFAULT_PORT="9090"
DEFAULT_NODE_ENV="development"

# Check if we should preserve existing values
PRESERVE_MODE=""
if [ "$1" = "--preserve" ]; then
    PRESERVE_MODE="true"
fi

# Function to get existing value or default
get_value() {
    local VAR_NAME=$1
    local DEFAULT_VALUE=$2
    local CURRENT_VALUE=""
    
    if [ -n "$PRESERVE_MODE" ] && [ -f /app/.env ]; then
        CURRENT_VALUE=$(grep "^${VAR_NAME}=" /app/.env | cut -d '=' -f2)
    fi
    
    if [ -n "$CURRENT_VALUE" ]; then
        echo "$CURRENT_VALUE"
    else
        if [ -n "$PRESERVE_MODE" ]; then
            echo "⚠️  Adding new variable: ${VAR_NAME}" >&2
        fi
        echo "$DEFAULT_VALUE"
    fi
}

# Create or update .env file
cat > /app/.env << EOF
# Database Configuration
DB_USER=$(get_value "DB_USER" "${DEFAULT_DB_USER}")         # Database username
DB_PASSWORD=$(get_value "DB_PASSWORD" "${DEFAULT_DB_PASSWORD}")  # Database password
DB_NAME=$(get_value "DB_NAME" "${DEFAULT_DB_NAME}")         # Database name
DB_HOST=$(get_value "DB_HOST" "${DEFAULT_DB_HOST}")         # Database host
DB_PORT=$(get_value "DB_PORT" "${DEFAULT_DB_PORT}")         # Database port

# Application
NODE_ENV=$(get_value "NODE_ENV" "${DEFAULT_NODE_ENV}")       # Environment (development, demo, production)
PORT=$(get_value "PORT" "${DEFAULT_PORT}")               # Application port

# Security (Required)
JWT_SECRET=$(get_value "JWT_SECRET" "")                        # Secret for JWT signing
MEMBER_PUBLIC_ID_COOKIE=$(get_value "MEMBER_PUBLIC_ID_COOKIE" "")          # Cookie name for member ID
ACCESS_CONTROL_ALLOW_ORIGIN=$(get_value "ACCESS_CONTROL_ALLOW_ORIGIN" "*")     # CORS origin

# AWS Configuration (Required for AWS features)
AWS_ACCESS_KEY_ID=$(get_value "AWS_ACCESS_KEY_ID" "")                # AWS access key
AWS_SECRET_ACCESS_KEY=$(get_value "AWS_SECRET_ACCESS_KEY" "")            # AWS secret key
AWS_BUCKET_NAME=$(get_value "AWS_BUCKET_NAME" "")                  # S3 bucket name

# Monitoring (Required for Sentry)
SENTRY_DSN=$(get_value "SENTRY_DSN" "")                       # Sentry Data Source Name

# Sentry Configuration (Required for Sentry)
SENTRY_AUTH_TOKEN=$(get_value "SENTRY_AUTH_TOKEN" "")          # Sentry authentication token
SENTRY_ORG=$(get_value "SENTRY_ORG" "")                        # Sentry organization
SENTRY_PROJECT=$(get_value "SENTRY_PROJECT" "")                # Sentry project

EOF

if [ -n "$PRESERVE_MODE" ]; then
    echo "✅ Updated .env file while preserving existing values"
else
    echo "✅ Created new .env file with default values"
fi

echo "⚠️  Some required variables might be empty. Please verify:"
echo "   - JWT_SECRET"
echo "   - MEMBER_PUBLIC_ID_COOKIE"
echo "   - AWS_* (if using AWS features)"
echo "   - SENTRY_DSN (if using Sentry)"
echo "   - SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT (if using Sentry)" 