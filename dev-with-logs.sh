#!/bin/bash

# Script to run API dev server with automatic log capture
# Usage: ./dev-with-logs.sh or yarn dev

LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/api-dev.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Add session separator to log
echo "" >> "$LOG_FILE"
echo "=== API DEV SESSION STARTED: $TIMESTAMP ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

echo "🚀 Starting API development server with logging to: $LOG_FILE"
echo "📋 Logs will capture ts-node-dev output, API requests, and errors"
echo "⏹️  Press Ctrl+C to stop the dev server and logging"
echo ""

# Run ts-node-dev (Node.js/Express API) and capture both stdout and stderr
# while also displaying output in terminal
ts-node-dev --respawn --transpile-only -r tsconfig-paths/register ./src/index.ts 2>&1 | tee -a "$LOG_FILE"

# Add session end marker
TIMESTAMP_END=$(date '+%Y-%m-%d %H:%M:%S')
echo "" >> "$LOG_FILE"
echo "=== API DEV SESSION ENDED: $TIMESTAMP_END ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

echo ""
echo "✅ API development server stopped. Logs appended to: $LOG_FILE"