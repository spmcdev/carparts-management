#!/bin/bash

# Production Database Setup Script
# This script helps set up the production database and environment

set -e

echo "🚀 Setting up Production Database..."
echo "=================================="

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

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if required files exist
if [ ! -f "database/setup/setup-production-database.sql" ]; then
    print_error "Production setup script not found!"
    print_info "Please make sure you're in the project root directory"
    exit 1
fi

print_info "Production database setup script found"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found. Installing..."
    npm install -g @railway/cli
    print_status "Railway CLI installed"
fi

# Ask user for setup type
echo ""
echo "Select your production database setup:"
echo "1. Railway PostgreSQL (Recommended)"
echo "2. Other PostgreSQL provider (Manual setup)"
echo "3. Show setup instructions only"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        print_info "Setting up Railway PostgreSQL..."
        
        # Check if user is logged in
        if ! railway whoami &> /dev/null; then
            print_info "Please log in to Railway"
            railway login
        fi
        
        print_status "Logged in to Railway"
        
        # Instructions for Railway setup
        echo ""
        print_info "Railway Setup Instructions:"
        echo "1. Go to https://railway.app/dashboard"
        echo "2. Create a new project named 'carparts-production'"
        echo "3. Add PostgreSQL service to the project"
        echo "4. Note the PostgreSQL connection details"
        echo "5. Run the setup script in PostgreSQL console"
        echo ""
        
        read -p "Press Enter when Railway project is ready..."
        
        # Show the SQL script location
        echo ""
        print_info "SQL Setup Script Location:"
        echo "File: $(pwd)/database/setup/setup-production-database.sql"
        echo ""
        print_warning "Copy the contents of this file and run it in Railway PostgreSQL console"
        
        # Ask if user wants to see the script
        read -p "Do you want to display the setup script? (y/n): " show_script
        if [[ $show_script =~ ^[Yy]$ ]]; then
            echo ""
            print_info "=== PRODUCTION DATABASE SETUP SCRIPT ==="
            cat database/setup/setup-production-database.sql
            echo ""
            print_info "=== END OF SCRIPT ==="
        fi
        ;;
        
    2)
        echo ""
        print_info "Manual PostgreSQL Setup"
        print_warning "Please ensure you have:"
        echo "• PostgreSQL server running"
        echo "• Database created for production"
        echo "• User with proper permissions"
        echo ""
        
        read -p "Enter PostgreSQL connection URL: " DATABASE_URL
        
        if [ -z "$DATABASE_URL" ]; then
            print_error "Database URL is required"
            exit 1
        fi
        
        print_info "Testing database connection..."
        
        # Test connection (requires psql)
        if command -v psql &> /dev/null; then
            if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
                print_status "Database connection successful"
                
                read -p "Do you want to run the setup script now? (y/n): " run_script
                if [[ $run_script =~ ^[Yy]$ ]]; then
                    print_info "Running production database setup..."
                    psql "$DATABASE_URL" -f database/setup/setup-production-database.sql
                    print_status "Database setup completed"
                fi
            else
                print_error "Database connection failed"
                print_info "Please check your connection URL and try again"
            fi
        else
            print_warning "psql not found. Please run the setup script manually:"
            print_info "psql \"$DATABASE_URL\" -f database/setup/setup-production-database.sql"
        fi
        ;;
        
    3)
        echo ""
        print_info "Setup Instructions:"
        echo ""
        echo "📖 See the complete guide:"
        echo "   docs/database/PRODUCTION-DATABASE-SETUP.md"
        echo ""
        echo "📄 Setup script location:"
        echo "   database/setup/setup-production-database.sql"
        echo ""
        print_warning "Remember to:"
        echo "• Change the default admin password"
        echo "• Set a strong JWT secret"
        echo "• Configure environment variables"
        echo "• Enable database backups"
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_info "Next Steps:"
echo "1. 🔐 Change default admin password (admin123)"
echo "2. 🛡️ Set production JWT secret"
echo "3. 🌍 Configure environment variables"
echo "4. 🚀 Deploy application to production"
echo "5. ✅ Test all functionality"
echo ""

print_status "Production database setup guide completed!"
print_info "For detailed instructions, see: docs/database/PRODUCTION-DATABASE-SETUP.md"
