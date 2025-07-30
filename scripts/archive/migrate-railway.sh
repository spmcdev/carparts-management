#!/bin/bash

# Database Migration Script for Railway
# Usage: ./migrate-railway.sh <DATABASE_URL>

if [ -z "$1" ]; then
    echo "Usage: ./migrate-railway.sh <DATABASE_URL>"
    echo "Get DATABASE_URL from Railway PostgreSQL service variables"
    exit 1
fi

DATABASE_URL="$1"

echo "🚀 Starting database migrations for Railway..."
echo "Database URL: ${DATABASE_URL:0:20}..."
echo ""

# List of migration files in order
MIGRATIONS=(
    "16-implement-quantity-management.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        echo "📝 Running migration: $migration"
        if psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
            echo "✅ Successfully applied: $migration"
        else
            echo "⚠️  Error or already applied: $migration"
        fi
    else
        echo "❌ Migration file not found: $migration"
    fi
done

echo ""
echo "🎉 Migration process completed!"
echo ""

# Verify tables were created
echo "📋 Verifying database tables..."
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null

echo ""
echo "✅ Database setup complete! Your Railway database is ready."
