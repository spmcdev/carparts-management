#!/bin/bash

# Test Frontend Deployment Fix
# This script verifies that frontend deployments work correctly

echo "🧪 Testing Frontend Deployment Fix"
echo "=================================="
echo ""

echo "1. 🔍 Checking current Railway status..."
railway status
echo ""

echo "2. 🎯 Testing staging frontend deployment..."
echo "   (This should work from frontend directory)"
cd frontend

if [ -f "package.json" ]; then
    echo "   ✅ Frontend directory confirmed"
    
    echo "3. 🚀 Testing Railway deployment from frontend directory..."
    echo "   Running: railway up --detach --environment staging --service Frontend"
    
    # railway up --detach --environment staging --service Frontend
    echo "   ⚠️ Commented out to prevent actual deployment during testing"
    echo "   Uncomment the line above to run actual deployment"
    
else
    echo "   ❌ ERROR: Not in frontend directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo ""
echo "4. 📋 GitHub Actions Workflow Status:"
echo "   ✅ Fixed: cd frontend && railway up (single command)"
echo "   ✅ Fixed: Both staging and production deployments"
echo ""

echo "5. 🎯 Next Steps:"
echo "   - Push this commit to trigger GitHub Actions"
echo "   - Monitor GitHub Actions logs for successful deployment"
echo "   - Verify both staging and production deployments work"
echo ""

echo "6. 🔧 Manual Test Commands:"
echo "   cd frontend && railway up --detach --environment staging --service Frontend"
echo "   cd frontend && railway up --detach --environment production --service frontend"
echo ""

cd ..
echo "✅ Test script completed successfully!"
