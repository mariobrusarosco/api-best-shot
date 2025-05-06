#!/bin/sh

# Default values for development environment
DEFAULT_DB_USER="dev_user"
DEFAULT_DB_PASSWORD="dev_pass"
DEFAULT_DB_NAME="bestshot_dev"
DEFAULT_DB_HOST="postgres"
DEFAULT_DB_PORT="5432"
DEFAULT_PORT="9090"
DEFAULT_NODE_ENV="development"

# Check if .env exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists"
    echo "💡 To reset to defaults, remove .env and run this script again"
    exit 0
fi

# Create .env file with default values
cat > .env << EOF
# Database Configuration
DB_USER=${DEFAULT_DB_USER}         # Database username
DB_PASSWORD=${DEFAULT_DB_PASSWORD}  # Database password
DB_NAME=${DEFAULT_DB_NAME}         # Database name
DB_HOST=${DEFAULT_DB_HOST}         # Database host
DB_PORT=${DEFAULT_DB_PORT}         # Database port

# Application
NODE_ENV=${DEFAULT_NODE_ENV}       # Environment (development, demo, production)
PORT=${DEFAULT_PORT}               # Application port

# The following variables are required but left empty for security
# Please set them according to your environment

# Security (Required)
JWT_SECRET=                        # Secret for JWT signing
MEMBER_PUBLIC_ID_COOKIE=          # Cookie name for member ID
ACCESS_CONTROL_ALLOW_ORIGIN=*     # CORS origin

# AWS Configuration (Required for AWS features)
AWS_ACCESS_KEY_ID=                # AWS access key
AWS_SECRET_ACCESS_KEY=            # AWS secret key
AWS_BUCKET_NAME=                  # S3 bucket name
AWS_CLOUDFRONT_URL=               # AWS CloudFront domain for serving assets

# Monitoring (Required for Sentry)
SENTRY_DSN=                       # Sentry Data Source Name
EOF

echo "✅ Created .env file with default values"
echo "⚠️  Some required variables are empty. Please set them before running the application:"
echo "   - JWT_SECRET"
echo "   - MEMBER_PUBLIC_ID_COOKIE"
echo "   - AWS_* (if using AWS features)"
echo "   - SENTRY_DSN (if using Sentry)" 