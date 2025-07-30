#!/bin/bash

# Railway Staging Database Setup Script
# This script sets up the staging database with all required tables and data

set -e

echo "🗄️ Setting up Railway Staging Database..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "database/setup/setup-database.sql" ]; then
    echo "❌ setup-database.sql not found. Please run this script from the project root."
    exit 1
fi

echo "🔐 Please make sure you're linked to your STAGING project in Railway..."
echo "Current Railway project:"
railway status

echo ""
read -p "Is this your STAGING project? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "❌ Please link to your staging project first:"
    echo "railway link [your-staging-project-name]"
    exit 1
fi

echo ""
echo "📦 Setting up database schema and initial data..."

# Connect to PostgreSQL and run the setup script
railway connect postgres < database/setup/setup-database.sql

echo ""
echo "🚀 Running enhanced reservation system migration..."

# Run the enhanced reservation system if available
if [ -f "database/migrations/archive/18-enhance-reservation-system.sql" ]; then
    railway connect postgres < database/migrations/archive/18-enhance-reservation-system.sql
    echo "✅ Enhanced reservation system installed"
fi

echo ""
echo "🎉 Staging database setup completed!"
echo ""
echo "Database includes:"
echo "  ✅ Parts table with stock management"
echo "  ✅ Users table with role-based access"
echo "  ✅ Bills table for sales tracking"
echo "  ✅ Enhanced reservations system"
echo "  ✅ Audit logging"
echo "  ✅ Default admin user (username: admin, password: admin123)"
echo ""
echo "Next steps:"
echo "  1. Update your staging environment variables in Railway"
echo "  2. Deploy your backend service"
echo "  3. Test the staging environment"
