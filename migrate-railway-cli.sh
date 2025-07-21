#!/bin/bash

# Railway CLI Migration Script
# Usage: ./migrate-railway-cli.sh

echo "🚀 Running database migrations using Railway CLI..."

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login and link project
echo "Please run 'railway login' first if not already logged in"
echo "Then run 'railway link' to connect to your project"

# List of migration files
MIGRATIONS=(
    "01-init.sql"
    "02-users.sql" 
    "03-update-parts.sql"
    "04-add-parent-id.sql"
    "05-add-recommended-price.sql"
    "06-add-sold-price.sql"
    "07-add-cost-price.sql"
    "08-add-local-purchase.sql"
    "09-create-bills-table.sql"
    "11-create-audit-log.sql"
)

# Run migrations through Railway CLI
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        echo "📝 Running migration: $migration"
        railway run psql \$DATABASE_URL -f "$migration"
    else
        echo "❌ Migration file not found: $migration"
    fi
done

echo "🎉 Migration process completed!"
