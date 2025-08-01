#!/bin/bash

# Railway Environment Safety Check Script
# This script helps verify which environment you're connected to

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo -e "${BLUE}🔍 Railway Environment Safety Check${NC}"
echo "===================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed!"
    print_info "Install with: npm install -g @railway/cli"
    exit 1
fi

# Get current Railway status
print_status "Checking Railway connection..."

if ! railway status &> /dev/null; then
    print_error "Not connected to any Railway project!"
    print_info "Connect with: railway login && railway link"
    exit 1
fi

# Get environment details
RAILWAY_STATUS=$(railway status --json 2>/dev/null || echo "{}")
PROJECT_NAME=$(echo "$RAILWAY_STATUS" | jq -r '.project.name // "unknown"' 2>/dev/null || echo "unknown")
ENVIRONMENT=$(echo "$RAILWAY_STATUS" | jq -r '.environment // "unknown"' 2>/dev/null || echo "unknown")
SERVICE=$(echo "$RAILWAY_STATUS" | jq -r '.service // "unknown"' 2>/dev/null || echo "unknown")

echo ""
print_info "Current Railway Connection:"
echo "  Project: $PROJECT_NAME"
echo "  Environment: $ENVIRONMENT"
echo "  Service: $SERVICE"
echo ""

# Environment-specific warnings
case "$ENVIRONMENT" in
    "production")
        echo -e "${RED}🚨 DANGER: CONNECTED TO PRODUCTION! 🚨${NC}"
        echo -e "${RED}═══════════════════════════════════════${NC}"
        print_warning "You are connected to the PRODUCTION environment!"
        print_warning "Any database operations will affect LIVE DATA!"
        echo ""
        print_warning "Production Safety Checklist:"
        echo "  - Have you tested on staging first?"
        echo "  - Do you have a recent backup?"
        echo "  - Is this change approved?"
        echo "  - Are users notified of maintenance?"
        echo ""
        ;;
    "staging")
        print_status "Connected to STAGING environment - Safe for testing"
        echo ""
        print_info "Staging Safety Notes:"
        echo "  - This is a safe environment for testing"
        echo "  - Data changes here won't affect production"
        echo "  - Test thoroughly before moving to production"
        echo ""
        ;;
    *)
        print_warning "Unknown environment: $ENVIRONMENT"
        print_warning "Please verify your connection before proceeding"
        echo ""
        ;;
esac

# Show available projects
print_info "Available Railway projects:"
railway list 2>/dev/null || print_warning "Could not list projects"

echo ""
print_info "To switch environments:"
echo "  Staging:    railway link -p carparts-staging"
echo "  Production: railway link -p carparts-production"

echo ""
print_status "Environment check complete."
