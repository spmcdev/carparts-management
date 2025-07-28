#!/bin/bash

# Railway Multi-Environment Setup Script
# This script helps set up staging and production environments

set -e

echo "🚀 Setting up Railway CI/CD environments..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Function to setup environment
setup_environment() {
    local env_name=$1
    local branch=$2
    
    echo "📦 Setting up ${env_name} environment..."
    
    # Create new project (Railway will prompt for project name)
    echo "Creating Railway project for ${env_name}..."
    echo "When prompted, name your project: carparts-${env_name}"
    railway new
    
    # Set environment variables
    echo "Setting environment variables for ${env_name}..."
    railway variables set NODE_ENV=${env_name}
    
    if [ "$env_name" = "staging" ]; then
        railway variables set REACT_APP_API_URL="https://carparts-staging-api.up.railway.app"
        railway variables set FRONTEND_URL="https://carparts-staging.up.railway.app"
    else
        railway variables set REACT_APP_API_URL="https://carparts-api.up.railway.app"
        railway variables set FRONTEND_URL="https://carparts.up.railway.app"
    fi
    
    # Deploy backend
    echo "Deploying backend to ${env_name}..."
    railway up --detach
    
    # Deploy frontend
    echo "Deploying frontend to ${env_name}..."
    cd frontend
    railway up --detach
    cd ..
    
    echo "✅ ${env_name} environment setup complete!"
}

# Setup staging environment
echo "Setting up staging environment..."
setup_environment "staging" "develop"

# Setup production environment
echo "Setting up production environment..."
setup_environment "production" "main"

echo "🎉 Railway CI/CD setup complete!"
echo ""
echo "Next steps:"
echo "1. Create 'develop' branch: git checkout -b develop"
echo "2. Set up branch protection rules in GitHub"
echo "3. Add Railway tokens to GitHub secrets"
echo "4. Test the pipeline by pushing to develop branch"
echo ""
echo "📚 See RAILWAY-CICD-SETUP.md for detailed instructions"
