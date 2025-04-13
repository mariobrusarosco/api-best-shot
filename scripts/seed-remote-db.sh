#!/bin/bash

# Script to seed the remote database
# This script uses the demo environment settings to seed the remote database

echo "🚀 Seeding remote database..."

# Set environment to demo to use remote database credentials
export ENV_PATH=.env.demo
export NODE_ENV=demo

# Run the seed script
yarn tsx seed.ts

echo "✅ Remote database seeding complete!" 