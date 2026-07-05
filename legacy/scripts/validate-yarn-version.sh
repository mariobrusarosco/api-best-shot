#!/bin/bash

# Validate Yarn version consistency
EXPECTED_VERSION="3.8.7"
CURRENT_VERSION=$(yarn --version)

if [ "$CURRENT_VERSION" != "$EXPECTED_VERSION" ]; then
    echo "❌ Yarn version mismatch!"
    echo "   Expected: $EXPECTED_VERSION"
    echo "   Current:  $CURRENT_VERSION"
    echo ""
    echo "To fix this, run:"
    echo "  corepack enable"
    echo "  corepack prepare yarn@$EXPECTED_VERSION --activate"
    exit 1
fi

echo "✅ Yarn version OK: $CURRENT_VERSION"

# Check if .yarnrc.yml exists
if [ ! -f ".yarnrc.yml" ]; then
    echo "❌ Missing .yarnrc.yml configuration file!"
    exit 1
fi

# Check if yarn release exists
if [ ! -f ".yarn/releases/yarn-$EXPECTED_VERSION.cjs" ]; then
    echo "❌ Missing Yarn release file!"
    echo "Run: yarn set version $EXPECTED_VERSION"
    exit 1
fi

# Check packageManager field in package.json
PACKAGE_MANAGER=$(node -p "require('./package.json').packageManager || ''")
if [ "$PACKAGE_MANAGER" != "yarn@$EXPECTED_VERSION" ]; then
    echo "❌ packageManager field in package.json is incorrect!"
    echo "   Expected: yarn@$EXPECTED_VERSION"
    echo "   Current:  $PACKAGE_MANAGER"
    exit 1
fi

echo "✅ All Yarn configuration checks passed!"