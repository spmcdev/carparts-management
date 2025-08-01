#!/bin/bash

# Git pre-commit hook to prevent accidental production-related commits
# Place this file in .git/hooks/pre-commit and make it executable

# Check for dangerous patterns in staged files
echo "🔍 Checking for production safety violations..."

# Check for direct database connection patterns
if git diff --cached --name-only | xargs grep -l "railway connect Postgres" 2>/dev/null; then
    echo "❌ BLOCKED: Direct Railway database connection found in staged files"
    echo "Use protected scripts instead:"
    echo "  - ./scripts/database/check-railway-environment.sh"
    echo "  - ./scripts/database/run-production-migration.sh"
    exit 1
fi

# Check for production database URLs or tokens
if git diff --cached | grep -i "postgres://.*railway\|railway.*prod" 2>/dev/null; then
    echo "❌ BLOCKED: Production database credentials detected"
    echo "Remove production credentials from staged files"
    exit 1
fi

# Check for missing migration safety in CI/CD
if git diff --cached .github/workflows/railway-deploy.yml | grep -q "railway.*production" 2>/dev/null; then
    if ! git diff --cached .github/workflows/railway-deploy.yml | grep -q "safety check\|protection\|confirmation" 2>/dev/null; then
        echo "⚠️ WARNING: Production deployment changes detected without safety checks"
        echo "Ensure proper safety measures are in place"
    fi
fi

echo "✅ Pre-commit safety checks passed"
exit 0
