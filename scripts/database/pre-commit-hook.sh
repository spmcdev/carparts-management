#!/bin/bash

# Git pre-commit hook to prevent accidental production-related commits
# Place this file in .git/hooks/pre-commit and make it executable

# Check for dangerous patterns in staged files
echo "🔍 Checking for production safety violations..."

# Check for direct database connection patterns, but exclude safety scripts and documentation
DANGEROUS_FILES=$(git diff --cached --name-only | grep -v -E "(scripts/database/|docs/database/|README\.md)" | xargs grep -l "railway connect Postgres" 2>/dev/null || true)

if [ -n "$DANGEROUS_FILES" ]; then
    echo "❌ BLOCKED: Direct Railway database connection found in staged files:"
    echo "$DANGEROUS_FILES"
    echo "Use protected scripts instead:"
    echo "  - ./scripts/database/check-railway-environment.sh"
    echo "  - ./scripts/database/run-production-migration.sh"
    exit 1
fi

# Check for actual production database URLs (not documentation examples)
DANGEROUS_CREDS=$(git diff --cached --name-only | grep -v -E "(scripts/database/|docs/database/|README\.md)" | xargs grep -l "postgres://.*railway.*prod\|RAILWAY_PRODUCTION_TOKEN" 2>/dev/null || true)

if [ -n "$DANGEROUS_CREDS" ]; then
    echo "❌ BLOCKED: Production database credentials detected in:"
    echo "$DANGEROUS_CREDS"
    echo "Remove production credentials from staged files"
    exit 1
fi

# Check for missing migration safety in CI/CD (only for actual workflow changes)
if git diff --cached --name-only | grep -q ".github/workflows/railway-deploy.yml"; then
    if git diff --cached .github/workflows/railway-deploy.yml | grep -q "railway.*production" 2>/dev/null; then
        if ! git diff --cached .github/workflows/railway-deploy.yml | grep -q "safety check\|protection\|confirmation" 2>/dev/null; then
            echo "⚠️ WARNING: Production deployment changes detected without safety checks"
            echo "Ensure proper safety measures are in place"
        fi
    fi
fi

echo "✅ Pre-commit safety checks passed"
exit 0
