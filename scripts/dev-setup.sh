#!/bin/bash

echo "🚀 Setting up development environment..."

# Check Volta
if ! command -v volta &> /dev/null; then
    echo "⚙️ Installing Volta..."
    curl https://get.volta.sh | bash
    export VOLTA_HOME="$HOME/.volta"
    export PATH="$VOLTA_HOME/bin:$PATH"
fi

# Verify Volta installation
if ! command -v volta &> /dev/null; then
    echo "❌ Volta installation failed. Please install manually from https://volta.sh"
    exit 1
fi

echo "✅ Volta installed successfully"

# Install dependencies
echo "📦 Installing dependencies..."
volta install node@18.17.1
volta install yarn@1.22.19
yarn install

# Build TypeScript files
echo "🔨 Building TypeScript files..."
yarn tsc

# Setup environment file
echo "📝 Creating environment file..."
sh ./scripts/create-env.sh

# Start infrastructure
echo "🐳 Starting Docker services..."
docker compose up -d postgres

echo "
✨ Development environment ready!

To start developing:
1. Verify .env configuration
2. Start the API:
   yarn dev

Optional services:
- AWS Local Stack:  yarn dev:aws
- Full Environment: yarn dev:full

Happy coding! 🚀
" 