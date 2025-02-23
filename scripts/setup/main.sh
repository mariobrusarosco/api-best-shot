#!/bin/sh

# Get the setup mode from argument
PROFILE=$1

if [ -z "$PROFILE" ]; then
    echo "❌ No profile specified"
    echo "   Valid profiles are: initial-setup, update-setup"
    exit 1
fi

case "$PROFILE" in
  "initial-setup")
    MODE="initial"
    ;;
  "update-setup")
    MODE="update"
    ;;
  *)
    echo "❌ Unknown profile: ${PROFILE}"
    echo "   Valid profiles are: initial-setup, update-setup"
    exit 1
    ;;
esac

echo "🚀 Starting setup in ${MODE} mode..."

# Make all scripts executable
chmod +x ./*.sh

case $MODE in
  "initial")
    echo "📥 Running initial setup..."
    
    # Create environment file
    ./create-env.sh
    
    # Validate environment
    ./validate-env.sh
    
    # Setup database
    ./setup-db.sh
    ;;
    
  "update")
    echo "🔄 Running update setup..."
    
    # Backup existing .env
    if [ -f /app/.env ]; then
      cp /app/.env /app/.env.backup
      echo "💾 Backed up existing .env to .env.backup"
    else
      echo "⚠️  No existing .env found, will create new one"
    fi
    
    # Update environment while preserving existing values
    ./create-env.sh --preserve
    
    # Validate environment
    ./validate-env.sh
    ;;
esac

echo "✨ Setup completed in ${MODE} mode!" 