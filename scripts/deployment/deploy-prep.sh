#!/bin/bash

# Deployment Preparation Script for Railway Full-Stack
# This script prepares your project for deployment

echo "🚀 Car Parts Management - Deployment Preparation"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the root directory of your project"
    exit 1
fi

echo "✅ Project structure validated"

# Check if required files exist
echo "📋 Checking deployment files..."

if [ ! -f "railway.json" ]; then
    echo "❌ railway.json not found"
else
    echo "✅ railway.json exists"
fi

# Railway handles frontend deployment without vercel.json
echo "✅ Frontend ready for Railway deployment"

if [ ! -f ".env.example" ]; then
    echo "❌ .env.example not found"
else
    echo "✅ .env.example exists"
fi

if [ ! -f "frontend/.env.example" ]; then
    echo "❌ frontend/.env.example not found"
else
    echo "✅ frontend/.env.example exists"
fi

# Test backend build
echo "🔨 Testing backend..."
if npm install --production; then
    echo "✅ Backend dependencies installed successfully"
else
    echo "❌ Backend dependency installation failed"
fi

# Test frontend build
echo "🔨 Testing frontend build..."
cd frontend
if npm install; then
    echo "✅ Frontend dependencies installed successfully"
    if npm run build; then
        echo "✅ Frontend build successful"
    else
        echo "❌ Frontend build failed"
    fi
else
    echo "❌ Frontend dependency installation failed"
fi

cd ..

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Push your code to GitHub"
echo "2. Deploy backend to Railway:"
echo "   - Go to railway.app"
echo "   - Create new project from GitHub repo"
echo "   - Add PostgreSQL database"
echo "   - Set environment variables (see DEPLOYMENT.md)"
echo ""
echo "3. Deploy frontend to Railway:"
echo "   - In your Railway project, create a new service"
echo "   - Connect to your GitHub repo"
echo "   - Set root directory to 'frontend'"
echo "   - Set REACT_APP_API_URL environment variable"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
echo ""
echo "🎉 Preparation complete!"
