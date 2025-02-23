#!/bin/sh

# Get the setup mode (initial or update)
SETUP_MODE=${1:-initial}

echo "🚀 Starting setup in ${SETUP_MODE} mode..."

# Make all scripts executable
chmod +x ./*.sh

case $SETUP_MODE in
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
    if [ -f ../.env ]; then
      cp ../.env ../.env.backup
      echo "💾 Backed up existing .env to .env.backup"
    fi
    
    # Update environment while preserving existing values
    ./create-env.sh --preserve
    
    # Validate environment
    ./validate-env.sh
    ;;
    
  *)
    echo "❌ Unknown setup mode: ${SETUP_MODE}"
    echo "   Valid modes are: initial, update"
    exit 1
    ;;
esac

echo "✨ Setup completed successfully!" 