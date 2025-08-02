#!/bin/bash

# Railway Deployment Configuration Checker
# This script helps identify duplicate deployment configurations

echo "🔍 Railway Deployment Configuration Checker"
echo "============================================"
echo ""

echo "📋 Current Railway Status:"
railway status
echo ""

echo "🎯 Recommendations to Fix Duplicate Deployments:"
echo ""
echo "1. 🚫 DISABLE Railway Auto-Deploy (Recommended):"
echo "   - Go to Railway Dashboard → Your Project"
echo "   - For each service (Backend/Frontend):"
echo "   - Settings → Source → GitHub"
echo "   - Disable 'Auto Deploy' or disconnect GitHub"
echo "   - Keep GitHub Actions as the only deployment method"
echo ""

echo "2. 📋 OR Remove GitHub Actions Deployment:"
echo "   - Edit .github/workflows/railway-deploy.yml"
echo "   - Comment out the 'railway up' commands"
echo "   - Keep only the testing and validation steps"
echo ""

echo "3. 🔄 Current Deployment Flow (PROBLEMATIC):"
echo "   Push to GitHub → Railway Auto-Deploy + GitHub Actions → 2 Deployments"
echo ""

echo "4. ✅ Recommended Flow:"
echo "   Push to GitHub → GitHub Actions Only → 1 Deployment"
echo ""

echo "5. 🛠️ To check Railway service settings:"
echo "   railway open  # Opens Railway dashboard in browser"
echo ""

echo "6. 📊 To see recent deployments:"
echo "   railway logs --deployment"
echo ""
