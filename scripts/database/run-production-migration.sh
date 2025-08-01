#!/bin/bash

# PROTECTED PRODUCTION MIGRATION SCRIPT
# This script requires multiple confirmations before running on production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${RED}🚨 PRODUCTION DATABASE MIGRATION SCRIPT 🚨${NC}"
echo "=================================================="
echo ""
print_warning "THIS SCRIPT WILL MODIFY THE PRODUCTION DATABASE!"
print_warning "ENSURE YOU HAVE TESTED ON STAGING FIRST!"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "database/migrations" ]; then
    print_error "Must be run from the project root directory"
    exit 1
fi

# Check if migration file exists
if [ -z "$1" ]; then
    print_error "Usage: $0 <migration-file>"
    echo "Example: $0 19-add-user-active-status.sql"
    echo ""
    echo "Available migrations:"
    ls database/migrations/*.sql | grep -v "00-consolidated-migration.sql" | xargs -n 1 basename
    exit 1
fi

MIGRATION_FILE="$1"
MIGRATION_PATH="database/migrations/$MIGRATION_FILE"

if [ ! -f "$MIGRATION_PATH" ]; then
    print_error "Migration file not found: $MIGRATION_PATH"
    exit 1
fi

echo "Migration file: $MIGRATION_FILE"
echo ""

# First confirmation
print_warning "CONFIRMATION 1: Are you sure you want to run this migration on PRODUCTION?"
echo "Type 'YES-PRODUCTION' to continue:"
read -r confirmation1

if [ "$confirmation1" != "YES-PRODUCTION" ]; then
    print_error "Migration cancelled."
    exit 1
fi

# Show migration content
echo ""
print_warning "MIGRATION CONTENT PREVIEW:"
echo "=========================="
cat "$MIGRATION_PATH"
echo "=========================="
echo ""

# Second confirmation
print_warning "CONFIRMATION 2: Have you tested this migration on staging?"
echo "Type 'TESTED-ON-STAGING' to continue:"
read -r confirmation2

if [ "$confirmation2" != "TESTED-ON-STAGING" ]; then
    print_error "Migration cancelled. Please test on staging first."
    exit 1
fi

# Third confirmation with delay
print_warning "CONFIRMATION 3: This is your FINAL CHANCE to cancel."
echo "The migration will run in 10 seconds..."
echo "Press Ctrl+C to cancel, or wait to continue."

for i in {10..1}; do
    echo -n "$i... "
    sleep 1
done
echo ""

# Check Railway environment
print_status "Checking Railway environment..."
RAILWAY_ENV=$(railway status --json 2>/dev/null | jq -r '.environment // "unknown"' 2>/dev/null || echo "unknown")

if [ "$RAILWAY_ENV" != "production" ]; then
    print_error "Railway CLI is not connected to production environment!"
    print_error "Current environment: $RAILWAY_ENV"
    print_error "Please run: railway link -p carparts-production"
    exit 1
fi

print_status "Railway environment confirmed: $RAILWAY_ENV"

# Create backup notification
print_warning "IMPORTANT: Ensure you have a recent database backup!"
print_warning "Railway automatically creates backups, but verify before proceeding."
echo ""

# Final execution
print_status "Executing migration on PRODUCTION database..."
echo "Migration: $MIGRATION_FILE"
echo ""

# Run the migration
if railway connect Postgres < "$MIGRATION_PATH"; then
    print_status "Migration completed successfully!"
    
    # Log the migration
    echo "$(date): Production migration $MIGRATION_FILE completed" >> scripts/database/production-migrations.log
    
    print_status "Migration logged to: scripts/database/production-migrations.log"
    
else
    print_error "Migration failed!"
    echo "$(date): Production migration $MIGRATION_FILE FAILED" >> scripts/database/production-migrations.log
    exit 1
fi

echo ""
print_status "Production migration process complete."
print_warning "Remember to test the production application after migration."
