#!/bin/sh
# Database migration script

# Run migrations
npx drizzle-kit generate
npx drizzle-kit migrate 