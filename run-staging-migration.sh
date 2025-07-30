#!/bin/bash

# Script to run consolidated migration on Railway staging database
# This script connects to the staging database and runs the migration

echo "🚀 Starting consolidated migration on staging database..."
echo "⚠️  This will replace all existing data with the consolidated schema"
echo ""

# Use Railway CLI to get database connection and run migration
echo "📝 Executing SQL migration..."
railway connect Postgres < 00-consolidated-migration.sql

echo ""
echo "✅ Migration completed!"
echo "🧪 You can now test the staging environment"
