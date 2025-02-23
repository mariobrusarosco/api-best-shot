#!/bin/sh

# Get the mode from argument
MODE=$1

if [ -z "$MODE" ]; then
    echo "❌ No mode specified"
    echo "   Valid modes are: initial, update"
    exit 1
fi

case "$MODE" in
  "initial"|"update")
    echo "🚀 Starting setup in ${MODE} mode..."
    ;;
  *)
    echo "❌ Unknown mode: ${MODE}"
    echo "   Valid modes are: initial, update"
    exit 1
    ;;
esac

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