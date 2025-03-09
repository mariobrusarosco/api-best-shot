#!/bin/sh

# Source environment variables
set -a
. /app/.env
set +a

echo "🗄️  Setting up database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
    if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL did not become ready in time"
        exit 1
    fi
    
    echo "⏳ Waiting... ($i/30)"
    sleep 1
done

cd /app

# Generate and run migrations
echo "📝 Generating migrations..."
npx drizzle-kit generate:pg

echo "⬆️  Pushing migrations..."
npx drizzle-kit push:pg

# Run seed script
echo "🌱 Seeding database..."
npx ts-node seed.ts

echo "✨ Database setup completed successfully!" 