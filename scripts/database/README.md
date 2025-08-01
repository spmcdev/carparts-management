# Database Scripts Safety Guide

## 🛡️ Database Safety Scripts

This directory contains scripts designed to prevent accidental database operations on production.

## Scripts Overview

### `check-railway-environment.sh`
**Purpose:** Verify which Railway environment you're connected to

**Usage:**
```bash
./scripts/database/check-railway-environment.sh
```

**Features:**
- Shows current Railway project and environment
- Warns when connected to production
- Provides safety checklists
- Lists available projects and switch commands

### `run-production-migration.sh`
**Purpose:** Safely execute database migrations on production with multiple safety checks

**Usage:**
```bash
./scripts/database/run-production-migration.sh <migration-file>
```

**Safety Features:**
- Requires 3 separate confirmations
- Verifies Railway environment is set to production
- Shows migration content preview
- 10-second final countdown
- Logs all migration attempts
- Validates migration file exists

**Example:**
```bash
./scripts/database/run-production-migration.sh 19-add-user-active-status.sql
```

### `run-staging-migration.sh`
**Purpose:** Execute migrations on staging environment (safer for testing)

**Usage:**
```bash
./scripts/database/run-staging-migration.sh <migration-file>
```

## Safety Workflow

### 1. Always Check Environment First
```bash
# Verify which environment you're connected to
./scripts/database/check-railway-environment.sh
```

### 2. Test on Staging First
```bash
# Switch to staging
railway link -p carparts-staging

# Run migration on staging
./scripts/database/run-staging-migration.sh <migration-file>

# Test the application thoroughly
```

### 3. Then Apply to Production (if needed)
```bash
# Switch to production
railway link -p carparts-production

# Verify environment
./scripts/database/check-railway-environment.sh

# Run protected production migration
./scripts/database/run-production-migration.sh <migration-file>
```

## ❌ What NOT to Do

**NEVER run these commands directly on production:**
```bash
# ❌ DON'T DO THIS ON PRODUCTION
railway connect Postgres < database/migrations/some-migration.sql

# ❌ DON'T DO THIS WITHOUT CHECKING ENVIRONMENT
railway connect Postgres
```

## ✅ Safe Alternatives

**Instead, use the protected scripts:**
```bash
# ✅ SAFE: Check environment first
./scripts/database/check-railway-environment.sh

# ✅ SAFE: Use protected migration script
./scripts/database/run-production-migration.sh <migration-file>
```

## Emergency Contact

If you accidentally run a migration on production:
1. Stop the operation immediately (Ctrl+C)
2. Check the database state
3. Contact the team for assistance
4. Consider restoring from backup if needed

## Migration Logs

All production migrations are logged to:
`scripts/database/production-migrations.log`

## Additional Documentation

See `docs/database/DATABASE-SAFETY-GUIDE.md` for comprehensive safety procedures.
