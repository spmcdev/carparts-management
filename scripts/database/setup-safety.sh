#!/bin/bash

# Setup script to install database safety measures

echo "🛡️ Setting up database safety measures..."

# Create git hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
if [ -f ".git/hooks/pre-commit" ]; then
    echo "⚠️ Pre-commit hook already exists. Creating backup..."
    cp .git/hooks/pre-commit .git/hooks/pre-commit.backup
fi

echo "📋 Installing pre-commit hook for database safety..."
cp scripts/database/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully"

# Make all database scripts executable
echo "🔧 Making database scripts executable..."
chmod +x scripts/database/*.sh

echo "📖 Safety measures installed! Please read:"
echo "  - docs/database/DATABASE-SAFETY-GUIDE.md"
echo "  - scripts/database/README.md"

echo ""
echo "🚀 Quick start:"
echo "  1. Check environment: ./scripts/database/check-railway-environment.sh"
echo "  2. For staging: railway link -p carparts-staging"
echo "  3. For production: railway link -p carparts-production (use with extreme caution)"

echo ""
echo "✅ Database safety setup complete!"
